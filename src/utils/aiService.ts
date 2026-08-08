import { Expense, Goal } from '../types';
import { CATEGORIES } from '../constants/categories';
import { parseTransactionText } from './parser';

export interface AIResponseData {
  intent: 'create_expense' | 'financial_query' | 'general_chat' | 'unknown';
  amount?: number;
  currency?: string;
  category?: string;
  categoryName?: string;
  date?: string;
  note?: string;
  confidence?: number;
  explanation?: string;
  reply?: string;
  isFallback?: boolean;
  isLowConfidence?: boolean;
  needsConfirmation?: boolean;
}

export interface AssistantContext {
  currentDate: string;
  expenses: Expense[];
  goals: Goal[];
  categoryLimits: Record<string, number>;
  income: number;
}

// Client-side helper for financial query calculation if fallback is needed
export function computeFinancialQueryResponse(query: string, context: AssistantContext): string {
  const lower = query.toLowerCase();
  const { expenses, goals, categoryLimits, income } = context;

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthExpenses = expenses.filter(e => e.date && e.date.startsWith(currentMonthStr));
  const prevMonthExpenses = expenses.filter(e => e.date && e.date.startsWith(prevMonthStr));

  const totalCurrent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPrev = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 1. "tháng này tôi tiêu bao nhiêu" / "tổng chi tiêu tháng này"
  if (lower.includes('tháng này') && (lower.includes('bao nhiêu') || lower.includes('tổng'))) {
    return `📊 **Thống kê chi tiêu tháng ${today.getMonth() + 1}/${today.getFullYear()}:**\n\n• Tổng chi tiêu hiện tại: **${totalCurrent.toLocaleString('vi-VN')}₫** (${currentMonthExpenses.length} giao dịch).\n• Số dư còn lại so với thu nhập (${income.toLocaleString('vi-VN')}₫): **${Math.max(0, income - totalCurrent).toLocaleString('vi-VN')}₫**.`;
  }

  // 2. "tiêu nhiều nhất vào đâu" / "danh mục nào tiêu nhiều nhất"
  if (lower.includes('nhiều nhất') || lower.includes('cao nhất')) {
    const catTotals: Record<string, number> = {};
    currentMonthExpenses.forEach(e => {
      catTotals[e.categoryId] = (catTotals[e.categoryId] || 0) + e.amount;
    });

    let topCatId = 'khac';
    let maxAmt = 0;
    Object.entries(catTotals).forEach(([catId, amt]) => {
      if (amt > maxAmt) {
        maxAmt = amt;
        topCatId = catId;
      }
    });

    const topCatObj = CATEGORIES.find(c => c.id === topCatId) || CATEGORIES[CATEGORIES.length - 1];
    const pct = totalCurrent > 0 ? ((maxAmt / totalCurrent) * 100).toFixed(1) : '0';

    return `🏆 **Danh mục chiếm chi tiêu lớn nhất tháng này:**\n\n• **${topCatObj.name}**: **${maxAmt.toLocaleString('vi-VN')}₫** (chiếm **${pct}%** tổng chi tiêu tháng này).`;
  }

  // 3. "vượt ngân sách" / "hạn mức"
  if (lower.includes('ngân sách') || lower.includes('hạn mức')) {
    const overList: string[] = [];
    Object.entries(categoryLimits).forEach(([catId, limit]) => {
      if (limit > 0) {
        const spent = currentMonthExpenses.filter(e => e.categoryId === catId).reduce((s, e) => s + e.amount, 0);
        if (spent > limit) {
          const cat = CATEGORIES.find(c => c.id === catId);
          overList.push(`• **${cat?.name || catId}**: đã tiêu ${spent.toLocaleString('vi-VN')}₫ / hạn mức ${limit.toLocaleString('vi-VN')}₫ (vượt ${(spent - limit).toLocaleString('vi-VN')}₫)`);
        }
      }
    });

    if (overList.length > 0) {
      return `🚨 **Cảnh báo vượt ngân sách tháng này (${overList.length} danh mục):**\n\n${overList.join('\n')}\n\nHãy điều chỉnh chi tiêu các danh mục này để đảm bảo kế hoạch tài chính nhé!`;
    } else {
      return `✅ **Tuyệt vời!** Tất cả các danh mục chi tiêu của bạn trong tháng này đều đang nằm trong hạn mức cho phép.`;
    }
  }

  // 4. "mục tiêu mua laptop" / "bao lâu nữa đạt mục tiêu"
  if (lower.includes('mục tiêu') || lower.includes('laptop') || lower.includes('bao lâu')) {
    if (goals.length === 0) {
      return `🎯 Bạn chưa thiết lập mục tiêu tài chính nào. Hãy qua tab **"Mục tiêu"** để tạo mục tiêu tiết kiệm mới nhé!`;
    }

    const laptopGoal = goals.find(g => g.name.toLowerCase().includes('laptop')) || goals[0];
    const remaining = Math.max(0, laptopGoal.target - laptopGoal.current);
    const monthlySavings = Math.max(1000000, income - totalCurrent); // Estimate saving
    const monthsNeeded = monthlySavings > 0 ? Math.ceil(remaining / monthlySavings) : 99;

    return `🎯 **Tiến độ mục tiêu "${laptopGoal.name}":**\n\n• Đã tích lũy: **${laptopGoal.current.toLocaleString('vi-VN')}₫** / **${laptopGoal.target.toLocaleString('vi-VN')}₫** (${((laptopGoal.current / laptopGoal.target) * 100).toFixed(0)}%).\n• Cần thêm: **${remaining.toLocaleString('vi-VN')}₫**.\n• Ước tính với tốc độ tích lũy hiện tại (~${monthlySavings.toLocaleString('vi-VN')}₫/tháng), bạn sẽ hoàn thành sau khoảng **${monthsNeeded} tháng** nữa!`;
  }

  // 5. "Top 3 khoản chi"
  if (lower.includes('top 3') || lower.includes('3 khoản chi')) {
    const sorted = [...currentMonthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
    if (sorted.length === 0) {
      return `📝 Tháng này bạn chưa có giao dịch chi tiêu nào.`;
    }

    const items = sorted.map((e, idx) => {
      const cat = CATEGORIES.find(c => c.id === e.categoryId)?.name || 'Khác';
      return `${idx + 1}. **${cat}** — **${e.amount.toLocaleString('vi-VN')}₫** (${e.note} - ${e.date})`;
    });

    return `🔝 **Top ${sorted.length} khoản chi lớn nhất tháng này:**\n\n${items.join('\n')}`;
  }

  // 6. "tiêu nhiều hơn tháng trước"
  if (lower.includes('tháng trước') || lower.includes('so với tháng')) {
    const diff = totalCurrent - totalPrev;
    if (diff > 0) {
      return `📈 **So sánh với tháng trước:**\n\n• Tháng này: **${totalCurrent.toLocaleString('vi-VN')}₫**\n• Tháng trước: **${totalPrev.toLocaleString('vi-VN')}₫**\n➔ Bạn đang tiêu **nhiều hơn ${diff.toLocaleString('vi-VN')}₫** so với cùng kỳ tháng trước.`;
    } else if (diff < 0) {
      return `📉 **So sánh với tháng trước:**\n\n• Tháng này: **${totalCurrent.toLocaleString('vi-VN')}₫**\n• Tháng trước: **${totalPrev.toLocaleString('vi-VN')}₫**\n➔ Bạn đã **tiết kiệm được ${Math.abs(diff).toLocaleString('vi-VN')}₫** so với tháng trước.`;
    } else {
      return `⚖️ Tổng chi tiêu tháng này hiện tại đang tương đương tháng trước (${totalCurrent.toLocaleString('vi-VN')}₫).`;
    }
  }

  // Default query overview
  return `💡 **Tổng quan tài chính tháng ${today.getMonth() + 1}/${today.getFullYear()}:**\n\n• Tổng chi tiêu: **${totalCurrent.toLocaleString('vi-VN')}₫**\n• Số giao dịch: **${currentMonthExpenses.length}**\n• Số dư dự kiến: **${Math.max(0, income - totalCurrent).toLocaleString('vi-VN')}₫**.\n\nBạn có thể hỏi thêm các câu như: "Top 3 khoản chi tháng này?", "Danh mục nào vượt hạn mức?", "Bao lâu nữa đạt mục tiêu?".`;
}

// Main AI Assistant request runner
export async function sendToAIAssistant(
  message: string,
  context: AssistantContext
): Promise<AIResponseData> {
  const trimmedMessage = message.trim();

  // Try Server-side Gemini AI call first
  try {
    const response = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: trimmedMessage,
        context,
      }),
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success && result.data) {
        const aiData = result.data as AIResponseData;

        // VALIDATION STEP (Requirement 3: Never trust raw LLM output)
        const validatedIntent = ['create_expense', 'financial_query', 'general_chat'].includes(
          aiData.intent
        )
          ? aiData.intent
          : 'create_expense';

        if (validatedIntent === 'create_expense') {
          const rawAmount = Number(aiData.amount);
          const validatedAmount = !isNaN(rawAmount) && rawAmount > 0 ? rawAmount : 0;

          // Check category validity
          const catObj = CATEGORIES.find(c => c.id === aiData.category);
          const validatedCategory = catObj ? catObj.id : 'khac';
          const validatedCategoryName = catObj ? catObj.name : 'Khác';

          // Check date validity (YYYY-MM-DD)
          let validatedDate = context.currentDate;
          if (aiData.date && /^\d{4}-\d{2}-\d{2}$/.test(aiData.date)) {
            validatedDate = aiData.date;
          }

          // Check note
          const validatedNote = aiData.note?.trim() || validatedCategoryName;

          // Check confidence
          const confidence = typeof aiData.confidence === 'number' ? aiData.confidence : 0.85;
          const isLowConfidence = confidence < 0.70 || validatedAmount <= 0;

          if (validatedAmount > 0) {
            return {
              intent: 'create_expense',
              amount: validatedAmount,
              currency: 'VND',
              category: validatedCategory,
              categoryName: validatedCategoryName,
              date: validatedDate,
              note: validatedNote,
              confidence,
              explanation:
                aiData.explanation ||
                `Đã nhận diện: ${validatedCategoryName} ${validatedAmount.toLocaleString('vi-VN')}₫`,
              isFallback: false,
              isLowConfidence,
              needsConfirmation: true, // Always prompt preview card for transaction confirmation
            };
          }
        } else if (validatedIntent === 'financial_query') {
          return {
            intent: 'financial_query',
            reply: aiData.reply || computeFinancialQueryResponse(trimmedMessage, context),
            confidence: aiData.confidence || 0.95,
            isFallback: false,
          };
        } else if (validatedIntent === 'general_chat') {
          return {
            intent: 'general_chat',
            reply: aiData.reply || 'Xin chào! Mình có thể giúp gì cho tài chính cá nhân của bạn hôm nay?',
            confidence: aiData.confidence || 0.90,
            isFallback: false,
          };
        }
      }
    }
  } catch (err) {
    console.warn('AI Assistant API call failed, switching to rule-based fallback:', err);
  }

  // FALLBACK ARCHITECTURE: Rule-based parser + Client-side query handler
  // 1. Check if user input matches financial query patterns
  const lowerMsg = trimmedMessage.toLowerCase();
  const isQueryPattern =
    lowerMsg.includes('bao nhiêu') ||
    lowerMsg.includes('top 3') ||
    lowerMsg.includes('tiêu nhiều') ||
    lowerMsg.includes('vượt ngân sách') ||
    lowerMsg.includes('mục tiêu') ||
    lowerMsg.includes('tiết kiệm') ||
    lowerMsg.includes('tháng trước') ||
    lowerMsg.includes('ở đâu');

  if (isQueryPattern) {
    const computedReply = computeFinancialQueryResponse(trimmedMessage, context);
    return {
      intent: 'financial_query',
      reply: computedReply,
      confidence: 0.80,
      isFallback: true,
    };
  }

  // 2. Otherwise run rule-based parser
  const parsed = parseTransactionText(trimmedMessage);

  if (parsed.success && parsed.amount > 0) {
    return {
      intent: 'create_expense',
      amount: parsed.amount,
      currency: 'VND',
      category: parsed.categoryId,
      categoryName: parsed.categoryName,
      date: parsed.date,
      note: parsed.note,
      confidence: 0.75,
      explanation: parsed.message,
      isFallback: true,
      isLowConfidence: false,
      needsConfirmation: true,
    };
  }

  return {
    intent: 'general_chat',
    reply: `❓ Mình chưa nhận diện được số tiền hoặc truy vấn hợp lệ từ câu nói của bạn.\n\n• Để ghi chi tiêu, ví dụ: "ăn sáng 35k", "đi Grab 85k hôm qua".\n• Để hỏi phân tích tài chính, ví dụ: "Tháng này tôi tiêu bao nhiêu?", "Top 3 khoản chi tháng này?".`,
    confidence: 0.50,
    isFallback: true,
  };
}

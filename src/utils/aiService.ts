import { Expense, Goal } from '../types';
import { CATEGORIES } from '../constants/categories';
import { parseTransactionText, parseMultipleTransactions } from './parser';
import { getBusinessDate, formatVietnameseDisplayDate, DateConfidenceType } from './dateParser';
import { apiClient } from '../lib/apiClient';

export type FinancialIntent =
  | 'CREATE_EXPENSE'
  | 'UPDATE_EXPENSE'
  | 'DELETE_EXPENSE'
  | 'QUERY_FINANCE'
  | 'ANALYZE_SPENDING'
  | 'BUDGET_ADVICE'
  | 'GOAL_FORECAST'
  | 'CASHFLOW_FORECAST'
  | 'GENERAL_CHAT';

export interface StructuredExpense {
  id?: string;
  amount: number;
  currency?: string;
  category: string;
  categoryName: string;
  date: string; // YYYY-MM-DD
  dateExpression?: string;
  dateType?: DateConfidenceType;
  note: string;
  originalExpense?: {
    id: string;
    amount: number;
    category: string;
    categoryName: string;
    date: string;
    note: string;
  };
}

export interface StructuredAction {
  type: 'CREATE_EXPENSE' | 'UPDATE_EXPENSE' | 'DELETE_EXPENSE' | 'NONE';
  expense?: StructuredExpense;
  targetExpenseId?: string;
  targetSummary?: string;
  confidence: number;
  explanation?: string;
  requiresConfirmation: boolean;
}

export interface FinancialSummary {
  currentStatus?: string;
  riskOrInsight?: string;
  recommendedAction?: string;
}

export interface AIResponseData {
  intent: FinancialIntent;
  actions?: StructuredAction[];
  action?: StructuredAction;
  financialSummary?: FinancialSummary;
  reply: string;
  confidence: number;
  isFallback?: boolean;
  isLowConfidence?: boolean;
  quota?: {
    usedToday: number;
    limitToday: number;
    remainingToday: number;
    resetAt: string;
  };
  aggregatedFactsSnippet?: any;
}

export interface AssistantContext {
  currentDate: string;
  expenses: Expense[];
  goals: Goal[];
  categoryLimits: Record<string, number>;
  income: number;
  recurringExpenses?: any[];
}

/**
 * Fetch AI Quota from backend for the logged-in user
 */
export async function fetchAiQuota(): Promise<{
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
} | null> {
  try {
    const res = await apiClient.get('/api/v1/ai/quota');
    if (res.data && res.data.success && res.data.data) {
      return res.data.data;
    }
  } catch (error) {
    // Graceful catch for guest/unauthorized
  }
  return null;
}

/**
 * Deterministic client-side financial query calculator (fallback)
 */
export function computeFinancialQueryResponse(query: string, context: AssistantContext): string {
  const lower = query.toLowerCase();
  const { expenses, goals, categoryLimits, income } = context;

  const bizCurrentDate = getBusinessDate(context.currentDate);
  const [currentYear, currentMonthNum] = bizCurrentDate.split('-').map(Number);
  const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
  const prevYearNum = currentMonthNum === 1 ? currentYear - 1 : currentYear;
  const prevMonthStr = `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}`;

  const currentMonthExpenses = expenses.filter((e) => e.date && e.date.startsWith(currentMonthStr));

  const totalCurrent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const daysInMonth = new Date(Date.UTC(currentYear, currentMonthNum, 0)).getUTCDate();
  const currentDay = parseInt(bizCurrentDate.split('-')[2], 10);
  const daysRemaining = Math.max(0, daysInMonth - currentDay);
  const dailyBurnRate = Math.round(totalCurrent / Math.max(1, currentDay));
  const projectedEndMonth = totalCurrent + dailyBurnRate * daysRemaining;

  // 1. "tháng này tôi tiêu bao nhiêu" / "tổng chi tiêu tháng này"
  if (lower.includes('tháng này') && (lower.includes('bao nhiêu') || lower.includes('tổng'))) {
    return `📊 **Thống kê chi tiêu tháng ${currentMonthNum}/${currentYear}:**\n\n• Tổng chi tiêu hiện tại: **${totalCurrent.toLocaleString('vi-VN')}₫** (${currentMonthExpenses.length} giao dịch).\n• Tích lũy còn lại: **${Math.max(0, income - totalCurrent).toLocaleString('vi-VN')}₫**.\n• Tốc độ chi: **~${dailyBurnRate.toLocaleString('vi-VN')}₫/ngày**.\n\n💡 **Khuyến nghị Copilot**: Trong ${daysRemaining} ngày tới, hạn mức chi tiêu trung bình an toàn là **${Math.round(Math.max(0, income - totalCurrent) / Math.max(1, daysRemaining)).toLocaleString('vi-VN')}₫/ngày**.`;
  }

  // 2. "tiêu nhiều nhất vào đâu" / "danh mục nào tiêu nhiều nhất"
  if (lower.includes('nhiều nhất') || lower.includes('cao nhất') || lower.includes('ở đâu')) {
    const catTotals: Record<string, number> = {};
    currentMonthExpenses.forEach((e) => {
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

    const topCatObj = CATEGORIES.find((c) => c.id === topCatId) || CATEGORIES[CATEGORIES.length - 1];
    const pct = totalCurrent > 0 ? ((maxAmt / totalCurrent) * 100).toFixed(1) : '0';

    return `🏆 **Danh mục chiếm chi tiêu lớn nhất tháng này:**\n\n• **${topCatObj.name}**: **${maxAmt.toLocaleString('vi-VN')}₫** (chiếm **${pct}%** tổng chi tiêu tháng này).\n\n💡 **Khuyến nghị Copilot**: Kiểm tra các giao dịch trong danh mục ${topCatObj.name} để tìm các khoản chi có thể tối ưu hóa.`;
  }

  // 3. "vượt ngân sách" / "hạn mức"
  if (lower.includes('ngân sách') || lower.includes('hạn mức') || lower.includes('vượt')) {
    const overList: string[] = [];
    Object.entries(categoryLimits).forEach(([catId, limit]) => {
      if (limit > 0) {
        const spent = currentMonthExpenses.filter((e) => e.categoryId === catId).reduce((s, e) => s + e.amount, 0);
        if (spent > limit) {
          const cat = CATEGORIES.find((c) => c.id === catId);
          overList.push(`• **${cat?.name || catId}**: đã tiêu **${spent.toLocaleString('vi-VN')}₫** / hạn mức **${limit.toLocaleString('vi-VN')}₫** (vượt **${(spent - limit).toLocaleString('vi-VN')}₫**)`);
        }
      }
    });

    if (overList.length > 0) {
      return `🚨 **Cảnh báo vượt ngân sách tháng này (${overList.length} danh mục):**\n\n${overList.join('\n')}\n\n💡 **"Vậy tôi nên làm gì?":**\nNgừng các chi tiêu phát sinh trong các danh mục trên, hoặc điều chuyển bớt ngân sách từ các danh mục còn dư.`;
    } else {
      return `✅ **Tuyệt vời!** Tất cả các danh mục chi tiêu của bạn trong tháng này đều đang nằm trong hạn mức an toàn cho phép.`;
    }
  }

  // 4. "mục tiêu" / "bao lâu nữa"
  if (lower.includes('mục tiêu') || lower.includes('laptop') || lower.includes('bao lâu')) {
    if (goals.length === 0) {
      return `🎯 Bạn chưa thiết lập mục tiêu tài chính nào. Hãy qua tab **"Mục tiêu"** để tạo mục tiêu tiết kiệm mới nhé!`;
    }

    const firstGoal = goals[0];
    const remaining = Math.max(0, firstGoal.target - firstGoal.current);
    const monthlySavings = Math.max(1000000, income - totalCurrent);
    const monthsNeeded = monthlySavings > 0 ? (remaining / monthlySavings).toFixed(1) : 'Không xác định';

    return `🎯 **Tiến độ mục tiêu "${firstGoal.name}":**\n\n• Đã tích lũy: **${firstGoal.current.toLocaleString('vi-VN')}₫** / **${firstGoal.target.toLocaleString('vi-VN')}₫** (${((firstGoal.current / firstGoal.target) * 100).toFixed(0)}%).\n• Cần thêm: **${remaining.toLocaleString('vi-VN')}₫**.\n• Ước tính với tốc độ tích lũy hiện tại (~${monthlySavings.toLocaleString('vi-VN')}₫/tháng), bạn sẽ hoàn thành sau khoảng **${monthsNeeded} tháng** nữa!`;
  }

  // 5. "dự báo dòng tiền"
  if (lower.includes('dự báo') || lower.includes('dòng tiền') || lower.includes('cuối tháng')) {
    const projectedSavings = Math.max(0, income - projectedEndMonth);
    return `📊 **Dự báo dòng tiền tháng ${currentMonthNum}/${currentYear}:**\n\n• **Tốc độ đốt tiền (Burn Rate)**: ~**${dailyBurnRate.toLocaleString('vi-VN')}₫/ngày**.\n• **Dự kiến tổng chi hết tháng**: **${projectedEndMonth.toLocaleString('vi-VN')}₫**.\n• **Dự kiến tích lũy cuối tháng**: **${projectedSavings.toLocaleString('vi-VN')}₫**.\n\n💡 **Khuyến nghị Copilot**: Giữ mức chi tiêu hằng ngày dưới **${Math.round(Math.max(0, income - totalCurrent) / Math.max(1, daysRemaining)).toLocaleString('vi-VN')}₫/ngày** để bảo toàn số dư.`;
  }

  // Default query overview
  return `💡 **Tổng quan tài chính tháng ${currentMonthNum}/${currentYear}:**\n\n• Tổng chi tiêu: **${totalCurrent.toLocaleString('vi-VN')}₫**\n• Số giao dịch: **${currentMonthExpenses.length}**\n• Số dư dự kiến: **${Math.max(0, income - totalCurrent).toLocaleString('vi-VN')}₫**.\n\nBạn có thể hỏi: *"Dự báo dòng tiền cuối tháng"*, *"Tôi có vượt ngân sách không?"*, *"Tôi tiêu nhiều nhất vào đâu?"*.`;
}

/**
 * Main AI Financial Copilot requester
 */
export async function sendToAIAssistant(
  message: string,
  context: AssistantContext,
  isAuthenticated: boolean = false
): Promise<AIResponseData> {
  const trimmedMessage = message.trim();
  const runtimeCurrentDate = getBusinessDate(context.currentDate);

  // If user is authenticated, call server-side Gemini Financial Copilot
  if (isAuthenticated) {
    try {
      const response = await apiClient.post('/api/v1/ai/assistant', {
        message: trimmedMessage,
        context: {
          ...context,
          currentDate: runtimeCurrentDate,
        },
      });

      if (response.data && response.data.success && response.data.data) {
        const aiData = response.data.data;
        const intent = (aiData.intent || 'GENERAL_CHAT') as FinancialIntent;

        const actions: StructuredAction[] = [];
        const rawActionList = Array.isArray(aiData.actions) && aiData.actions.length > 0
          ? aiData.actions
          : aiData.action?.expense
          ? [aiData.action]
          : [];

        for (const act of rawActionList) {
          if (act && act.expense && act.type && act.type !== 'NONE') {
            const rawExp = act.expense;
            const catObj = CATEGORIES.find((c) => c.id === rawExp.category) || CATEGORIES[CATEGORIES.length - 1];

            actions.push({
              type: act.type,
              targetExpenseId: act.targetExpenseId,
              targetSummary: act.targetSummary,
              confidence: act.confidence || 0.95,
              explanation: act.explanation,
              requiresConfirmation: true, // ALWAYS require explicit confirmation before write
              expense: {
                id: rawExp.id,
                amount: Number(rawExp.amount) || 0,
                currency: 'VND',
                category: catObj.id,
                categoryName: catObj.name,
                date: rawExp.date || runtimeCurrentDate,
                dateExpression: rawExp.dateExpression,
                dateType: rawExp.dateType,
                note: rawExp.note || catObj.name,
                originalExpense: rawExp.originalExpense,
              },
            });
          }
        }

        return {
          intent,
          actions: actions.length > 0 ? actions : undefined,
          action: actions[0] || undefined,
          financialSummary: aiData.financialSummary,
          reply: aiData.reply || 'Financial Copilot đã xử lý yêu cầu của bạn.',
          confidence: aiData.confidence || 0.95,
          quota: aiData.quota,
          aggregatedFactsSnippet: aiData.aggregatedFactsSnippet,
          isFallback: false,
        };
      } else if (response.data && !response.data.success && response.data.reason) {
        // Quota exceeded or specific reason
        return {
          intent: 'GENERAL_CHAT',
          reply: `⚠️ ${response.data.reason}`,
          confidence: 1.0,
          isFallback: false,
        };
      }
    } catch (err: any) {
      console.warn('AI Assistant API call failed or unauthorized, switching to local rule fallback:', err);
    }
  }

  // FALLBACK ENGINE (Local Rule-Based / Guest Mode)
  const lowerMsg = trimmedMessage.toLowerCase();

  // 1. Check if user is trying to delete an expense
  if (lowerMsg.includes('xóa') || lowerMsg.includes('hủy bỏ') || lowerMsg.includes('bỏ khoản')) {
    const matched = context.expenses[0];
    if (matched) {
      const catObj = CATEGORIES.find((c) => c.id === matched.categoryId) || CATEGORIES[CATEGORIES.length - 1];
      const deleteAction: StructuredAction = {
        type: 'DELETE_EXPENSE',
        targetExpenseId: matched.id,
        targetSummary: `${matched.note} (${matched.amount.toLocaleString('vi-VN')}₫)`,
        requiresConfirmation: true,
        confidence: 0.9,
        expense: {
          id: matched.id,
          amount: matched.amount,
          currency: 'VND',
          category: matched.categoryId,
          categoryName: catObj.name,
          date: matched.date,
          note: matched.note,
        },
      };

      return {
        intent: 'DELETE_EXPENSE',
        actions: [deleteAction],
        action: deleteAction,
        reply: 'Bạn có muốn xóa giao dịch này khỏi sổ tay chi tiêu không?',
        confidence: 0.9,
        isFallback: true,
      };
    }
  }

  // 2. Check if user input matches financial query patterns
  const isQueryPattern =
    lowerMsg.includes('bao nhiêu') ||
    lowerMsg.includes('top 3') ||
    lowerMsg.includes('tiêu nhiều') ||
    lowerMsg.includes('vượt ngân sách') ||
    lowerMsg.includes('mục tiêu') ||
    lowerMsg.includes('tiết kiệm') ||
    lowerMsg.includes('tháng trước') ||
    lowerMsg.includes('dự báo') ||
    lowerMsg.includes('dòng tiền') ||
    lowerMsg.includes('ở đâu');

  if (isQueryPattern) {
    const computedReply = computeFinancialQueryResponse(trimmedMessage, context);
    const intent: FinancialIntent = lowerMsg.includes('dự báo') || lowerMsg.includes('dòng tiền')
      ? 'CASHFLOW_FORECAST'
      : lowerMsg.includes('ngân sách') || lowerMsg.includes('vượt')
      ? 'BUDGET_ADVICE'
      : lowerMsg.includes('mục tiêu')
      ? 'GOAL_FORECAST'
      : lowerMsg.includes('tiêu nhiều') || lowerMsg.includes('ở đâu')
      ? 'ANALYZE_SPENDING'
      : 'QUERY_FINANCE';

    return {
      intent,
      reply: computedReply,
      confidence: 0.9,
      isFallback: true,
    };
  }

  // 3. Otherwise try rule-based expense parser with deterministic multi-transaction engine
  const parsedList = parseMultipleTransactions(trimmedMessage, runtimeCurrentDate);

  if (parsedList.length > 0) {
    const actions: StructuredAction[] = parsedList.map((parsed) => ({
      type: 'CREATE_EXPENSE',
      requiresConfirmation: true,
      confidence: parsed.confidence,
      explanation: parsed.message,
      expense: {
        amount: parsed.amount,
        currency: 'VND',
        category: parsed.categoryId,
        categoryName: parsed.categoryName,
        date: parsed.date,
        dateExpression: parsed.dateExpression,
        dateType: parsed.dateType,
        note: parsed.note,
      },
    }));

    let reply = '';
    if (actions.length === 1) {
      const p = parsedList[0];
      reply = `Tôi đã nhận diện giao dịch: **${p.note}** (${p.amount.toLocaleString('vi-VN')}₫) vào ngày **${p.date}**. Bạn có muốn lưu vào sổ không?`;
    } else {
      const totalAmount = actions.reduce((sum, a) => sum + (a.expense?.amount || 0), 0);
      reply = `Tôi đã nhận diện **${actions.length} giao dịch** (Tổng số tiền: **${totalAmount.toLocaleString('vi-VN')}₫**). Bạn có muốn thêm các giao dịch này vào sổ không?`;
    }

    return {
      intent: 'CREATE_EXPENSE',
      actions,
      action: actions[0],
      reply,
      confidence: actions[0].confidence,
      isFallback: true,
      isLowConfidence: false,
    };
  }

  return {
    intent: 'GENERAL_CHAT',
    reply: `👋 **Chào bạn! Mình là Financial Copilot của Sổ Tay Chi Tiêu.**\n\n• **Ghi chép giao dịch**: Gõ *"Hôm qua ăn cơm 15k"*, *"Đi Grab 80k hôm qua"*, *"Thứ 2 tuần trước ăn lẩu 200k"*.\n• **Phân tích chi tiêu**: Hỏi *"Tháng này tôi tiêu bao nhiêu?"*, *"Tôi có bị vượt ngân sách không?"*.\n• **Dự báo dòng tiền**: Hỏi *"Dự báo dòng tiền cuối tháng"*, *"Bao lâu nữa mua được Laptop?"*.\n\n*Lưu ý: Mọi giao dịch tạo mới, sửa hoặc xóa luôn hiển thị thẻ xác nhận [Hủy] / [Xác nhận] trước khi ghi vào sổ.*`,
    confidence: 0.85,
    isFallback: true,
  };
}

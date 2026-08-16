import { GoogleGenAI, Type } from '@google/genai';
import { Logger } from '../../utils/logger';
import {
  AiAssistantInput,
  AiAssistantResult,
  FinancialIntent,
  StructuredAction,
} from './ai.types';
import { AppError } from '../../middleware/errorHandler.middleware';
import { AiQuotaManager } from './ai.quota';
import { AiLogger } from './ai.logger';
import { AiFactsAggregator } from './ai.aggregator';

const CATEGORIES_MAP: Record<string, string> = {
  an_uong: 'Ăn uống',
  di_chuyen: 'Di chuyển',
  mua_sam: 'Mua sắm',
  giai_tri: 'Giải trí',
  hoa_don: 'Hóa đơn & Tiện ích',
  suc_khoe: 'Sức khỏe & Y tế',
  giao_duc: 'Giáo dục',
  khac: 'Chi tiêu khác',
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const sanitizePromptInput = (text: string): string => {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();
};

export class AiService {
  static async processMessage(
    input: AiAssistantInput,
    userId: string,
    requestId?: string
  ): Promise<AiAssistantResult> {
    const startTime = Date.now();
    const rawCleanMessage = sanitizePromptInput(input.message);

    if (!rawCleanMessage) {
      throw new AppError('Nội dung tin nhắn không hợp lệ hoặc rỗng.', 400, 'INVALID_AI_MESSAGE');
    }

    // 1. Check & Consume Quota
    const quotaCheck = AiQuotaManager.checkAndConsumeQuota(userId);
    if (!quotaCheck.allowed) {
      AiLogger.logRequest({
        userId,
        intent: 'GENERAL_CHAT',
        prompt: rawCleanMessage,
        status: 'RATE_LIMITED',
        durationMs: Date.now() - startTime,
        quotaRemaining: 0,
      });

      return {
        success: false,
        fallbackToRule: false,
        reason: `Bạn đã dùng hết hạn mức AI hôm nay (${quotaCheck.quota.limit}/${quotaCheck.quota.limit} lượt). Hạn mức sẽ tự động đặt lại vào 00:00 ngày mai.`,
      };
    }

    const {
      currentDate = new Date().toISOString().split('T')[0],
      expenses = [],
      goals = [],
      categoryLimits = {},
      income = 15000000,
      recurringExpenses = [],
    } = input.context || {};

    // 2. Compute Deterministic Aggregated Facts
    const aggregatedFacts = AiFactsAggregator.aggregate({
      currentDate,
      expenses,
      goals,
      categoryLimits,
      income,
      recurringExpenses,
    });

    const ai = getGeminiClient();

    // 3. If Gemini is not configured or unavailable, use Deterministic Copilot Engine
    if (!ai) {
      const fallbackResult = this.generateDeterministicCopilotResponse(
        rawCleanMessage,
        aggregatedFacts,
        expenses,
        currentDate
      );

      AiLogger.logRequest({
        userId,
        intent: fallbackResult.data!.intent,
        prompt: rawCleanMessage,
        status: 'FALLBACK',
        durationMs: Date.now() - startTime,
        quotaRemaining: quotaCheck.quota.remaining,
      });

      return {
        success: true,
        data: {
          ...fallbackResult.data!,
          quota: {
            usedToday: quotaCheck.quota.used,
            limitToday: quotaCheck.quota.limit,
            remainingToday: quotaCheck.quota.remaining,
            resetAt: quotaCheck.quota.resetAt,
          },
        },
      };
    }

    // 4. Gemini Prompt with Guardrails & Deterministic Facts
    const systemInstruction = `Bạn là Financial Copilot chuyên nghiệp cho ứng dụng Quản lý Tài chính Cá nhân "Sổ Tay Chi Tiêu Thông Minh".
QUY TẮC BẢO MẬT & VẬN HÀNH BẮT BUỘC:
1. Bạn KHÔNG ĐƯỢC tự ý ghi dữ liệu vào database. Với mọi thao tác thêm/sửa/xóa (CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE), bạn PHẢI tạo cấu trúc "action" để người dùng xác nhận trên Preview Card [Hủy] / [Xác nhận].
2. Với các câu hỏi tài chính (QUERY_FINANCE, ANALYZE_SPENDING, BUDGET_ADVICE, GOAL_FORECAST, CASHFLOW_FORECAST), bạn KHÔNG TỰ BỊA ĐẶT HAY TỰ TÍNH TOÁN LẠI SỐ LIỆU. Bạn PHẢI DỰA 100% vào bảng AGGREGATED_FINANCIAL_FACTS được cung cấp bên dưới.
3. Khi phân tích hoặc đưa ra lời khuyên, hãy luôn cấu trúc câu trả lời rõ ràng:
   - 📊 **Hiện trạng & Con số thực tế**
   - ⚠️ **Đánh giá rủi ro / Điểm cần lưu ý**
   - 💡 **"Vậy tôi nên làm gì?"** (Khuyến nghị hành động định lượng cụ thể: ví dụ cắt giảm X đồng/ngày).

HÔM NAY: ${currentDate}

BẢNG SỐ LIỆU TÀI CHÍNH TẬP HỢP (AGGREGATED_FINANCIAL_FACTS):
${JSON.stringify(aggregatedFacts, null, 2)}

DANH MỤC HỢP LỆ:
- an_uong (Ăn uống)
- di_chuyen (Di chuyển, xăng, xe, Grab...)
- mua_sam (Mua sắm, quần áo, đồ gia dụng...)
- giai_tri (Giải trí, cafe, xem phim, du lịch...)
- hoa_don (Hóa đơn, điện, nước, internet, học phí...)
- suc_khoe (Sức khỏe, thuốc, khám bệnh...)
- giao_duc (Giáo dục, sách, khóa học...)
- khac (Khác)

CÁC INTENT ĐƯỢC HỖ TRỢ:
- CREATE_EXPENSE: Người dùng muốn ghi một khoản chi mới (Ví dụ: "Ăn sáng 35k", "Đổ xăng 70k hôm qua").
- UPDATE_EXPENSE: Người dùng muốn sửa khoản chi (Ví dụ: "Sửa tiền phở sáng nay thành 45k", "Đổi khoản cafe hôm qua thành 30k").
- DELETE_EXPENSE: Người dùng muốn xóa khoản chi (Ví dụ: "Xóa khoản ăn tối 120k", "Bỏ khoản grab vừa ghi").
- QUERY_FINANCE: Truy vấn thông tin tài chính cơ bản (Ví dụ: "Hôm nay tôi tiêu bao nhiêu?", "Tháng này đã chi hết bao nhiêu tiền?").
- ANALYZE_SPENDING: Phân tích sâu hành vi chi tiêu (Ví dụ: "Tôi đang tiêu nhiều nhất vào đâu?", "So sánh chi tiêu với tháng trước").
- BUDGET_ADVICE: Lời khuyên ngân sách (Ví dụ: "Tôi có bị vượt ngân sách không?", "Làm sao để không bị thâm hụt tháng này?").
- GOAL_FORECAST: Dự báo tiến độ mục tiêu tích lũy (Ví dụ: "Bao lâu nữa mua được Macbook?", "Mục tiêu mua xe tiến độ thế nào?").
- CASHFLOW_FORECAST: Dự báo dòng tiền cuối tháng (Ví dụ: "Dự kiến cuối tháng dư bao nhiêu?", "Tốc độ tiêu tiền hiện tại có an toàn không?").
- GENERAL_CHAT: Chào hỏi, trò chuyện hoặc hỏi cách dùng Financial Copilot.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `<user_financial_input>${rawCleanMessage}</user_financial_input>`,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.STRING,
                description:
                  'CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE, QUERY_FINANCE, ANALYZE_SPENDING, BUDGET_ADVICE, GOAL_FORECAST, CASHFLOW_FORECAST, hoặc GENERAL_CHAT',
              },
              action: {
                type: Type.OBJECT,
                description: 'Cấu trúc lệnh thao tác tài chính (nếu intent là CREATE/UPDATE/DELETE)',
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE, hoặc NONE',
                  },
                  expense: {
                    type: Type.OBJECT,
                    properties: {
                      amount: { type: Type.NUMBER, description: 'Số tiền VNĐ' },
                      category: { type: Type.STRING, description: 'Category ID' },
                      categoryName: { type: Type.STRING, description: 'Tên tiếng Việt của danh mục' },
                      date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                      note: { type: Type.STRING, description: 'Ghi chú khoản chi' },
                    },
                  },
                  targetSummary: {
                    type: Type.STRING,
                    description: 'Tóm tắt giao dịch đích nếu là UPDATE hoặc DELETE',
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: 'Độ tin cậy 0.0 - 1.0',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Giải thích tóm lược',
                  },
                },
              },
              financialSummary: {
                type: Type.OBJECT,
                properties: {
                  currentStatus: { type: Type.STRING },
                  riskOrInsight: { type: Type.STRING },
                  recommendedAction: { type: Type.STRING },
                },
              },
              reply: {
                type: Type.STRING,
                description: 'Phản hồi chi tiết bằng Markdown thân thiện cho người dùng',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Độ tin cậy tổng thể',
              },
            },
            required: ['intent', 'reply'],
          },
        },
      });

      const responseText = response.text || '{}';
      const parsedData = JSON.parse(responseText);

      const intent = (parsedData.intent || 'GENERAL_CHAT') as FinancialIntent;
      let action: StructuredAction | undefined = undefined;

      if (
        (intent === 'CREATE_EXPENSE' || intent === 'UPDATE_EXPENSE' || intent === 'DELETE_EXPENSE') &&
        parsedData.action?.expense
      ) {
        const rawExpense = parsedData.action.expense;
        const validAmount = Number(rawExpense.amount) || 0;
        const catKey = rawExpense.category || 'khac';
        const catName = CATEGORIES_MAP[catKey] || rawExpense.categoryName || 'Chi tiêu khác';

        // Check if matching transaction exists for update/delete
        let matchedExpense: any = undefined;
        if (intent === 'UPDATE_EXPENSE' || intent === 'DELETE_EXPENSE') {
          const noteQuery = (rawExpense.note || '').toLowerCase();
          matchedExpense = expenses.find((e) => {
            const eNote = (e.note || '').toLowerCase();
            return (
              (eNote && noteQuery && (eNote.includes(noteQuery) || noteQuery.includes(eNote))) ||
              (validAmount > 0 && e.amount === validAmount) ||
              e.categoryId === catKey
            );
          });
        }

        action = {
          type: intent,
          expense: {
            id: matchedExpense?.id,
            amount: validAmount > 0 ? validAmount : (matchedExpense?.amount || 0),
            category: catKey,
            categoryName: catName,
            date: rawExpense.date || currentDate,
            note: rawExpense.note || matchedExpense?.note || catName,
            originalExpense: matchedExpense ? {
              id: matchedExpense.id,
              amount: matchedExpense.amount,
              category: matchedExpense.categoryId,
              categoryName: CATEGORIES_MAP[matchedExpense.categoryId] || 'Khác',
              date: matchedExpense.date,
              note: matchedExpense.note,
            } : undefined,
          },
          targetExpenseId: matchedExpense?.id,
          targetSummary: parsedData.action.targetSummary || (matchedExpense ? `${matchedExpense.note} (${matchedExpense.amount?.toLocaleString('vi-VN')}₫)` : undefined),
          confidence: parsedData.action.confidence || 0.9,
          explanation: parsedData.action.explanation,
          requiresConfirmation: true,
        };
      }

      AiLogger.logRequest({
        userId,
        intent,
        prompt: rawCleanMessage,
        status: 'SUCCESS',
        durationMs: Date.now() - startTime,
        quotaRemaining: quotaCheck.quota.remaining,
      });

      return {
        success: true,
        data: {
          intent,
          action,
          financialSummary: parsedData.financialSummary,
          reply: parsedData.reply || 'Dưới đây là phản hồi từ Financial Copilot:',
          confidence: parsedData.confidence || 0.95,
          aggregatedFactsSnippet: {
            totalSpentThisMonth: aggregatedFacts.totalSpentThisMonth,
            netSavingsThisMonth: aggregatedFacts.netSavingsThisMonth,
            savingsRatePct: aggregatedFacts.savingsRatePct,
            dailyBurnRate: aggregatedFacts.dailyBurnRate,
            projectedEndMonthSpent: aggregatedFacts.projectedEndMonthSpent,
          },
          quota: {
            usedToday: quotaCheck.quota.used,
            limitToday: quotaCheck.quota.limit,
            remainingToday: quotaCheck.quota.remaining,
            resetAt: quotaCheck.quota.resetAt,
          },
        },
      };
    } catch (error: any) {
      Logger.error('Gemini Financial Copilot Error:', error, requestId);

      const fallbackResult = this.generateDeterministicCopilotResponse(
        rawCleanMessage,
        aggregatedFacts,
        expenses,
        currentDate
      );

      AiLogger.logRequest({
        userId,
        intent: fallbackResult.data!.intent,
        prompt: rawCleanMessage,
        status: 'FALLBACK',
        durationMs: Date.now() - startTime,
        quotaRemaining: quotaCheck.quota.remaining,
      });

      return {
        success: true,
        data: {
          ...fallbackResult.data!,
          quota: {
            usedToday: quotaCheck.quota.used,
            limitToday: quotaCheck.quota.limit,
            remainingToday: quotaCheck.quota.remaining,
            resetAt: quotaCheck.quota.resetAt,
          },
        },
      };
    }
  }

  // Deterministic local rule engine for offline / fallback
  private static generateDeterministicCopilotResponse(
    message: string,
    facts: any,
    expenses: any[],
    currentDate: string
  ): AiAssistantResult {
    const lower = message.toLowerCase();

    // 1. DELETE detection
    if (lower.includes('xóa') || lower.includes('hủy bỏ') || lower.includes('bỏ khoản')) {
      const matched = expenses[0];
      if (matched) {
        return {
          success: true,
          data: {
            intent: 'DELETE_EXPENSE',
            action: {
              type: 'DELETE_EXPENSE',
              targetExpenseId: matched.id,
              targetSummary: `${matched.note} (${matched.amount?.toLocaleString('vi-VN')}₫)`,
              expense: {
                id: matched.id,
                amount: matched.amount,
                category: matched.categoryId,
                categoryName: CATEGORIES_MAP[matched.categoryId] || 'Khác',
                date: matched.date,
                note: matched.note,
              },
              confidence: 0.85,
              explanation: 'Nhận diện yêu cầu xóa giao dịch',
              requiresConfirmation: true,
            },
            reply: 'Bạn có chắc chắn muốn xóa giao dịch này khỏi sổ tay chi tiêu không?',
            confidence: 0.85,
          },
        };
      }
    }

    // 2. CREATE_EXPENSE regex detection (e.g. "ăn sáng 35k", "grab 85000", "mua sách 120 ngàn")
    const amountRegex = /(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|đ|vnd)?/i;
    const match = lower.match(amountRegex);

    if (match && !lower.includes('bao nhiêu') && !lower.includes('thế nào') && !lower.includes('dự báo')) {
      let rawVal = parseFloat(match[1].replace(',', '.'));
      const unit = (match[2] || '').toLowerCase();

      let finalAmount = rawVal;
      if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') finalAmount = rawVal * 1000;
      else if (unit === 'tr' || unit === 'triệu') finalAmount = rawVal * 1000000;
      else if (finalAmount < 1000 && !unit) finalAmount = rawVal * 1000;

      // Category detection
      let detectedCat = 'khac';
      if (/ăn|phở|cơm|bún|bánh|uống|cafe|trà|nhậu|siêu thị|chợ/.test(lower)) detectedCat = 'an_uong';
      else if (/xăng|xe|grab|taxi|vé|gửi xe|bus|be/.test(lower)) detectedCat = 'di_chuyen';
      else if (/quần|áo|giày|dép|mua|shopee|lazada|mỹ phẩm/.test(lower)) detectedCat = 'mua_sam';
      else if (/phim|game|du lịch|karaoke|chơi/.test(lower)) detectedCat = 'giai_tri';
      else if (/điện|nước|mạng|wifi|học phí|nhà|hóa đơn/.test(lower)) detectedCat = 'hoa_don';
      else if (/thuốc|bệnh|khám|gym|bác sĩ/.test(lower)) detectedCat = 'suc_khoe';
      else if (/sách|vở|học|khóa học/.test(lower)) detectedCat = 'giao_duc';

      return {
        success: true,
        data: {
          intent: 'CREATE_EXPENSE',
          action: {
            type: 'CREATE_EXPENSE',
            expense: {
              amount: finalAmount,
              category: detectedCat,
              categoryName: CATEGORIES_MAP[detectedCat] || 'Chi tiêu khác',
              date: currentDate,
              note: message.trim(),
            },
            confidence: 0.85,
            explanation: `Bóc tách: ${CATEGORIES_MAP[detectedCat]} - ${finalAmount.toLocaleString('vi-VN')}₫`,
            requiresConfirmation: true,
          },
          reply: 'Bạn có muốn lưu giao dịch này vào sổ tay chi tiêu không?',
          confidence: 0.85,
        },
      };
    }

    // 3. CASHFLOW_FORECAST / BURN RATE
    if (lower.includes('dự báo') || lower.includes('dòng tiền') || lower.includes('cuối tháng')) {
      return {
        success: true,
        data: {
          intent: 'CASHFLOW_FORECAST',
          financialSummary: {
            currentStatus: `Tốc độ chi tiêu: ~${facts.dailyBurnRate?.toLocaleString('vi-VN')}₫/ngày.`,
            riskOrInsight: `Dự kiến chi hết tháng: ${facts.projectedEndMonthSpent?.toLocaleString('vi-VN')}₫.`,
            recommendedAction: `Nếu giữ tốc độ này, số dư dự kiến cuối tháng đạt ${facts.projectedEndMonthSavings?.toLocaleString('vi-VN')}₫.`,
          },
          reply: `📊 **Dự báo dòng tiền tháng ${facts.month}/${facts.year}:**\n\n• **Tốc độ đốt tiền (Burn Rate)**: ~**${facts.dailyBurnRate?.toLocaleString('vi-VN')}₫/ngày**.\n• **Dự kiến tổng chi hết tháng**: **${facts.projectedEndMonthSpent?.toLocaleString('vi-VN')}₫** (${Math.round((facts.projectedEndMonthSpent / facts.income) * 100)}% thu nhập).\n• **Dự kiến số dư tiết kiệm cuối tháng**: **${facts.projectedEndMonthSavings?.toLocaleString('vi-VN')}₫**.\n\n💡 **Khuyến nghị Copilot**: Còn ${facts.daysRemaining} ngày trong tháng. Hãy duy trì mức chi tiêu dưới **${Math.round((facts.income - facts.totalSpentThisMonth) / Math.max(1, facts.daysRemaining)).toLocaleString('vi-VN')}₫/ngày** để đảm bảo mục tiêu tích lũy!`,
          confidence: 0.9,
        },
      };
    }

    // 4. BUDGET_ADVICE
    if (lower.includes('ngân sách') || lower.includes('vượt') || lower.includes('hạn mức')) {
      const over = facts.overBudgetCategories || [];
      const overText = over.length > 0
        ? over.map((c: any) => `• **${c.categoryName}**: Đã chi ${c.spent.toLocaleString('vi-VN')}₫ (vượt ${c.overAmount.toLocaleString('vi-VN')}₫)`).join('\n')
        : '• Tất cả các danh mục chi tiêu đều đang nằm trong hạn mức an toàn.';

      return {
        success: true,
        data: {
          intent: 'BUDGET_ADVICE',
          financialSummary: {
            currentStatus: `Chi tiêu: ${facts.totalSpentThisMonth?.toLocaleString('vi-VN')}₫ (${facts.savingsRatePct}% tích lũy).`,
            riskOrInsight: over.length > 0 ? `${over.length} danh mục vượt ngân sách.` : 'Ngân sách đang ổn định.',
            recommendedAction: over.length > 0 ? 'Cắt giảm chi tiêu các danh mục vượt hạn mức.' : 'Tiếp tục duy trì kỷ luật.',
          },
          reply: `🛡️ **Báo cáo & Tư vấn Ngân sách:**\n\n${overText}\n\n💡 **"Vậy tôi nên làm gì?":**\n${over.length > 0 ? `Hãy tạm dừng chi tiêu không thiết yếu trong các danh mục trên, hoặc chuyển bớt hạn mức từ các danh mục còn dư sang.` : `Kế hoạch tài chính tháng này đang vận hành rất tốt. Bạn có thể trích thêm 5-10% vào Quỹ Mục tiêu tích lũy.`}`,
          confidence: 0.9,
        },
      };
    }

    // 5. Default QUERY_FINANCE
    return {
      success: true,
      data: {
        intent: 'QUERY_FINANCE',
        financialSummary: {
          currentStatus: `Tổng chi tháng ${facts.month}: ${facts.totalSpentThisMonth?.toLocaleString('vi-VN')}₫.`,
          riskOrInsight: `Tỷ lệ tiết kiệm hiện tại: ${facts.savingsRatePct}%.`,
          recommendedAction: `Số dư còn lại: ${facts.netSavingsThisMonth?.toLocaleString('vi-VN')}₫.`,
        },
        reply: `📊 **Tổng quan tài chính tháng ${facts.month}/${facts.year}:**\n\n• **Tổng chi tiêu**: **${facts.totalSpentThisMonth?.toLocaleString('vi-VN')}₫** (${facts.transactionCountThisMonth} giao dịch).\n• **Thu nhập định mức**: **${facts.income?.toLocaleString('vi-VN')}₫**.\n• **Tích lũy ròng**: **${facts.netSavingsThisMonth?.toLocaleString('vi-VN')}₫** (Tỷ lệ tiết kiệm: **${facts.savingsRatePct}%**).\n\n💡 Bạn có thể hỏi Copilot: *"Tôi tiêu nhiều nhất vào đâu?"*, *"Dự báo dòng tiền cuối tháng"*, hoặc gõ *"Ăn sáng 35k"* để ghi chép nhanh!`,
        confidence: 0.85,
      },
    };
  }
}

import { formatDateShort } from '../../utils/format';
import { GoogleGenAI, Type } from '@google/genai';
import { INCOME_MISSING_INVITE } from '../../utils/incomeMessages';
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
import { getBusinessDate, parseVietnameseDate } from '../../utils/dateParser';
import { parseMultipleTransactions, ParsedResult } from '../../utils/parser';
import {
  INCOME_NOT_SUPPORTED_REPLY,
  DELETE_CLARIFY_REPLY,
  UPDATE_CLARIFY_REPLY,
  detectIncomeSegments,
  isIncomeOnlyMessage,
  isDeleteRequest,
  parseExpensePart,
  keepExpenseActions,
  buildMixedIncomeReply,
  detectCategoryQuery,
  answerCategoryQuery,
  findDeleteTarget,
} from '../../utils/aiIntent';

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

const toCreateAction = (item: ParsedResult): StructuredAction => ({
  type: 'CREATE_EXPENSE',
  expense: {
    amount: item.amount,
    currency: 'VND',
    category: item.categoryId,
    categoryName: item.categoryName,
    date: item.date,
    dateExpression: item.dateExpression,
    dateType: item.dateType,
    note: item.note,
  },
  confidence: item.confidence,
  explanation: `Đã nhận diện: ${item.categoryName} - ${item.amount.toLocaleString('vi-VN')}₫ (${formatDateShort(item.date)})`,
  requiresConfirmation: true,
});

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

    // Câu chỉ ghi tiền vào: trả lời ngay, không tốn quota và không gọi Gemini
    if (isIncomeOnlyMessage(rawCleanMessage)) {
      return {
        success: true,
        data: { intent: 'GENERAL_CHAT', reply: INCOME_NOT_SUPPORTED_REPLY, confidence: 1 },
      };
    }

    // 1. Check & Consume Quota
    const quotaCheck = await AiQuotaManager.checkAndConsumeQuota(userId, rawCleanMessage);
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

    // Determine current business date in Asia/Ho_Chi_Minh as the absolute source of truth
    const businessCurrentDate = input.context?.currentDate
      ? getBusinessDate(input.context.currentDate)
      : getBusinessDate();

    const {
      expenses = [],
      goals = [],
      categoryLimits = {},
      income = 0,
      recurringExpenses = [],
    } = input.context || {};

    // Run deterministic date extraction upfront
    const deterministicDateResult = parseVietnameseDate(rawCleanMessage, businessCurrentDate);

    // 2. Compute Deterministic Aggregated Facts
    const aggregatedFacts = AiFactsAggregator.aggregate({
      currentDate: businessCurrentDate,
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
        categoryLimits,
        businessCurrentDate
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

    // 4. Gemini Prompt with Guardrails, Timezone awareness & Deterministic Facts
    const missingIncomeRule = aggregatedFacts.income > 0
      ? ''
      : `\nNGƯỜI DÙNG CHƯA NHẬP THU NHẬP THÁNG (income = 0): KHÔNG nêu tỷ lệ tiết kiệm, phần trăm thu nhập, tích lũy hay hạn mức chi mỗi ngày. estimatedMonthsNeeded = null nghĩa là CHƯA TÍNH ĐƯỢC thời gian đạt mục tiêu, KHÔNG PHẢI 0 tháng. Khi câu hỏi liên quan, hãy nói: "${INCOME_MISSING_INVITE}"`;
    const noSurplusRule =
      aggregatedFacts.income > 0 && aggregatedFacts.netSavingsThisMonth > 0
        ? ''
        : '\nTHÁNG NÀY KHÔNG CÓ PHẦN DƯ ĐÃ XÁC ĐỊNH (thâm hụt, dùng hết hoặc chưa nhập thu nhập): KHÔNG khuyên trích tiết kiệm, đầu tư hay nạp tiền vào mục tiêu.';
    const hasAnyLimit = Object.values(categoryLimits || {}).some((l) => Number(l) > 0);
    const noLimitsRule = hasAnyLimit
      ? ''
      : '\nCHƯA ĐẶT HẠN MỨC DANH MỤC (tất cả categoryFacts có limit = 0, status = "no_limit"): KHÔNG ĐƯỢC nói "tất cả các danh mục đều nằm trong hạn mức an toàn" hay "ngân sách đang ổn định"; hãy nói rõ chưa thiết lập hạn mức danh mục.';
    const deficitBudgetRule =
      aggregatedFacts.income > 0 && aggregatedFacts.netSavingsThisMonth <= 0
        ? '\nĐANG THÂM HỤT HOẶC HẾT PHẦN DƯ (netSavingsThisMonth <= 0): KHÔNG ĐƯỢC nói "ngân sách đang ổn định" hay "tiếp tục duy trì kỷ luật"; phải cảnh báo thâm hụt/hết ngân sách và khuyên tạm dừng chi không thiết yếu, nhất quán giữa reply và financialSummary.'
        : '';
    const systemInstruction = `Bạn là Financial Copilot chuyên nghiệp cho ứng dụng Quản lý Tài chính Cá nhân "Sổ Tay Chi Tiêu Thông Minh".
QUY TẮC BẢO MẬT & VẬN HÀNH BẮT BUỘC:
1. Bạn KHÔNG ĐƯỢC tự ý ghi dữ liệu vào database. Với mọi thao tác thêm/sửa/xóa (CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE), bạn PHẢI tạo cấu trúc "actions" (danh sách các action) để người dùng xem trước và xác nhận trên UI [Hủy] / [Xác nhận].
2. HỖ TRỢ ĐA GIAO DỊCH TRONG 1 CÂU (QUAN TRỌNG):
   - Nếu câu chứa nhiều khoản chi tiêu (Ví dụ: "Hôm nay mua sữa hết 15k, mua cafe hết 25k", "Ăn sáng 20k, mua sách 120k", "Mua áo 300k và giày 800k"):
     * BẮT BUỘC trả về mảng "actions" chứa TỪNG giao dịch độc lập tương ứng.
     * KHÔNG ĐƯỢC gộp chung thành 1 giao dịch duy nhất.
     * Từng giao dịch phải có số tiền (amount), danh mục (category), ghi chú (note), và ngày (date) chính xác.
     * Nếu các vế sau không ghi ngày, kế thừa ngày từ vế trước hoặc ngày hiện tại.
3. NGUYÊN TẮC XÁC ĐỊNH NGÀY GIAO DỊCH (QUAN TRỌNG NHẤT):
   - Múi giờ chuẩn: Asia/Ho_Chi_Minh (UTC+7).
   - Ngày hiện tại mốc (businessCurrentDate): ${businessCurrentDate}.
   - Nếu câu của người dùng có đề cập thời gian tương đối hoặc tuyệt đối ("hôm qua", "hôm kia", "thứ 2 tuần trước", "15/08", "ngày mai", "3 ngày trước"):
     * BẮT BUỘC tính toán chính xác ngày giao dịch theo YYYY-MM-DD dựa trên ngày mốc ${businessCurrentDate}.
     * KHÔNG ĐƯỢC mặc định lấy ngày hiện tại nếu người dùng đã ghi rõ ngày ("hôm qua" -> lấy ngày trước ${businessCurrentDate}).
   - Nếu câu KHÔNG đề cập ngày tháng nào: lấy ngày hiện tại ${businessCurrentDate}.
KHOẢN TIỀN VÀO (nhận/lãnh lương, lương về, được thưởng, thu nhập, tiền lãi nhận, hoàn tiền, được cho/tặng, bán được): ứng dụng CHƯA ghi được khoản thu. TUYỆT ĐỐI KHÔNG tạo action cho khoản tiền vào và không gọi nó là khoản chi; hãy nói rõ chưa ghi được khoản thu, gợi ý cập nhật thu nhập tháng ở Tổng quan. Nếu câu có cả thu và chi, chỉ tạo action cho phần chi. Lưu ý "trả lương", "chi lương", "đóng lãi", "trả lãi" là khoản CHI.
Khi hỏi tổng chi một danh mục, dùng "categoryFacts" (spent/transactionCount cho tháng này, previousMonthSpent/previousMonthTransactionCount cho tháng trước).
netSavingsThisMonth và projectedEndMonthSavings âm nghĩa là chi vượt thu nhập: gọi là "thâm hụt", không đề xuất hạn mức chi mỗi ngày là số âm.
4. Với các câu hỏi tài chính (QUERY_FINANCE, ANALYZE_SPENDING, BUDGET_ADVICE, GOAL_FORECAST, CASHFLOW_FORECAST), bạn KHÔNG TỰ BỊA ĐẶT HAY TỰ TÍNH TOÁN LẠI SỐ LIỆU. Bạn PHẢI DỰA 100% vào bảng AGGREGATED_FINANCIAL_FACTS được cung cấp bên dưới.
5. Khi phân tích hoặc đưa ra lời khuyên, hãy luôn cấu trúc câu trả lời rõ ràng:
   - 📊 **Hiện trạng & Con số thực tế**
   - ⚠️ **Đánh giá rủi ro / Điểm cần lưu ý**
   - 💡 **"Vậy tôi nên làm gì?"** (Khuyến nghị hành động định lượng cụ thể).

HÔM NAY (Asia/Ho_Chi_Minh): ${businessCurrentDate}
KẾT QUẢ PHÂN TÍCH NGÀY CHUẨN XÁC ĐOÁN TRƯỚC:
- Ngày nhận diện: ${deterministicDateResult.normalizedDate} (Loại: ${deterministicDateResult.dateType}, Biểu thức: "${deterministicDateResult.originalExpression || 'hôm nay'}")

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
- khac (Chi tiêu khác)

CÁC INTENT ĐƯỢC HỖ TRỢ:
- CREATE_EXPENSE: Người dùng muốn ghi một hoặc nhiều khoản chi mới (Ví dụ: "Hôm qua ăn cơm 15k", "Hôm nay mua sữa hết 15k, mua cafe hết 25k", "Đổ xăng 70k hôm qua").
- UPDATE_EXPENSE: Người dùng muốn sửa khoản chi (Ví dụ: "Sửa tiền phở sáng nay thành 45k", "Đổi khoản cafe hôm qua thành 30k").
- DELETE_EXPENSE: Người dùng muốn xóa khoản chi (Ví dụ: "Xóa khoản ăn tối 120k", "Bỏ khoản grab vừa ghi").
- QUERY_FINANCE: Truy vấn thông tin tài chính cơ bản.
- ANALYZE_SPENDING: Phân tích sâu hành vi chi tiêu.
- BUDGET_ADVICE: Lời khuyên ngân sách.
- GOAL_FORECAST: Dự báo tiến độ mục tiêu tích lũy.
- CASHFLOW_FORECAST: Dự báo dòng tiền cuối tháng.
- GENERAL_CHAT: Chào hỏi, trò chuyện.${missingIncomeRule}${noSurplusRule}${noLimitsRule}${deficitBudgetRule}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `<user_financial_input>${rawCleanMessage}</user_financial_input>`,
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.STRING,
                description:
                  'CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE, QUERY_FINANCE, ANALYZE_SPENDING, BUDGET_ADVICE, GOAL_FORECAST, CASHFLOW_FORECAST, hoặc GENERAL_CHAT',
              },
              actions: {
                type: Type.ARRAY,
                description: 'Danh sách các action tương ứng (nếu người dùng nhập 1 hoặc nhiều giao dịch)',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: 'CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE, hoặc NONE',
                    },
                    expense: {
                      type: Type.OBJECT,
                      properties: {
                        amount: { type: Type.NUMBER, description: 'Số tiền VNĐ' },
                        currency: { type: Type.STRING, description: 'VND' },
                        category: { type: Type.STRING, description: 'Category ID' },
                        categoryName: { type: Type.STRING, description: 'Tên tiếng Việt của danh mục' },
                        date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                        dateExpression: { type: Type.STRING, description: 'Cụm từ ngày gốc' },
                        dateType: { type: Type.STRING, description: 'EXACT, RELATIVE, INFERRED, DEFAULT' },
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
              },
              action: {
                type: Type.OBJECT,
                description: 'Cấu trúc lệnh đơn (backward compatibility)',
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'CREATE_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE, hoặc NONE',
                  },
                  expense: {
                    type: Type.OBJECT,
                    properties: {
                      amount: { type: Type.NUMBER, description: 'Số tiền VNĐ' },
                      currency: { type: Type.STRING, description: 'VND' },
                      category: { type: Type.STRING, description: 'Category ID' },
                      categoryName: { type: Type.STRING, description: 'Tên tiếng Việt của danh mục' },
                      date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                      dateExpression: { type: Type.STRING, description: 'Cụm từ ngày gốc' },
                      dateType: { type: Type.STRING, description: 'EXACT, RELATIVE, INFERRED, DEFAULT' },
                      note: { type: Type.STRING, description: 'Ghi chú khoản chi' },
                    },
                  },
                  targetSummary: {
                    type: Type.STRING,
                  },
                  confidence: {
                    type: Type.NUMBER,
                  },
                  explanation: {
                    type: Type.STRING,
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
      const actions: StructuredAction[] = [];

      // Check if multi-actions returned from Gemini or single action
      const rawActionList = Array.isArray(parsedData.actions) && parsedData.actions.length > 0
        ? parsedData.actions
        : parsedData.action?.expense
        ? [parsedData.action]
        : [];

      let clarifyReply: string | undefined;

      for (const act of rawActionList) {
        if (act && act.expense) {
          const rawExpense = act.expense;
          const validAmount = Number(rawExpense.amount) || 0;
          const catKey = rawExpense.category || 'khac';
          const catName = CATEGORIES_MAP[catKey] || rawExpense.categoryName || 'Chi tiêu khác';

          const actionType = act.type || intent;
          let matchedExpense: any = undefined;
          if (actionType === 'DELETE_EXPENSE') {
            // Chỉ đề xuất xóa khi ghi chú/số tiền người dùng nói khớp đúng một khoản
            matchedExpense = findDeleteTarget(rawCleanMessage, expenses, businessCurrentDate) ?? undefined;
            if (!matchedExpense) {
              clarifyReply = DELETE_CLARIFY_REPLY;
              continue;
            }
          } else if (actionType === 'UPDATE_EXPENSE') {
            const noteQuery = (rawExpense.note || '').toLowerCase();
            matchedExpense = expenses.find((e) => {
              const eNote = (e.note || '').toLowerCase();
              return (
                (eNote && noteQuery && (eNote.includes(noteQuery) || noteQuery.includes(eNote))) ||
                (validAmount > 0 && e.amount === validAmount)
              );
            });
            if (!matchedExpense) {
              // Không có khoản đích thì không đề xuất, tránh bị lưu thành khoản chi mới
              clarifyReply = UPDATE_CLARIFY_REPLY;
              continue;
            }
          }

          const finalNormalizedDate = rawExpense.date || deterministicDateResult.normalizedDate || businessCurrentDate;
          const finalDateType = rawExpense.dateType || (deterministicDateResult.matched ? deterministicDateResult.dateType : 'DEFAULT');
          const finalDateExpr = rawExpense.dateExpression || (deterministicDateResult.matched ? deterministicDateResult.originalExpression : 'hôm nay');

          actions.push({
            type: actionType as any,
            expense: {
              id: matchedExpense?.id,
              amount: validAmount > 0 ? validAmount : (matchedExpense?.amount || 0),
              currency: 'VND',
              category: catKey,
              categoryName: catName,
              date: finalNormalizedDate,
              dateExpression: finalDateExpr,
              dateType: finalDateType as any,
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
            targetSummary: act.targetSummary || (matchedExpense ? `${matchedExpense.note} (${matchedExpense.amount?.toLocaleString('vi-VN')}₫)` : undefined),
            confidence: act.confidence || 0.95,
            explanation: act.explanation,
            requiresConfirmation: true,
          });
        }
      }

      let reply: string = parsedData.reply || 'Dưới đây là phản hồi từ Financial Copilot:';
      let financialSummary = parsedData.financialSummary;
      const hasIncomePart = detectIncomeSegments(rawCleanMessage).incomeSegments.length > 0;

      if (hasIncomePart) {
        // Hậu kiểm: không tin action Gemini trả về cho phần tiền vào
        const kept = keepExpenseActions(rawCleanMessage, actions);
        const localExpenses = parseExpensePart(rawCleanMessage, businessCurrentDate);
        const isRecording = intent === 'CREATE_EXPENSE';
        const dropped = kept.length < actions.length;
        const finalActions =
          isRecording && kept.length < localExpenses.length ? localExpenses.map(toCreateAction) : kept;
        actions.splice(0, actions.length, ...finalActions);

        // Câu trả lời của Gemini có thể đã gọi khoản thu là khoản chi nên phải thay
        if (isRecording || dropped) {
          reply = actions.length > 0 ? buildMixedIncomeReply(actions) : INCOME_NOT_SUPPORTED_REPLY;
          financialSummary = undefined;
        }
      } else if (intent === 'CREATE_EXPENSE' && actions.length <= 1) {
        // If intent is CREATE_EXPENSE and Gemini returned 0 or 1 action but input has multiple amounts, check parser
        const localMulti = parseMultipleTransactions(rawCleanMessage, businessCurrentDate);
        if (localMulti.length > actions.length && localMulti.length > 1) {
          actions.splice(0, actions.length, ...localMulti.map(toCreateAction));
        }
      }

      if (clarifyReply && actions.length === 0) {
        reply = clarifyReply;
        financialSummary = undefined;
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
          actions: actions.length > 0 ? actions : undefined,
          action: actions[0] || undefined,
          financialSummary,
          reply,
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
        categoryLimits,
        businessCurrentDate
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
    categoryLimits: Record<string, number>,
    businessCurrentDate: string
  ): AiAssistantResult {
    const lower = message.toLowerCase();

    // 1. DELETE detection
    if (isDeleteRequest(message)) {
      const matched = findDeleteTarget(message, expenses, businessCurrentDate);
      if (!matched) {
        return {
          success: true,
          data: { intent: 'DELETE_EXPENSE', reply: DELETE_CLARIFY_REPLY, confidence: 0.9 },
        };
      } else {
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
                currency: 'VND',
                category: matched.categoryId,
                categoryName: CATEGORIES_MAP[matched.categoryId] || 'Khác',
                date: matched.date,
                note: matched.note,
              },
              confidence: 0.9,
              explanation: 'Nhận diện yêu cầu xóa giao dịch',
              requiresConfirmation: true,
            },
            reply: 'Bạn có chắc chắn muốn xóa giao dịch này khỏi sổ tay chi tiêu không?',
            confidence: 0.9,
          },
        };
      }
    }

    const categoryQuery = detectCategoryQuery(message);
    if (categoryQuery) {
      return {
        success: true,
        data: {
          intent: 'QUERY_FINANCE',
          reply: answerCategoryQuery(categoryQuery, expenses, categoryLimits, businessCurrentDate),
          confidence: 0.95,
        },
      };
    }

    // 2. CREATE_EXPENSE with deterministic date normalization & multi-transaction support
    const hasIncomePart = detectIncomeSegments(message).incomeSegments.length > 0;
    const parsedList = hasIncomePart
      ? parseExpensePart(message, businessCurrentDate)
      : parseMultipleTransactions(message, businessCurrentDate);

    if (parsedList.length > 0 && !lower.includes('bao nhiêu') && !lower.includes('thế nào') && !lower.includes('dự báo')) {
      const actions: StructuredAction[] = parsedList.map(toCreateAction);

      let reply = '';
      if (actions.length === 1) {
        const p = parsedList[0];
        const displayDateNote = p.dateLabel ? ` vào ${p.dateLabel}` : '';
        reply = `Tôi đã nhận diện khoản chi: **${p.note}** với số tiền **${p.amount.toLocaleString('vi-VN')}₫**${displayDateNote} (Ngày **${formatDateShort(p.date)}**). Bạn có muốn lưu vào sổ tay chi tiêu không?`;
      } else {
        const totalAmount = actions.reduce((sum, a) => sum + (a.expense?.amount || 0), 0);
        reply = `Tôi đã nhận diện **${actions.length} giao dịch** (Tổng số tiền: **${totalAmount.toLocaleString('vi-VN')}₫**). Bạn có muốn thêm các giao dịch này vào sổ không?`;
      }

      if (hasIncomePart) reply = buildMixedIncomeReply(actions);

      return {
        success: true,
        data: {
          intent: 'CREATE_EXPENSE',
          actions,
          action: actions[0],
          reply,
          confidence: actions[0].confidence,
        },
      };
    }

    const hasIncome = Number(facts.income) > 0;
    const vnd = (n: number) => `${Number(n || 0).toLocaleString('vi-VN')}₫`;
    const balanceText = (label: string, value: number) =>
      value < 0 ? `Thâm hụt so với thu nhập khai báo: ${vnd(-value)}` : `${label}: ${vnd(value)}`;
    const remainingNow = Number(facts.income) - Number(facts.totalSpentThisMonth);
    const dailyAdvice =
      remainingNow <= 0
        ? `${remainingNow < 0 ? `Bạn đã chi vượt thu nhập khai báo **${vnd(-remainingNow)}**` : 'Bạn đã dùng hết thu nhập khai báo'}. Còn ${facts.daysRemaining} ngày trong tháng, hãy hạn chế tối đa các khoản chi chưa cần thiết.`
        : `Còn ${facts.daysRemaining} ngày trong tháng. Hãy duy trì mức chi tiêu dưới **${vnd(Math.round(remainingNow / Math.max(1, facts.daysRemaining)))}/ngày** để đảm bảo mục tiêu tích lũy!`;

    // 3. CASHFLOW_FORECAST / BURN RATE
    if (lower.includes('dự báo') || lower.includes('dòng tiền') || lower.includes('cuối tháng')) {
      return {
        success: true,
        data: {
          intent: 'CASHFLOW_FORECAST',
          financialSummary: {
            currentStatus: `Tốc độ chi tiêu: ~${facts.dailyBurnRate?.toLocaleString('vi-VN')}₫/ngày.`,
            riskOrInsight: `Dự kiến chi hết tháng: ${facts.projectedEndMonthSpent?.toLocaleString('vi-VN')}₫.`,
            recommendedAction: hasIncome
              ? `Nếu giữ tốc độ này, cuối tháng — ${balanceText('Còn lại so với thu nhập khai báo', facts.projectedEndMonthSavings)}.`
              : INCOME_MISSING_INVITE,
          },
          reply: hasIncome
            ? `📊 **Dự báo dòng tiền tháng ${facts.month}/${facts.year}:**\n\n• **Tốc độ đốt tiền (Burn Rate)**: ~**${facts.dailyBurnRate?.toLocaleString('vi-VN')}₫/ngày**.\n• **Dự kiến tổng chi hết tháng**: **${facts.projectedEndMonthSpent?.toLocaleString('vi-VN')}₫** (${Math.round((facts.projectedEndMonthSpent / facts.income) * 100)}% thu nhập).\n• **Dự kiến cuối tháng** — ${balanceText('Còn lại so với thu nhập khai báo', facts.projectedEndMonthSavings)}.\n\n💡 **Khuyến nghị Copilot**: ${dailyAdvice}`
            : `📊 **Dự báo dòng tiền tháng ${facts.month}/${facts.year}:**\n\n• **Tốc độ đốt tiền (Burn Rate)**: ~**${facts.dailyBurnRate?.toLocaleString('vi-VN')}₫/ngày**.\n• **Dự kiến tổng chi hết tháng**: **${facts.projectedEndMonthSpent?.toLocaleString('vi-VN')}₫**.\n\n💡 ${INCOME_MISSING_INVITE}`,
          confidence: 0.9,
        },
      };
    }

    // 4. BUDGET_ADVICE
    if (lower.includes('ngân sách') || lower.includes('vượt') || lower.includes('hạn mức')) {
      const over = facts.overBudgetCategories || [];
      const hasCategoryLimits = Object.values(categoryLimits || {}).some((l) => Number(l) > 0);
      const isDeficit = hasIncome && facts.netSavingsThisMonth < 0;
      const isExhausted = hasIncome && facts.netSavingsThisMonth === 0;

      const statusLines: string[] = [];
      if (isDeficit) {
        statusLines.push(
          `• **Ngân sách tổng tháng**: Đã chi **${vnd(facts.totalSpentThisMonth)}** / thu nhập khai báo **${vnd(facts.income)}** (thâm hụt **${vnd(-facts.netSavingsThisMonth)}**).`
        );
      } else if (isExhausted) {
        statusLines.push(
          `• **Ngân sách tổng tháng**: Đã dùng hết thu nhập khai báo (**${vnd(facts.totalSpentThisMonth)} / ${vnd(facts.income)}**).`
        );
      } else if (!hasIncome) {
        statusLines.push(
          `• **Thu nhập tháng**: Chưa nhập — chưa thể đối chiếu tổng chi (**${vnd(facts.totalSpentThisMonth)}**) với thu nhập.`
        );
      }

      if (over.length > 0) {
        statusLines.push(
          ...over.map(
            (c: any) =>
              `• **${c.categoryName}**: Đã chi ${c.spent.toLocaleString('vi-VN')}₫ (vượt ${c.overAmount.toLocaleString('vi-VN')}₫)`
          )
        );
      } else if (!hasCategoryLimits) {
        statusLines.push(
          '• Chưa có danh mục nào được thiết lập hạn mức chi tiêu nên chưa thể kiểm tra vượt hạn mức theo danh mục.'
        );
      } else {
        statusLines.push('• Tất cả các danh mục có hạn mức đều đang nằm trong ngưỡng an toàn.');
      }

      let riskOrInsight: string;
      let recommendedAction: string;
      let replyAdvice: string;

      if (over.length > 0 && isDeficit) {
        riskOrInsight = `Đang thâm hụt ${vnd(-facts.netSavingsThisMonth)} so với thu nhập và có ${over.length} danh mục vượt hạn mức.`;
        recommendedAction = 'Tạm dừng các khoản chi không thiết yếu và cắt giảm chi tiêu ở các danh mục vượt hạn mức.';
        replyAdvice = `Bạn đã chi vượt thu nhập khai báo **${vnd(-facts.netSavingsThisMonth)}** và có ${over.length} danh mục vượt hạn mức. Hãy tạm dừng ngay các khoản chi không thiết yếu cho đến hết tháng.`;
      } else if (over.length > 0) {
        riskOrInsight = `${over.length} danh mục vượt ngân sách.`;
        recommendedAction = 'Cắt giảm chi tiêu các danh mục vượt hạn mức.';
        replyAdvice =
          'Hãy tạm dừng chi tiêu không thiết yếu trong các danh mục trên, hoặc chuyển bớt hạn mức từ các danh mục còn dư sang.';
      } else if (isDeficit) {
        riskOrInsight = `Chi tiêu đã vượt thu nhập khai báo ${vnd(-facts.netSavingsThisMonth)}${!hasCategoryLimits ? ' (chưa đặt hạn mức danh mục).' : '.'}`;
        recommendedAction = 'Tạm dừng các khoản chi không thiết yếu cho đến hết tháng để cân đối lại dòng tiền.';
        replyAdvice = `Tháng này bạn đã thâm hụt **${vnd(-facts.netSavingsThisMonth)}** (không còn phần dư). Hãy tạm dừng các khoản chi không thiết yếu cho đến hết tháng${!hasCategoryLimits ? ' và đặt hạn mức danh mục ở tab Ngân sách để kiểm soát sát hơn.' : '.'}`;
      } else if (isExhausted) {
        riskOrInsight = 'Đã dùng hết thu nhập khai báo tháng này, không còn phần dư.';
        recommendedAction = 'Tạm dừng các khoản chi không thiết yếu cho đến hết tháng để cân đối lại dòng tiền.';
        replyAdvice = 'Tháng này không còn phần dư. Hãy tạm dừng các khoản chi không thiết yếu cho đến hết tháng.';
      } else if (!hasIncome) {
        riskOrInsight = !hasCategoryLimits
          ? 'Chưa nhập thu nhập tháng và chưa đặt hạn mức danh mục nên chưa thể đánh giá ngân sách.'
          : 'Chưa nhập thu nhập tháng nên chưa thể đánh giá cân đối thu chi tổng thể.';
        recommendedAction = !hasCategoryLimits
          ? `${INCOME_MISSING_INVITE} Đồng thời thiết lập hạn mức cho các danh mục chi tiêu chính.`
          : INCOME_MISSING_INVITE;
        replyAdvice = !hasCategoryLimits
          ? `${INCOME_MISSING_INVITE} Bạn cũng có thể vào tab Ngân sách để thiết lập hạn mức cho từng danh mục.`
          : INCOME_MISSING_INVITE;
      } else if (!hasCategoryLimits) {
        riskOrInsight = `Thu chi đang có phần dư ${vnd(facts.netSavingsThisMonth)}, nhưng chưa thiết lập hạn mức cho từng danh mục.`;
        recommendedAction = 'Thiết lập hạn mức cho các danh mục chi tiêu chính để theo dõi sát hơn.';
        replyAdvice = `Thu chi tháng này vẫn đang dư **${vnd(facts.netSavingsThisMonth)}**, nhưng bạn chưa đặt hạn mức danh mục. Hãy vào tab Ngân sách để thiết lập hạn mức hoặc trích thêm 5-10% vào Quỹ Mục tiêu tích lũy.`;
      } else {
        riskOrInsight = 'Ngân sách đang ổn định.';
        recommendedAction = 'Tiếp tục duy trì kỷ luật.';
        replyAdvice = 'Kế hoạch tài chính tháng này đang vận hành rất tốt. Bạn có thể trích thêm 5-10% vào Quỹ Mục tiêu tích lũy.';
      }

      return {
        success: true,
        data: {
          intent: 'BUDGET_ADVICE',
          financialSummary: {
            currentStatus: !hasIncome
              ? `Chi tiêu: ${vnd(facts.totalSpentThisMonth)} (chưa nhập thu nhập tháng).`
              : isDeficit
              ? `Chi tiêu: ${vnd(facts.totalSpentThisMonth)} / thu nhập ${vnd(facts.income)}. Thâm hụt: ${vnd(-facts.netSavingsThisMonth)}.`
              : `Chi tiêu: ${vnd(facts.totalSpentThisMonth)}. ${balanceText('Tích lũy ròng', facts.netSavingsThisMonth)} (tỷ lệ ${facts.savingsRatePct}%).`,
            riskOrInsight,
            recommendedAction,
          },
          reply: `🛡️ **Báo cáo & Tư vấn Ngân sách:**\n\n${statusLines.join('\n')}\n\n💡 **"Vậy tôi nên làm gì?":**\n${replyAdvice}`,
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
          riskOrInsight: !hasIncome
            ? 'Chưa đánh giá tỷ lệ tiết kiệm.'
            : facts.netSavingsThisMonth < 0
            ? `Đang thâm hụt ${vnd(-facts.netSavingsThisMonth)} so với thu nhập khai báo.`
            : `Tỷ lệ tiết kiệm hiện tại: ${facts.savingsRatePct}%.`,
          recommendedAction: !hasIncome
            ? INCOME_MISSING_INVITE
            : facts.netSavingsThisMonth <= 0
            ? 'Tạm dừng các khoản chi không thiết yếu cho đến hết tháng.'
            : `${balanceText('Còn lại so với thu nhập khai báo', facts.netSavingsThisMonth)}.`,
        },
        reply: `📊 **Tổng quan tài chính tháng ${facts.month}/${facts.year}:**\n\n• **Tổng chi tiêu**: **${facts.totalSpentThisMonth?.toLocaleString('vi-VN')}₫** (${facts.transactionCountThisMonth} giao dịch).${hasIncome ? `\n• **Thu nhập khai báo**: **${facts.income?.toLocaleString('vi-VN')}₫**.\n• **${facts.netSavingsThisMonth < 0 ? 'Thâm hụt' : 'Tích lũy ròng'}**: **${vnd(facts.netSavingsThisMonth)}** (Tỷ lệ tiết kiệm: **${facts.savingsRatePct}%**).` : `\n\n💡 ${INCOME_MISSING_INVITE}`}\n\n💡 Bạn có thể hỏi Copilot: *"Tôi tiêu nhiều nhất vào đâu?"*, *"Dự báo dòng tiền cuối tháng"*, hoặc gõ *"Hôm qua ăn cơm 15k"* để ghi chép nhanh!`,
        confidence: 0.85,
      },
    };
  }
}

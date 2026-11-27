// Nhận diện ý định cho Copilot. Dùng chung client + server: không import DOM/React.
import { extractAllAmounts, parseMultipleTransactions, ParsedResult } from './parser';
import { parseVietnameseDate } from './dateParser';
import { CATEGORIES } from '../constants/categories';

export const INCOME_NOT_SUPPORTED_REPLY =
  'Mình chưa ghi được khoản thu nên không đề xuất khoản tiền vào thành khoản chi. Nếu thu nhập tháng thay đổi, bạn hãy cập nhật ở mục "Thu nhập tháng" trong Tổng quan.';

export const DELETE_CLARIFY_REPLY =
  'Mình chưa xác định được chính xác giao dịch bạn muốn xóa. Bạn hãy nói rõ ghi chú hoặc số tiền của khoản đó (ví dụ: "xóa khoản cafe 25k"), hoặc xóa trực tiếp trong danh sách giao dịch.';

export const UPDATE_CLARIFY_REPLY =
  'Mình chưa xác định được giao dịch bạn muốn sửa. Bạn hãy nói rõ ghi chú của khoản đó, hoặc sửa trực tiếp trong danh sách giao dịch.';

// \b của JS không hiểu chữ có dấu nên phải dùng ranh giới theo \p{L}
const word = (source: string, flags = 'iu') => new RegExp(`(?<![\\p{L}])(?:${source})(?![\\p{L}])`, flags);

const GIVER = '(?:(?:mẹ|bố|ba|má|ông|bà|anh|chị|em|sếp|bạn|công ty|cty|khách) ){0,2}';
const INCOME_ACCENTED = word(
  [
    '(?:nhận|lãnh|lĩnh)(?: được)?(?: tiền)? (?:lương|thưởng)',
    'lương(?: tháng(?: này| trước| \\d{1,2})?)?(?: đã)? về',
    `được ${GIVER}(?:thưởng(?! thức)|cho(?! nợ| phép)|tặng|biếu|lì xì)`,
    'thu nhập',
    'tiền lãi(?: tiết kiệm| gửi| ngân hàng)? nhận',
    'nhận(?: được)?(?: tiền)? lãi',
    'hoàn tiền(?! cho)',
    'bán được',
  ].join('|')
);

const GIVER_ASCII = '(?:(?:me|bo|ba|ma|ong|anh|chi|em|sep|ban|cong ty|cty|khach) ){0,2}';
// Chỉ áp dụng cho đoạn gõ hoàn toàn không dấu; danh sách hẹp vì không dấu dễ trùng nghĩa
const INCOME_ASCII = word(
  [
    '(?:nhan|lanh|linh)(?: duoc)?(?: tien)? (?:luong|thuong)',
    'luong(?: thang(?: nay| truoc| \\d{1,2})?)?(?: da)? ve',
    `duoc ${GIVER_ASCII}(?:thuong(?! thuc)|cho(?! no| phep)|tang|bieu|li xi)`,
    'thu nhap',
    'tien lai nhan',
    'nhan(?: duoc)?(?: tien)? lai(?! xe)',
    'hoan tien(?! cho)',
    '(?<=^(?:(?:hom nay|hom qua|moi|da|vua|minh|toi) )*)ban duoc',
  ].join('|')
);

// Động từ chi đứng TRƯỚC cụm thu thì cả đoạn là khoản chi ("mua quà được tặng", "ăn mừng nhận lương")
const SPEND_ACCENTED = word('mua|ăn|uống|đãi|khao|trả|chi|đóng|nộp|đổ|thuê|thanh toán|thuế|bảo hiểm');
const SPEND_ASCII = word('mua|an|uong|dai|khao|tra|chi|dong|nop|do|thue|thanh toan|bao hiem');

const QUESTION = /\?|bao nhiêu|bao nhieu|thế nào|the nao|làm sao|có nên|nên |dự báo|bao lâu/iu;
const EDIT_COMMAND = /^\s*(?:xóa|xoá|sửa|đổi|hủy|huỷ|bỏ)(?![\p{L}])/iu;

const SPLIT_CLAUSE =
  /(?:;|\n|\r|\+|(?<!\d),|,(?!\d)|\.(?=\s|$)|(?<![\p{L}])(?:và|rồi|xong|sau đó|còn|nhưng)(?![\p{L}]))/giu;

const MONEY_HINT = /\d|triệu|trieu|nghìn|nghin|ngàn|(?<![\p{L}])(?:tỷ|tỉ|củ)(?![\p{L}])/iu;

const isBareAmount = (clause: string): boolean => {
  const amounts = extractAllAmounts(clause);
  if (amounts.length === 0) return false;
  let rest = clause;
  for (const a of amounts) rest = rest.replace(a.raw, ' ');
  rest = rest
    .replace(/\d{1,2}\/\d{1,2}(?:\/\d{4})?/g, ' ')
    .replace(
      word('là|được|khoảng|tầm|hết|số tiền|tiền|vnd|đ|hôm nay|hôm qua|hôm kia|sáng nay|chiều nay|tối nay|vào|ngày', 'giu'),
      ' '
    );
  return !/\p{L}/u.test(rest);
};

/** Tách câu thành các đoạn, mỗi đoạn tối đa một số tiền; số tiền đứng riêng được ghép với cụm bên cạnh */
function splitSegments(text: string): string[] {
  const clauses = text.split(SPLIT_CLAUSE).map((s) => s.trim()).filter(Boolean);

  const merged: string[] = [];
  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const prev = merged[merged.length - 1];
    if (isBareAmount(clause) && prev !== undefined && !MONEY_HINT.test(prev)) {
      merged[merged.length - 1] = `${prev} ${clause}`;
    } else if (isBareAmount(clause) && clauses[i + 1] !== undefined && !MONEY_HINT.test(clauses[i + 1])) {
      merged.push(`${clause} ${clauses[++i]}`);
    } else {
      merged.push(clause);
    }
  }

  return merged.flatMap((segment) => {
    const amounts = extractAllAmounts(segment);
    if (amounts.length < 2) return [segment];
    return amounts.map((a, i) =>
      segment
        .slice(i === 0 ? 0 : amounts[i - 1].endIndex, i === amounts.length - 1 ? segment.length : a.endIndex)
        .trim()
    );
  });
}

const isIncomeClause = (segment: string): boolean => {
  const lower = segment.toLowerCase();
  const ascii = /^[\x00-\x7F]*$/.test(lower);
  const match = (ascii ? INCOME_ASCII : INCOME_ACCENTED).exec(lower);
  if (!match) return false;
  return !(ascii ? SPEND_ASCII : SPEND_ACCENTED).test(lower.slice(0, match.index));
};

export interface IncomeDetection {
  /** Các đoạn nói về tiền vào và có kèm số tiền */
  incomeSegments: string[];
  /** Các đoạn còn lại có kèm số tiền */
  expenseSegments: string[];
  /** Phần được phép đưa vào bộ tách khoản chi */
  expenseText: string;
}

export function detectIncomeSegments(text: string): IncomeDetection {
  const normalized = (text || '').normalize('NFC').trim();
  const incomeSegments: string[] = [];
  const expenseSegments: string[] = [];

  if (!EDIT_COMMAND.test(normalized)) {
    for (const segment of splitSegments(normalized)) {
      if (!MONEY_HINT.test(segment)) continue;
      (isIncomeClause(segment) ? incomeSegments : expenseSegments).push(segment);
    }
  }

  return { incomeSegments, expenseSegments, expenseText: expenseSegments.join(', ') };
}

/** Câu ghi nhận chỉ có tiền vào (không phải câu hỏi): trả lời ngay, không gọi AI */
export function isIncomeOnlyMessage(text: string): boolean {
  if (QUESTION.test(text)) return false;
  const { incomeSegments, expenseSegments } = detectIncomeSegments(text);
  return incomeSegments.length > 0 && expenseSegments.length === 0;
}

/** Khoản chi tách được từ phần không phải tiền vào; giữ ngày đã nói ở cả câu */
export function parseExpensePart(text: string, referenceDate: string): ParsedResult[] {
  const { expenseText } = detectIncomeSegments(text);
  const wholeDate = parseVietnameseDate(text, referenceDate);
  return parseMultipleTransactions(expenseText, referenceDate).map((item) =>
    item.dateType === 'DEFAULT' && wholeDate.matched
      ? {
          ...item,
          date: wholeDate.normalizedDate,
          dateType: 'INFERRED' as const,
          dateExpression: wholeDate.originalExpression,
          dateLabel: wholeDate.originalExpression,
        }
      : item
  );
}

interface GuardableAction {
  type: string;
  expense?: { amount: number };
}

/** Hậu kiểm: chỉ giữ action có số tiền khớp một đoạn chi (mỗi số tiền dùng một lần) */
export function keepExpenseActions<T extends GuardableAction>(text: string, actions: T[]): T[] {
  const { incomeSegments, expenseSegments } = detectIncomeSegments(text);
  if (incomeSegments.length === 0) return actions;

  const available = expenseSegments.flatMap((s) => extractAllAmounts(s).map((a) => a.value));
  return actions.filter((action) => {
    const index = available.indexOf(Number(action.expense?.amount));
    if (index === -1) return false;
    available.splice(index, 1);
    return true;
  });
}

export function buildMixedIncomeReply(actions: GuardableAction[]): string {
  const total = actions.reduce((sum, a) => sum + (a.expense?.amount || 0), 0);
  return `Tôi đã nhận diện **${actions.length} khoản chi** (Tổng: **${total.toLocaleString('vi-VN')}₫**). Bạn xác nhận để lưu vào sổ nhé.\n\n⚠️ Phần tiền vào trong câu chưa được ghi. ${INCOME_NOT_SUPPORTED_REPLY}`;
}

// ---------------------------------------------------------------------------
// Câu hỏi tổng chi theo danh mục
// ---------------------------------------------------------------------------

export interface CategoryQuery {
  categoryId: string;
  /** 0 = tháng này, -1 = tháng trước; bỏ qua khi có monthNumber */
  monthOffset: number;
  monthNumber?: number;
  year?: number;
}

const CATEGORY_PHRASES: Record<string, string> = {
  an_uong: 'ăn uống|an uong|đồ ăn|tiền ăn|ăn hết|cho ăn',
  di_chuyen: 'di chuyển|di chuyen|đi lại',
  mua_sam: 'mua sắm|mua sam',
  giai_tri: 'giải trí|giai tri',
  hoa_don: 'hóa đơn|hoá đơn|hoa don',
  suc_khoe: 'sức khỏe|sức khoẻ|suc khoe|y tế',
  giao_duc: 'giáo dục|giao duc',
  khac: 'chi tiêu khác|khoản khác|danh mục khác',
};

const TOTAL_ASK = word('bao nhiêu|bao nhieu|mấy tiền|tổng|tong|hết|het|chi cho');
const NOT_TOTAL_ASK = /dự báo|làm sao|thế nào|nên |tuần|hôm nay|hôm qua|năm nay|năm ngoái|trung bình|mỗi ngày/iu;

export function detectCategoryQuery(text: string): CategoryQuery | null {
  const lower = (text || '').normalize('NFC').toLowerCase().trim();
  // Có số tiền nghĩa là đang ghi khoản chi ("ăn phở hết 45k")
  if (!TOTAL_ASK.test(lower) || NOT_TOTAL_ASK.test(lower) || EDIT_COMMAND.test(lower)) return null;
  if (extractAllAmounts(lower).length > 0) return null;

  const found = Object.keys(CATEGORY_PHRASES).filter((id) => word(CATEGORY_PHRASES[id]).test(lower));
  if (found.length !== 1) return null;

  const explicit = lower.match(/(?:tháng|thang) (\d{1,2})(?:\s*(?:\/|năm )\s*(\d{4}))?/u);
  if (explicit) {
    const monthNumber = Number(explicit[1]);
    if (monthNumber < 1 || monthNumber > 12) return null;
    return {
      categoryId: found[0],
      monthOffset: 0,
      monthNumber,
      year: explicit[2] ? Number(explicit[2]) : undefined,
    };
  }

  return { categoryId: found[0], monthOffset: /(?:tháng|thang) (?:trước|truoc|rồi)/u.test(lower) ? -1 : 0 };
}

export function answerCategoryQuery(
  query: CategoryQuery,
  expenses: { amount: number; categoryId: string; date: string }[],
  categoryLimits: Record<string, number>,
  currentDate: string
): string {
  const [currentYear, currentMonth] = currentDate.split('-').map(Number);
  let year = currentYear;
  let month = currentMonth + query.monthOffset;
  if (query.monthNumber) {
    month = query.monthNumber;
    year = query.year ?? (month > currentMonth ? currentYear - 1 : currentYear);
  } else if (month < 1) {
    month += 12;
    year -= 1;
  }
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const matched = expenses.filter((e) => e.categoryId === query.categoryId && e.date?.startsWith(monthKey));
  const total = matched.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const name = CATEGORIES.find((c) => c.id === query.categoryId)?.name || query.categoryId;
  const limit = categoryLimits[query.categoryId] || 0;
  const vnd = (n: number) => `${n.toLocaleString('vi-VN')}₫`;

  let reply = `📊 **${name} tháng ${month}/${year}:** **${vnd(total)}** (${matched.length} giao dịch).`;
  if (limit > 0) {
    reply +=
      total > limit
        ? `\n• Hạn mức: **${vnd(limit)}** — đã vượt **${vnd(total - limit)}**.`
        : `\n• Hạn mức: **${vnd(limit)}** — còn lại **${vnd(limit - total)}**.`;
  }
  return reply;
}

// ---------------------------------------------------------------------------
// Tìm giao dịch cần xóa
// ---------------------------------------------------------------------------

interface DeletableExpense {
  id: string;
  amount: number;
  note?: string;
  date: string;
}

const DELETE_FILLER = word(
  'xóa|xoá|hủy bỏ|huỷ bỏ|bỏ|hủy|khoản|giao dịch|chi tiêu|chi|tiền|giúp|mình|tôi|hộ|cho|vừa ghi|vừa rồi|vừa nhập|mới nhất|mới ghi|gần nhất|cuối cùng|đi|cái|nhé|với|ngày|số',
  'giu'
);

const containsPhrase = (haystack: string, needle: string): boolean =>
  needle.length >= 2 && word(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(haystack);

/** Chỉ trả về giao dịch khi ghi chú hoặc số tiền khớp đúng MỘT khoản; không đoán */
export function findDeleteTarget<T extends DeletableExpense>(
  text: string,
  expenses: T[],
  referenceDate: string
): T | null {
  const lower = (text || '').normalize('NFC').toLowerCase().trim();
  const amounts = extractAllAmounts(lower);
  const date = parseVietnameseDate(lower, referenceDate);

  let query = lower;
  for (const a of amounts) query = query.replace(a.raw, ' ');
  if (date.matched) query = query.replace(date.originalExpression, ' ');
  query = query.replace(DELETE_FILLER, ' ').replace(/\s+/g, ' ').trim();

  const noteMatches = (e: T) => {
    const note = (e.note || '').normalize('NFC').toLowerCase().trim();
    return containsPhrase(note, query) || containsPhrase(lower, note);
  };
  const narrow = (list: T[], test: (e: T) => boolean) => {
    const next = list.filter(test);
    return next.length > 0 ? next : list;
  };

  let candidates = amounts.length > 0 ? expenses.filter((e) => e.amount === amounts[0].value) : expenses.filter(noteMatches);
  if (candidates.length > 1) candidates = narrow(candidates, noteMatches);
  if (date.matched) {
    candidates =
      candidates.length > 1
        ? narrow(candidates, (e) => e.date === date.normalizedDate)
        : candidates.filter((e) => e.date === date.normalizedDate);
  }

  return candidates.length === 1 ? candidates[0] : null;
}

export const isDeleteRequest = (text: string): boolean => /xóa|xoá|hủy bỏ|huỷ bỏ|bỏ khoản/iu.test(text.normalize('NFC'));

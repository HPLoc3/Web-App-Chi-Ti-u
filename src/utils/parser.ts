import { CATEGORIES } from '../constants/categories';
import { parseVietnameseDate, DateConfidenceType, DateParseResult } from './dateParser';

export interface ParsedResult {
  amount: number;
  categoryId: string;
  categoryName: string;
  date: string; // YYYY-MM-DD
  dateLabel: string;
  dateType: DateConfidenceType;
  dateExpression: string;
  confidence: number;
  note: string;
  success: boolean;
  message: string;
}

export interface ExtractedAmount {
  raw: string;
  value: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Robust regex to extract all Vietnamese amounts in text using matchAll
 * Supports: 15k, 25 nghìn, 120000, 120.000, 350k, 1.5 triệu, 2 triệu, 500đ, etc.
 */
export function extractAllAmounts(text: string): ExtractedAmount[] {
  if (!text || typeof text !== 'string') return [];

  // Match expressions:
  // 1. Millions: 1.5 triệu, 2 tr, 1,5trieu
  // 2. Thousands with unit: 15k, 25 nghìn, 25 ngàn, 25nghin, 25ngan
  // 3. Thousands formatted with dot/comma: 120.000, 1,200,000, 50.000đ
  // 4. Numbers with currency: 50000đ, 50000 đồng, 50000 vnd
  // 5. Plain numbers >= 1000: 120000, 15000 (excluding dates like 2026/08/15)
  const masterRegex =
    /(?:(\d+(?:[.,]\d+)?)\s*(triệu|trieu|tr)\b)|(?:(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|nghin|ngan)\b)|(?:(\d{1,3}(?:[.,]\d{3})+)\s*(?:đ|đồng|dong|d|vnd)?\b)|(?:(\d+)\s*(?:đ|đồng|dong|d|vnd)\b)|(?:(?<![\d/.-])(\d{4,10})(?![\d/.-]))/gi;

  const matches: ExtractedAmount[] = [];
  const allMatches = Array.from(text.matchAll(masterRegex));

  for (const match of allMatches) {
    if (match.index === undefined) continue;

    const rawMatch = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + rawMatch.length;

    // Check if this match is part of a date like 15/08 or 2026-08
    const beforeChar = startIndex > 0 ? text[startIndex - 1] : '';
    const afterChar = endIndex < text.length ? text[endIndex] : '';
    if ((beforeChar === '/' || beforeChar === '-') && (afterChar === '/' || afterChar === '-')) {
      continue;
    }

    let value = 0;

    // Group 1 & 2: Millions
    if (match[1] && match[2]) {
      const numStr = match[1].replace(/,/g, '.');
      const val = parseFloat(numStr);
      if (!isNaN(val) && val > 0) {
        value = Math.round(val * 1000000);
      }
    }
    // Group 3 & 4: Thousands with unit (k, nghìn, ngàn)
    else if (match[3] && match[4]) {
      const numStr = match[3].replace(/,/g, '.');
      const val = parseFloat(numStr);
      if (!isNaN(val) && val > 0) {
        value = Math.round(val * 1000);
      }
    }
    // Group 5: Formatted with dots/commas (e.g. 120.000, 1.500.000)
    else if (match[5]) {
      const stripped = match[5].replace(/[.,]/g, '');
      const val = parseFloat(stripped);
      if (!isNaN(val) && val > 0) {
        value = Math.round(val);
      }
    }
    // Group 6: With đ / đồng / vnd
    else if (match[6]) {
      const val = parseFloat(match[6]);
      if (!isNaN(val) && val > 0) {
        value = Math.round(val);
      }
    }
    // Group 7: Bare number >= 1000
    else if (match[7]) {
      const val = parseFloat(match[7]);
      // Exclude 4-digit years like 2024..2030 if preceded by 'năm' or 'tháng'
      const prefix = text.slice(Math.max(0, startIndex - 8), startIndex).toLowerCase();
      const isYear = (val >= 2020 && val <= 2035) && (prefix.includes('năm') || prefix.includes('/'));
      if (!isYear && !isNaN(val) && val > 0) {
        value = Math.round(val);
      }
    }

    if (value > 0) {
      matches.push({
        raw: rawMatch,
        value,
        startIndex,
        endIndex,
      });
    }
  }

  return matches;
}

/**
 * Classifies category based on text content with keyword scoring and domain priority
 */
function classifyCategory(segmentText: string): { id: string; name: string } {
  const lowerText = segmentText.toLowerCase();
  let bestCatId = 'khac';
  let maxScore = 0;

  // Domain specific priority keywords to ensure clean separation (e.g. sách -> giáo dục, sữa/cafe -> ăn uống)
  const HIGH_PRIORITY_KEYWORDS: Record<string, { catId: string; weight: number }> = {
    'sách': { catId: 'giao_duc', weight: 15 },
    'giáo trình': { catId: 'giao_duc', weight: 15 },
    'khóa học': { catId: 'giao_duc', weight: 15 },
    'học phí': { catId: 'giao_duc', weight: 15 },
    'học': { catId: 'giao_duc', weight: 10 },
    'sữa': { catId: 'an_uong', weight: 15 },
    'cafe': { catId: 'an_uong', weight: 15 },
    'cà phê': { catId: 'an_uong', weight: 15 },
    'cơm': { catId: 'an_uong', weight: 15 },
    'phở': { catId: 'an_uong', weight: 15 },
    'bún': { catId: 'an_uong', weight: 15 },
    'bánh mì': { catId: 'an_uong', weight: 15 },
    'ăn sáng': { catId: 'an_uong', weight: 18 },
    'ăn trưa': { catId: 'an_uong', weight: 18 },
    'ăn tối': { catId: 'an_uong', weight: 18 },
    'ăn vặt': { catId: 'an_uong', weight: 18 },
    'xăng': { catId: 'di_chuyen', weight: 15 },
    'đổ xăng': { catId: 'di_chuyen', weight: 20 },
    'grab': { catId: 'di_chuyen', weight: 18 },
    'be': { catId: 'di_chuyen', weight: 10 },
    'taxi': { catId: 'di_chuyen', weight: 15 },
    'gửi xe': { catId: 'di_chuyen', weight: 18 },
    'áo': { catId: 'mua_sam', weight: 15 },
    'quần': { catId: 'mua_sam', weight: 15 },
    'giày': { catId: 'mua_sam', weight: 15 },
    'dép': { catId: 'mua_sam', weight: 15 },
    'mũ': { catId: 'mua_sam', weight: 15 },
    'mỹ phẩm': { catId: 'mua_sam', weight: 18 },
    'shopee': { catId: 'mua_sam', weight: 15 },
    'thuốc': { catId: 'suc_khoe', weight: 18 },
    'khám': { catId: 'suc_khoe', weight: 18 },
    'bệnh viện': { catId: 'suc_khoe', weight: 18 },
    'nha khoa': { catId: 'suc_khoe', weight: 18 },
    'gym': { catId: 'suc_khoe', weight: 18 },
    'tiền nhà': { catId: 'hoa_don', weight: 20 },
    'tiền điện': { catId: 'hoa_don', weight: 20 },
    'tiền nước': { catId: 'hoa_don', weight: 20 },
    'internet': { catId: 'hoa_don', weight: 18 },
    'wifi': { catId: 'hoa_don', weight: 18 },
    'hóa đơn': { catId: 'hoa_don', weight: 18 },
    'xem phim': { catId: 'giai_tri', weight: 18 },
    'vé xem phim': { catId: 'giai_tri', weight: 20 },
    'karaoke': { catId: 'giai_tri', weight: 18 },
    'game': { catId: 'giai_tri', weight: 15 },
    'du lịch': { catId: 'giai_tri', weight: 18 },
  };

  for (const [kw, meta] of Object.entries(HIGH_PRIORITY_KEYWORDS)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'iu');
    if (regex.test(lowerText) || lowerText.includes(kw)) {
      if (meta.weight > maxScore) {
        maxScore = meta.weight;
        bestCatId = meta.catId;
      }
    }
  }

  // General category scoring
  for (const cat of CATEGORIES) {
    let score = 0;
    for (const keyword of cat.keywords) {
      if (keyword === 'mua' || keyword === 'sắm' || keyword === 'tiền') {
        // generic verbs have low standalone weight
        continue;
      }
      if (lowerText.includes(keyword)) {
        score += keyword.length;
        const regex = new RegExp(`\\b${keyword}\\b`, 'iu');
        if (regex.test(lowerText)) {
          score += 6;
        }
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestCatId = cat.id;
    }
  }

  const matchedCategory = CATEGORIES.find((c) => c.id === bestCatId) || CATEGORIES[CATEGORIES.length - 1];
  return { id: matchedCategory.id, name: matchedCategory.name };
}

/**
 * Extracts and cleans the note for a single transaction segment
 */
function cleanSegmentNote(
  segmentText: string,
  rawAmount: string,
  categoryName: string
): string {
  let note = segmentText;

  // Remove the raw amount string
  if (rawAmount) {
    note = note.replace(rawAmount, ' ');
  }

  // Remove date words
  note = note.replace(
    /\b(hôm nay|hôm qua|hôm kia|ngày mai|ngày mốt|sáng nay|trưa nay|chiều nay|tối nay|sáng qua|tối qua|thứ \d|chủ nhật|tuần trước|tuần rồi|vừa rồi)\b/gi,
    ' '
  );

  // Remove connector and filler words
  note = note
    .replace(/\b(hết|mất|khoảng|khoản|tầm|giá|là|và|rồi|sau đó|với|còn|kế tiếp|tiếp theo|được|bị|cho|vào|tiền)\b/gi, ' ')
    .replace(/[-_:+;,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (note.length > 0) {
    return note.charAt(0).toUpperCase() + note.slice(1);
  }

  return categoryName;
}

/**
 * Parses multiple transactions from a single input string.
 * Supports delimiters (comma, semicolon, newline) and connectors (và, rồi, sau đó, với, còn).
 */
export function parseMultipleTransactions(
  text: string,
  referenceDate?: string | Date | null
): ParsedResult[] {
  const cleanedText = text.trim();
  if (!cleanedText) {
    return [];
  }

  // 1. Extract all amounts and their positions
  const extractedAmounts = extractAllAmounts(cleanedText);
  if (extractedAmounts.length === 0) {
    return [];
  }

  // 2. Parse global date context from the full text
  const globalDateResult = parseVietnameseDate(cleanedText, referenceDate);
  let activeDateResult: DateParseResult = globalDateResult;

  // 3. Segment the text into individual transaction clauses
  const results: ParsedResult[] = [];

  if (extractedAmounts.length === 1) {
    // Single transaction flow
    const amountItem = extractedAmounts[0];
    const segText = cleanedText;
    const cat = classifyCategory(segText);
    const note = cleanSegmentNote(segText, amountItem.raw, cat.name);
    const confidence = globalDateResult.matched
      ? Math.min(globalDateResult.confidence, 0.98)
      : 0.95;

    results.push({
      amount: amountItem.value,
      categoryId: cat.id,
      categoryName: cat.name,
      date: globalDateResult.normalizedDate,
      dateLabel: globalDateResult.originalExpression || 'hôm nay',
      dateType: globalDateResult.dateType,
      dateExpression: globalDateResult.originalExpression,
      confidence,
      note,
      success: true,
      message: `Đã nhận diện: ${note} — ${amountItem.value.toLocaleString('vi-VN')}₫ (${cat.name}) vào ngày ${globalDateResult.normalizedDate}.`,
    });

    return results;
  }

  // Multiple transactions flow: determine clause boundaries
  const boundaries: number[] = [0];

  for (let i = 0; i < extractedAmounts.length - 1; i++) {
    const currentEnd = extractedAmounts[i].endIndex;
    const nextStart = extractedAmounts[i + 1].startIndex;
    const interim = cleanedText.slice(currentEnd, nextStart);

    // Look for explicit connectors: punctuation or conjunctions
    const connectorMatch = interim.match(/([,;\n\r+]|\s+(?:và|rồi|sau\s+đó|với|còn|kế\s+tiếp|tiếp\s+theo)\s+)/i);

    let splitIndex = currentEnd;
    if (connectorMatch && connectorMatch.index !== undefined) {
      splitIndex = currentEnd + connectorMatch.index + connectorMatch[0].length;
    } else {
      // If no explicit connector, split at boundary
      splitIndex = currentEnd;
    }

    boundaries.push(splitIndex);
  }

  boundaries.push(cleanedText.length);

  // Process each segment
  for (let i = 0; i < extractedAmounts.length; i++) {
    const amountItem = extractedAmounts[i];
    const segStart = boundaries[i];
    const segEnd = boundaries[i + 1];
    const rawSegText = cleanedText.slice(segStart, segEnd).trim();

    // Check if this segment contains an explicit date
    const segDateResult = parseVietnameseDate(rawSegText, referenceDate);

    let segDate: string;
    let segDateLabel: string;
    let segDateType: DateConfidenceType;
    let segDateExpr: string;

    if (segDateResult.matched) {
      segDate = segDateResult.normalizedDate;
      segDateLabel = segDateResult.originalExpression || 'hôm nay';
      segDateType = segDateResult.dateType;
      segDateExpr = segDateResult.originalExpression;
      activeDateResult = segDateResult; // Update active date for subsequent segments
    } else {
      // Inherit active date from previous clause or global context
      segDate = activeDateResult.normalizedDate;
      segDateLabel = activeDateResult.originalExpression || 'hôm nay';
      segDateType = activeDateResult.matched ? 'INFERRED' : activeDateResult.dateType;
      segDateExpr = activeDateResult.originalExpression;
    }

    const cat = classifyCategory(rawSegText);
    const note = cleanSegmentNote(rawSegText, amountItem.raw, cat.name);
    const confidence = segDateResult.matched
      ? Math.min(segDateResult.confidence, 0.98)
      : activeDateResult.matched
      ? 0.95
      : 0.92;

    results.push({
      amount: amountItem.value,
      categoryId: cat.id,
      categoryName: cat.name,
      date: segDate,
      dateLabel: segDateLabel,
      dateType: segDateType,
      dateExpression: segDateExpr,
      confidence,
      note,
      success: true,
      message: `Đã nhận diện: ${note} — ${amountItem.value.toLocaleString('vi-VN')}₫ (${cat.name}) vào ngày ${segDate}.`,
    });
  }

  return results;
}

/**
 * Backward compatible single-transaction parser.
 * Returns the first transaction result if available, or a failure result.
 */
export function parseTransactionText(
  text: string,
  referenceDate?: string | Date | null
): ParsedResult {
  const multiResults = parseMultipleTransactions(text, referenceDate);
  if (multiResults.length > 0) {
    return multiResults[0];
  }

  const globalDateResult = parseVietnameseDate(text, referenceDate);
  return {
    amount: 0,
    categoryId: 'khac',
    categoryName: 'Khác',
    date: globalDateResult.normalizedDate,
    dateLabel: globalDateResult.originalExpression || 'hôm nay',
    dateType: globalDateResult.dateType,
    dateExpression: globalDateResult.originalExpression,
    confidence: 0,
    note: '',
    success: false,
    message: 'Không nhận diện được số tiền hợp lệ.',
  };
}

export function parseNaturalExpense(text: string, referenceDate?: string | Date | null) {
  const result = parseTransactionText(text, referenceDate);
  return {
    amount: result.amount,
    categoryId: result.categoryId,
    categoryName: result.categoryName,
    date: result.date,
    dateType: result.dateType,
    dateExpression: result.dateExpression,
    note: result.note,
    confidence: result.success ? result.confidence : 0.3,
  };
}


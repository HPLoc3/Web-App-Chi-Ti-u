import { CATEGORIES } from '../constants/categories';
import { parseVietnameseDate, DateConfidenceType } from './dateParser';

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

export function parseTransactionText(
  text: string,
  referenceDate?: string | Date | null
): ParsedResult {
  const cleanedText = text.trim();
  if (!cleanedText) {
    return {
      amount: 0,
      categoryId: 'khac',
      categoryName: 'Khác',
      date: '',
      dateLabel: '',
      dateType: 'DEFAULT',
      dateExpression: '',
      confidence: 0,
      note: '',
      success: false,
      message: 'Vui lòng nhập nội dung chi tiêu.',
    };
  }

  // 1. EXTRACT DATE WITH DETERMINISTIC ENGINE
  const dateResult = parseVietnameseDate(cleanedText, referenceDate);
  const textWithoutDate = dateResult.cleanedText || cleanedText;
  const lowerText = textWithoutDate.toLowerCase();

  // 2. EXTRACT AMOUNT
  const amountRegex = /(\d+(?:[\d.,\s]*\d)?)\s*(k|nghìn|ngàn|triệu|tr|đ|đồng|d|vnd)?\b/iu;
  const amountMatch = lowerText.match(amountRegex);

  let amount = 0;
  let rawNumberText = '';
  let rawUnitText = '';

  if (amountMatch) {
    rawNumberText = amountMatch[1];
    rawUnitText = amountMatch[2] ? amountMatch[2].toLowerCase() : '';

    let numStr = rawNumberText.replace(/\s/g, '');

    if (rawUnitText === 'k' || rawUnitText === 'nghìn' || rawUnitText === 'ngàn') {
      numStr = numStr.replace(/,/g, '.');
      const val = parseFloat(numStr);
      if (!isNaN(val)) {
        amount = val * 1000;
      }
    } else if (rawUnitText === 'triệu' || rawUnitText === 'tr') {
      numStr = numStr.replace(/,/g, '.');
      const val = parseFloat(numStr);
      if (!isNaN(val)) {
        amount = val * 1000000;
      }
    } else {
      const strippedNumStr = numStr.replace(/[.,]/g, '');
      const val = parseFloat(strippedNumStr);
      if (!isNaN(val)) {
        amount = val;
        if (amount < 1000 && amount > 0 && !rawUnitText) {
          amount = amount * 1000;
        }
      }
    }
  }

  if (amount <= 0) {
    return {
      amount: 0,
      categoryId: 'khac',
      categoryName: 'Khác',
      date: dateResult.normalizedDate,
      dateLabel: dateResult.originalExpression || 'hôm nay',
      dateType: dateResult.dateType,
      dateExpression: dateResult.originalExpression,
      confidence: 0,
      note: '',
      success: false,
      message: 'Không nhận diện được số tiền hợp lệ.',
    };
  }

  // 3. DETECT CATEGORY
  let categoryId = 'khac';
  let maxScore = 0;

  for (const cat of CATEGORIES) {
    let score = 0;
    for (const keyword of cat.keywords) {
      if (lowerText.includes(keyword)) {
        score += keyword.length;
        const regex = new RegExp(`\\b${keyword}\\b`, 'iu');
        if (regex.test(lowerText)) {
          score += 5;
        }
      }
    }
    if (score > maxScore) {
      maxScore = score;
      categoryId = cat.id;
    }
  }

  const matchedCategory = CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];

  // 4. EXTRACT NOTE
  let rawNote = textWithoutDate;

  if (amountMatch && amountMatch[0]) {
    rawNote = rawNote.replace(amountMatch[0], '');
  }

  rawNote = rawNote
    .replace(/\b(hết|mất|khoảng|khoản|tầm|hôm nay|hôm qua|hôm kia|ngày mai|ngày mốt)\b/gi, '')
    .replace(/[-_:+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let note = rawNote;
  if (note) {
    note = note.charAt(0).toUpperCase() + note.slice(1);
  } else {
    note = matchedCategory.name;
  }

  const overallConfidence = dateResult.matched
    ? Math.min(dateResult.confidence, 0.98)
    : 0.95;

  return {
    amount,
    categoryId: matchedCategory.id,
    categoryName: matchedCategory.name,
    date: dateResult.normalizedDate,
    dateLabel: dateResult.originalExpression || 'hôm nay',
    dateType: dateResult.dateType,
    dateExpression: dateResult.originalExpression,
    confidence: overallConfidence,
    note,
    success: true,
    message: `Đã nhận diện: ${matchedCategory.name} — ${amount.toLocaleString('vi-VN')}₫ vào ngày ${dateResult.normalizedDate}.`,
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

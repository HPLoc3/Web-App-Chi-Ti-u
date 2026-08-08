import { Expense } from '../types';
import { CATEGORIES } from '../constants/categories';

interface ParsedResult {
  amount: number;
  categoryId: string;
  categoryName: string;
  date: string; // YYYY-MM-DD
  dateLabel: string;
  note: string;
  success: boolean;
  message: string;
}

export function parseTransactionText(text: string): ParsedResult {
  const cleanedText = text.trim();
  if (!cleanedText) {
    return {
      amount: 0,
      categoryId: 'khac',
      categoryName: 'Khác',
      date: '',
      dateLabel: '',
      note: '',
      success: false,
      message: 'Vui lòng nhập nội dung chi tiêu.',
    };
  }

  const lowerText = cleanedText.toLowerCase();

  // 1. EXTRACT AMOUNT
  const amountRegex = /(\d+(?:[\d.,\s]*\d)?)\s*(k|nghìn|ngàn|triệu|tr|đ|đồng|d)?\b/iu;
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
      date: '',
      dateLabel: '',
      note: '',
      success: false,
      message: 'Không nhận diện được số tiền hợp lệ.',
    };
  }

  // 2. DETECT CATEGORY
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

  const matchedCategory = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];

  // 3. DETECT DATE
  const today = new Date();
  let targetDate = today;
  let dateLabel = 'hôm nay';

  if (lowerText.includes('hôm qua')) {
    targetDate = new Date(Date.now() - 86400000);
    dateLabel = 'hôm qua';
  } else if (lowerText.includes('hôm kia')) {
    targetDate = new Date(Date.now() - 2 * 86400000);
    dateLabel = 'hôm kia';
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // 4. EXTRACT NOTE
  let rawNote = cleanedText;

  if (amountMatch && amountMatch[0]) {
    rawNote = rawNote.replace(amountMatch[0], '');
  }

  rawNote = rawNote
    .replace(/hôm qua/gi, '')
    .replace(/hôm kia/gi, '')
    .replace(/hôm nay/gi, '');

  rawNote = rawNote
    .replace(/\b(hết|mất|khoảng|khoản|tầm)\b/gi, '')
    .replace(/[-_:+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let note = rawNote;
  if (note) {
    note = note.charAt(0).toUpperCase() + note.slice(1);
  } else {
    note = matchedCategory.name;
  }

  return {
    amount,
    categoryId: matchedCategory.id,
    categoryName: matchedCategory.name,
    date: dateStr,
    dateLabel,
    note,
    success: true,
    message: `Đã ghi: ${matchedCategory.name} — ${amount.toLocaleString('vi-VN')}₫.`,
  };
}

export function parseNaturalExpense(text: string) {
  const result = parseTransactionText(text);
  return {
    amount: result.amount,
    categoryId: result.categoryId,
    date: result.date || new Date().toISOString().slice(0, 10),
    note: result.note,
    confidence: result.success ? 0.9 : 0.3
  };
}

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
  // Regex matches:
  // - Group 1: Number with optional dots/commas (e.g. 30, 1.5, 120.000, 150,000)
  // - Group 2: Unit suffix (k, nghìn, ngàn, triệu, tr, đ, đồng)
  const amountRegex = /(\d+(?:[\d.,\s]*\d)?)\s*(k|nghìn|ngàn|triệu|tr|đ|đồng|d)?\b/iu;
  const amountMatch = lowerText.match(amountRegex);

  let amount = 0;
  let rawNumberText = '';
  let rawUnitText = '';

  if (amountMatch) {
    rawNumberText = amountMatch[1];
    rawUnitText = amountMatch[2] ? amountMatch[2].toLowerCase() : '';

    // Clean number string
    let numStr = rawNumberText.replace(/\s/g, ''); // remove internal spaces if any

    if (rawUnitText === 'k' || rawUnitText === 'nghìn' || rawUnitText === 'ngàn') {
      // It's thousands. Replace comma with dot for float parsing, e.g. "30,5k" -> 30.5
      numStr = numStr.replace(/,/g, '.');
      const val = parseFloat(numStr);
      if (!isNaN(val)) {
        amount = val * 1000;
      }
    } else if (rawUnitText === 'triệu' || rawUnitText === 'tr') {
      // It's millions. Replace comma with dot for float parsing, e.g. "1,5tr" -> 1.5
      numStr = numStr.replace(/,/g, '.');
      const val = parseFloat(numStr);
      if (!isNaN(val)) {
        amount = val * 1000000;
      }
    } else {
      // No standard multiplier unit (could be "đ", "đồng", or empty)
      // For Vietnamese currency without k/triệu, dots or commas are thousands separators.
      // E.g. "120.000" or "120,000" -> we strip them to get 120000.
      const strippedNumStr = numStr.replace(/[.,]/g, '');
      const val = parseFloat(strippedNumStr);
      if (!isNaN(val)) {
        amount = val;
        // Rule: if no unit and amount < 1000, default is multiplied by 1000
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
      message: 'Không nhận diện được số tiền hợp lệ. Ví dụ gõ: "ăn sáng 30k" hoặc "đổ xăng 50 nghìn hôm qua".',
    };
  }

  // 2. DETECT CATEGORY
  let categoryId = 'khac';
  let maxScore = 0;

  for (const cat of CATEGORIES) {
    let score = 0;
    for (const keyword of cat.keywords) {
      // Check if keyword exists in the text
      // We look for keyword matches. If word boundaries or exact matches, give higher weighting.
      if (lowerText.includes(keyword)) {
        // Simple heuristic: length of keyword as score to favor longer, more specific keywords
        score += keyword.length;
        
        // Bonus for word boundaries (e.g. avoiding "xăng" matching inside some random word, although less common in VNese)
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
  // Remove amount match and date indicator words from original string to extract clean note
  let rawNote = cleanedText;

  if (amountMatch && amountMatch[0]) {
    rawNote = rawNote.replace(amountMatch[0], '');
  }

  // Remove date terms
  rawNote = rawNote
    .replace(/hôm qua/gi, '')
    .replace(/hôm kia/gi, '')
    .replace(/hôm nay/gi, '');

  // Clean special separator chars often typed by users like "hết", "khoảng", "khoản", "-", ":"
  rawNote = rawNote
    .replace(/\b(hết|mất|khoảng|khoản|tầm)\b/gi, '')
    .replace(/[-_:+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter of note
  let note = rawNote;
  if (note) {
    note = note.charAt(0).toUpperCase() + note.slice(1);
  } else {
    // If empty after cleaning, use category name
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
    message: `Đã ghi: ${matchedCategory.name} — ${amount.toLocaleString('vi-VN')}₫, ${dateLabel}.`,
  };
}

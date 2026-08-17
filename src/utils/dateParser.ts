/**
 * Natural Language Date Normalization Engine for Vietnamese Financial Assistant
 * 
 * Supports deterministic parsing of:
 * - Relative days: hôm nay, hôm qua, hôm kia, ngày mai, ngày mốt, X ngày trước, X ngày nữa...
 * - Time of day: sáng nay, trưa nay, chiều qua, tối qua, sáng hôm qua, tối hôm kia...
 * - Days of week: thứ 2, thứ ba, thứ tư, thứ năm, thứ sáu, thứ 7, chủ nhật
 * - Week modifiers: tuần trước, tuần rồi, vừa rồi, tuần này, tuần sau, tuần tới
 * - Specific dates: 15/08/2026, 15-08-2026, 15/08, 15-08, 15 tháng 8, ngày 10 tháng 8...
 * - Safe business timezone conversions (Asia/Ho_Chi_Minh)
 */

export const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';

export type DateConfidenceType = 'EXACT' | 'RELATIVE' | 'INFERRED' | 'DEFAULT';

export interface DateParseResult {
  normalizedDate: string; // "YYYY-MM-DD"
  dateType: DateConfidenceType;
  originalExpression: string;
  confidence: number;
  cleanedText: string;
  explanation?: string;
  matched: boolean;
}

/**
 * Get current business date as "YYYY-MM-DD" in the specified timezone
 */
export function getBusinessDate(
  refDate?: Date | string | number | null,
  timeZone: string = BUSINESS_TIMEZONE
): string {
  let d: Date;
  if (!refDate) {
    d = new Date();
  } else if (typeof refDate === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(refDate.trim())) {
      return refDate.trim();
    }
    d = new Date(refDate);
  } else if (typeof refDate === 'number') {
    d = new Date(refDate);
  } else {
    d = refDate;
  }

  if (isNaN(d.getTime())) {
    d = new Date();
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Parse a "YYYY-MM-DD" date string into a Date object anchored safely at UTC Noon (12:00:00Z)
 * This prevents timezone offsets (+/- 12 hours) from shifting the date across midnight.
 */
export function parseBusinessDate(
  dateStr: string,
  _timeZone: string = BUSINESS_TIMEZONE
): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date();
  }

  const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Format a date string or Date object into "YYYY-MM-DD" or "DD/MM/YYYY"
 */
export function formatBusinessDate(
  date: Date | string,
  format: 'YYYY-MM-DD' | 'DD/MM/YYYY' = 'YYYY-MM-DD'
): string {
  if (typeof date === 'string') {
    const match = date.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return format === 'DD/MM/YYYY' ? `${day}/${month}/${year}` : `${year}-${month}-${day}`;
    }
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const yyyyMmDd = getBusinessDate(d);
  const [year, month, day] = yyyyMmDd.split('-');
  return format === 'DD/MM/YYYY' ? `${day}/${month}/${year}` : yyyyMmDd;
}

/**
 * Format date in full Vietnamese format: "Thứ hai, 16/08/2026" without timezone shift
 */
export function formatVietnameseDisplayDate(dateInput: string | Date): string {
  if (!dateInput) return '';

  let year: number;
  let month: number;
  let day: number;

  if (typeof dateInput === 'string') {
    const match = dateInput.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    } else {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      const bizStr = getBusinessDate(d);
      const parts = bizStr.split('-').map(Number);
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }
  } else {
    if (isNaN(dateInput.getTime())) return '';
    const bizStr = getBusinessDate(dateInput);
    const parts = bizStr.split('-').map(Number);
    year = parts[0];
    month = parts[1];
    day = parts[2];
  }

  const dUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeekIdx = dUtc.getUTCDay();

  const daysOfWeek = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayOfWeek = daysOfWeek[dayOfWeekIdx];

  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');

  return `${dayOfWeek}, ${dd}/${mm}/${year}`;
}

/**
 * Add or subtract days safely using UTC math to avoid DST or timezone leaps
 */
function addDaysToYmd(ymdStr: string, daysToAdd: number): string {
  const [y, m, d] = ymdStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  utcDate.setUTCDate(utcDate.getUTCDate() + daysToAdd);

  const resY = utcDate.getUTCFullYear();
  const resM = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

/**
 * Deterministic Natural Language Vietnamese Date Parser
 */
export function parseVietnameseDate(
  rawText: string,
  referenceDateInput?: string | Date | null,
  timeZone: string = BUSINESS_TIMEZONE
): DateParseResult {
  const refYmd = getBusinessDate(referenceDateInput, timeZone);
  const [refYear, refMonth, refDay] = refYmd.split('-').map(Number);
  const refUtcDate = new Date(Date.UTC(refYear, refMonth - 1, refDay, 12, 0, 0));
  const refDayOfWeek = refUtcDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  if (!rawText || !rawText.trim()) {
    return {
      normalizedDate: refYmd,
      dateType: 'DEFAULT',
      originalExpression: '',
      confidence: 0.9,
      cleanedText: '',
      matched: false,
    };
  }

  const originalText = rawText;
  const lowerText = rawText.toLowerCase();

  // Helper to remove matched substring and clean spaces
  const cleanExpression = (text: string, expr: string | RegExp): string => {
    return text.replace(expr, ' ').replace(/\s+/g, ' ').trim();
  };

  // =========================================================================
  // 1. EXACT FULL DATES: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD
  // =========================================================================
  const fullDateRegex1 = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/i;
  const matchFull1 = lowerText.match(fullDateRegex1);
  if (matchFull1) {
    const day = parseInt(matchFull1[1], 10);
    const month = parseInt(matchFull1[2], 10);
    const year = parseInt(matchFull1[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      const normalizedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        normalizedDate,
        dateType: 'EXACT',
        originalExpression: matchFull1[0],
        confidence: 0.99,
        cleanedText: cleanExpression(originalText, matchFull1[0]),
        explanation: `Nhận diện ngày cụ thể: ${matchFull1[0]} -> ${normalizedDate}`,
        matched: true,
      };
    }
  }

  const isoDateRegex = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/i;
  const matchIso = lowerText.match(isoDateRegex);
  if (matchIso) {
    const year = parseInt(matchIso[1], 10);
    const month = parseInt(matchIso[2], 10);
    const day = parseInt(matchIso[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      const normalizedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        normalizedDate,
        dateType: 'EXACT',
        originalExpression: matchIso[0],
        confidence: 0.99,
        cleanedText: cleanExpression(originalText, matchIso[0]),
        explanation: `Nhận diện ngày ISO: ${matchIso[0]} -> ${normalizedDate}`,
        matched: true,
      };
    }
  }

  // Full date with Vietnamese words: "ngày 15 tháng 8 năm 2026", "15 tháng 8 năm 2026"
  const vnFullDateRegex = /(?:ngày\s+)?(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i;
  const matchVnFull = lowerText.match(vnFullDateRegex);
  if (matchVnFull) {
    const day = parseInt(matchVnFull[1], 10);
    const month = parseInt(matchVnFull[2], 10);
    const year = parseInt(matchVnFull[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      const normalizedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        normalizedDate,
        dateType: 'EXACT',
        originalExpression: matchVnFull[0],
        confidence: 0.99,
        cleanedText: cleanExpression(originalText, new RegExp(matchVnFull[0], 'i')),
        explanation: `Nhận diện ngày: ${matchVnFull[0]} -> ${normalizedDate}`,
        matched: true,
      };
    }
  }

  // =========================================================================
  // 2. DATES WITHOUT YEAR: "ngày 15 tháng 8", "15 tháng 8", "15/08", "15-08", "ngày 10/08"
  // =========================================================================
  const vnMonthDateRegex = /(?:ngày\s+)?(\d{1,2})\s+tháng\s+(\d{1,2})/i;
  const matchVnMonth = lowerText.match(vnMonthDateRegex);
  if (matchVnMonth) {
    const day = parseInt(matchVnMonth[1], 10);
    const month = parseInt(matchVnMonth[2], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let inferredYear = refYear;
      // If target month is far in future compared to current reference month, it might belong to previous year
      if (month > refMonth + 2) {
        inferredYear = refYear - 1;
      }
      const normalizedDate = `${inferredYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        normalizedDate,
        dateType: 'INFERRED',
        originalExpression: matchVnMonth[0],
        confidence: 0.97,
        cleanedText: cleanExpression(originalText, new RegExp(matchVnMonth[0], 'i')),
        explanation: `Nhận diện ngày tháng: ${matchVnMonth[0]} -> ${normalizedDate}`,
        matched: true,
      };
    }
  }

  // Short format: "ngày 15/08", "15/08", "15-08", "15.08"
  // Guard against match with numbers like "15/20k" or division by checking boundary
  const shortDateRegex = /(?:ngày\s+)?\b(\d{1,2})[\/\-\.](\d{1,2})\b(?!\s*(?:k|nghìn|ngàn|tr|triệu|đ|vnd))/i;
  const matchShort = lowerText.match(shortDateRegex);
  if (matchShort) {
    const day = parseInt(matchShort[1], 10);
    const month = parseInt(matchShort[2], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let inferredYear = refYear;
      if (month > refMonth + 2) {
        inferredYear = refYear - 1;
      }
      const normalizedDate = `${inferredYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        normalizedDate,
        dateType: 'INFERRED',
        originalExpression: matchShort[0],
        confidence: 0.96,
        cleanedText: cleanExpression(originalText, new RegExp(matchShort[0].replace(/[\/\-\.]/g, '[\\/\\-\\.]'), 'i')),
        explanation: `Nhận diện ngày: ${matchShort[0]} -> ${normalizedDate}`,
        matched: true,
      };
    }
  }

  // =========================================================================
  // 3. DAYS OF WEEK WITH MODIFIERS
  // (e.g. "thứ 2 tuần trước", "thứ 6 vừa rồi", "chủ nhật tuần rồi", "thứ 3 tuần sau")
  // =========================================================================
  const weekdayPattern = /(?:thứ\s*(?:2|3|4|5|6|7|hai|ba|tư|bốn|năm|sáu|bảy|bẩy)|chủ\s*nhật|chúa\s*nhật|t2|t3|t4|t5|t6|t7|cn)/i;
  const modifierPattern = /(?:tuần\s*trước|tuần\s*rồi|vừa\s*rồi|tuần\s*qua|tuần\s*này|tuần\s*sau|tuần\s*tới|vừa\s*qua)/i;

  const weekdayWithModRegex = new RegExp(
    `(${weekdayPattern.source})\\s+(${modifierPattern.source})|(${modifierPattern.source})\\s+(${weekdayPattern.source})`,
    'i'
  );
  const matchWeekdayMod = lowerText.match(weekdayWithModRegex);

  if (matchWeekdayMod) {
    const fullMatchedExpr = matchWeekdayMod[0];
    const rawWk = (matchWeekdayMod[1] || matchWeekdayMod[4]).toLowerCase();
    const rawMod = (matchWeekdayMod[2] || matchWeekdayMod[3]).toLowerCase();

    const targetWk = parseWeekdayNumber(rawWk);
    if (targetWk !== null) {
      // Find Monday of current reference week
      // (refDayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat)
      const daysSinceMonday = refDayOfWeek === 0 ? 6 : refDayOfWeek - 1;
      const currentMondayYmd = addDaysToYmd(refYmd, -daysSinceMonday);

      let targetMondayYmd = currentMondayYmd;
      if (/tuần\s*trước|tuần\s*rồi|vừa\s*rồi|tuần\s*qua|vừa\s*qua/.test(rawMod)) {
        targetMondayYmd = addDaysToYmd(currentMondayYmd, -7);
      } else if (/tuần\s*sau|tuần\s*tới/.test(rawMod)) {
        targetMondayYmd = addDaysToYmd(currentMondayYmd, 7);
      }

      // Offset from Monday to target weekday (Mon=0 offset, Tue=1, ..., Sun=6)
      const dayOffsetFromMonday = targetWk === 0 ? 6 : targetWk - 1;
      const normalizedDate = addDaysToYmd(targetMondayYmd, dayOffsetFromMonday);

      return {
        normalizedDate,
        dateType: 'RELATIVE',
        originalExpression: fullMatchedExpr,
        confidence: 0.98,
        cleanedText: cleanExpression(originalText, new RegExp(fullMatchedExpr, 'i')),
        explanation: `Nhận diện thứ trong tuần (${fullMatchedExpr}): -> ${normalizedDate}`,
        matched: true,
      };
    }
  }

  // =========================================================================
  // 4. MULTI-DAY RELATIVE: "X ngày trước", "X hôm trước", "cách đây X ngày", "X ngày nữa"
  // =========================================================================
  const nDaysAgoRegex = /(?:cách\s+đây\s+)?(\d+)\s*(?:ngày|hôm)\s*(?:trước|vừa\s*rồi|trước\s*đây)/i;
  const matchNDaysAgo = lowerText.match(nDaysAgoRegex);
  if (matchNDaysAgo) {
    const count = parseInt(matchNDaysAgo[1], 10);
    if (count >= 1 && count <= 365) {
      const normalizedDate = addDaysToYmd(refYmd, -count);
      return {
        normalizedDate,
        dateType: 'RELATIVE',
        originalExpression: matchNDaysAgo[0],
        confidence: 0.98,
        cleanedText: cleanExpression(originalText, new RegExp(matchNDaysAgo[0], 'i')),
        explanation: `Nhận diện ${count} ngày trước -> ${normalizedDate}`,
        matched: true,
      };
    }
  }

  const nDaysLaterRegex = /(\d+)\s*(?:ngày|hôm)\s*(?:nữa|sau|tới)/i;
  const matchNDaysLater = lowerText.match(nDaysLaterRegex);
  if (matchNDaysLater) {
    const count = parseInt(matchNDaysLater[1], 10);
    if (count >= 1 && count <= 365) {
      const normalizedDate = addDaysToYmd(refYmd, count);
      return {
        normalizedDate,
        dateType: 'RELATIVE',
        originalExpression: matchNDaysLater[0],
        confidence: 0.98,
        cleanedText: cleanExpression(originalText, new RegExp(matchNDaysLater[0], 'i')),
        explanation: `Nhận diện ${count} ngày sau -> ${normalizedDate}`,
        matched: true,
      };
    }
  }

  // =========================================================================
  // 5. TIME-OF-DAY + DAY PHRASES & RELATIVE DAY PHRASES
  // (e.g. "chiều hôm qua", "tối qua", "sáng hôm kia", "hôm qua", "hôm kia", "hôm nay", "ngày mai", "ngày mốt")
  // =========================================================================
  const relativePhrases: Array<{
    patterns: RegExp[];
    deltaDays: number;
    expr: string;
  }> = [
    // 2 days ago (-2)
    {
      patterns: [
        /\b(?:sáng|trưa|chiều|tối|đêm)\s+hôm\s+(?:kia|kìa)\b/i,
        /\bngày\s+hôm\s+(?:kia|kìa)\b/i,
        /\bhôm\s+(?:kia|kìa)\b/i,
        /\bngày\s+(?:kia|kìa)\b/i,
        /\bhôm\s+trước\s+nữa\b/i,
      ],
      deltaDays: -2,
      expr: 'hôm kia',
    },
    // 1 day ago (-1)
    {
      patterns: [
        /\b(?:sáng|trưa|chiều|tối|đêm)\s+hôm\s+qua\b/i,
        /\b(?:sáng|trưa|chiều|tối|đêm)\s+qua\b/i,
        /\bhôm\s+qua\s+nay\b/i,
        /\bngày\s+hôm\s+qua\b/i,
        /\bbữa\s+qua\b/i,
        /\bhôm\s+qua\b/i,
        /\bhôm\s+rồi\b/i,
        /\bhôm\s+trước\b/i,
      ],
      deltaDays: -1,
      expr: 'hôm qua',
    },
    // 2 days later (+2)
    {
      patterns: [
        /\b(?:sáng|trưa|chiều|tối)\s+ngày\s+mốt\b/i,
        /\bngày\s+mốt\b/i,
        /\bbữa\s+mốt\b/i,
        /\bmốt\b/i,
      ],
      deltaDays: 2,
      expr: 'ngày mốt',
    },
    // 1 day later (+1)
    {
      patterns: [
        /\b(?:sáng|trưa|chiều|tối)\s+mai\b/i,
        /\bngày\s+mai\b/i,
        /\bbữa\s+mai\b/i,
        /\bmai\b/i,
      ],
      deltaDays: 1,
      expr: 'ngày mai',
    },
    // Today (0)
    {
      patterns: [
        /\b(?:sáng|trưa|chiều|tối|đêm)\s+nay\b/i,
        /\bngày\s+hôm\s+nay\b/i,
        /\bbữa\s+nay\b/i,
        /\bhôm\s+nay\b/i,
        /\bhôm\s+ni\b/i,
        /\bhồi\s+(?:sáng|trưa|chiều|tối)\b/i,
      ],
      deltaDays: 0,
      expr: 'hôm nay',
    },
  ];

  for (const rel of relativePhrases) {
    for (const regex of rel.patterns) {
      const match = lowerText.match(regex);
      if (match) {
        const normalizedDate = addDaysToYmd(refYmd, rel.deltaDays);
        return {
          normalizedDate,
          dateType: 'RELATIVE',
          originalExpression: match[0],
          confidence: 0.98,
          cleanedText: cleanExpression(originalText, new RegExp(match[0], 'i')),
          explanation: `Nhận diện ${match[0]} -> ${normalizedDate}`,
          matched: true,
        };
      }
    }
  }

  // =========================================================================
  // 6. BARE WEEKDAY WITHOUT "TUẦN TRƯỚC" (e.g. "thứ 2", "thứ ba", "chủ nhật")
  // =========================================================================
  const bareWeekdayRegex = /\b(thứ\s*(?:2|3|4|5|6|7|hai|ba|tư|bốn|năm|sáu|bảy|bẩy)|chủ\s*nhật|chúa\s*nhật)\b/i;
  const matchBareWeekday = lowerText.match(bareWeekdayRegex);
  if (matchBareWeekday) {
    const rawWk = matchBareWeekday[1].toLowerCase();
    const targetWk = parseWeekdayNumber(rawWk);
    if (targetWk !== null) {
      let delta = 0;
      if (targetWk === refDayOfWeek) {
        delta = 0; // It's today
      } else if (targetWk < refDayOfWeek) {
        // Earlier this week
        delta = targetWk - refDayOfWeek;
      } else {
        // Most recent occurrence in the past (e.g. today is Tuesday, user mentions Friday -> last Friday)
        delta = (targetWk - refDayOfWeek) - 7;
      }

      const normalizedDate = addDaysToYmd(refYmd, delta);
      return {
        normalizedDate,
        dateType: 'RELATIVE',
        originalExpression: matchBareWeekday[0],
        confidence: 0.94,
        cleanedText: cleanExpression(originalText, new RegExp(matchBareWeekday[0], 'i')),
        explanation: `Nhận diện ${matchBareWeekday[0]} gần nhất -> ${normalizedDate}`,
        matched: true,
      };
    }
  }

  // =========================================================================
  // 7. DEFAULT FALLBACK: TODAY
  // =========================================================================
  return {
    normalizedDate: refYmd,
    dateType: 'DEFAULT',
    originalExpression: '',
    confidence: 0.92,
    cleanedText: originalText,
    explanation: `Mặc định sử dụng ngày hiện tại (${refYmd})`,
    matched: false,
  };
}

/**
 * Helper to convert weekday string to number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
function parseWeekdayNumber(raw: string): number | null {
  const clean = raw.toLowerCase().replace(/\s+/g, '');
  if (clean.includes('2') || clean.includes('hai') || clean === 't2') return 1;
  if (clean.includes('3') || clean.includes('ba') || clean === 't3') return 2;
  if (clean.includes('4') || clean.includes('tư') || clean.includes('bốn') || clean === 't4') return 3;
  if (clean.includes('5') || clean.includes('năm') || clean === 't5') return 4;
  if (clean.includes('6') || clean.includes('sáu') || clean === 't6') return 5;
  if (clean.includes('7') || clean.includes('bảy') || clean.includes('bẩy') || clean === 't7') return 6;
  if (clean.includes('chủnhật') || clean.includes('chúanhật') || clean === 'cn') return 0;
  return null;
}

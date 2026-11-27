import { parseVndInput } from './money';
import { suggestStatementCategory } from './statementCategory';

// ---------- Đọc CSV (RFC 4180) ----------

export interface CsvRow {
  /** Số dòng vật lý (từ 1) nơi bản ghi bắt đầu */
  line: number;
  cells: string[];
}

export class CsvFormatError extends Error {}

export function parseCsv(text: string, delimiter: string): CsvRow[] {
  const src = text.replace(/^﻿/, '');
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  const endRow = () => {
    rows.push({ line: rowLine, cells: [...cells, cell] });
    cells = [];
    cell = '';
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const isBreak = ch === '\n' || (ch === '\r' && src[i + 1] !== '\n');

    if (quoted) {
      if (isBreak) line++;
      if (ch !== '"') cell += ch;
      else if (src[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === delimiter) {
      cells.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      endRow();
      line++;
      rowLine = line;
    } else {
      cell += ch;
    }
  }

  if (quoted) throw new CsvFormatError(`Dấu ngoặc kép mở ở dòng ${rowLine} không được đóng.`);
  if (cell !== '' || cells.length > 0) endRow();
  return rows;
}

// ---------- Dò cột tiêu đề ----------

type ColumnRole = 'date' | 'note' | 'amount' | 'debit' | 'credit';
type Columns = Partial<Record<ColumnRole, number>>;

const DELIMITERS = [',', ';', '\t'];
/** Sao kê thường có vài dòng thông tin tài khoản trước tiêu đề */
const HEADER_SCAN_ROWS = 30;

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const DEBIT = /\b(ghi no|phat sinh no|debit|withdrawals?|tien ra|so tien chi|tien chi|chi ra|rut ra)\b/;
const CREDIT = /\b(ghi co|phat sinh co|credit|deposits?|tien vao|so tien thu|tien thu|thu vao)\b/;
const AMOUNT = /^tien$|\b(so tien|amount|gia tri)\b/;
const DATE = /\b(ngay|date)\b/;
const NOTE = /\b(mo ta|noi dung|dien giai|ghi chu|description|details?|narrative|memo|notes?|remarks?|chi tiet)\b/;
const ACCOUNT = /\b(tai khoan|account)\b/;
/** Khi có nhiều cột cùng vai trò thì ưu tiên cột khớp mẫu này */
const PREFERRED: Partial<Record<ColumnRole, RegExp>> = {
  date: /giao dich|transaction|\bgd\b/,
  note: /noi dung|mo ta|dien giai|description/,
};

function roleOf(cell: string): ColumnRole | null {
  // "Nợ" / "Có" phải so cả dấu, nếu không cột số thứ tự "No." bị coi là ghi nợ
  const exact = cell.trim().toLowerCase().normalize('NFC');
  if (exact === 'nợ') return 'debit';
  if (exact === 'có') return 'credit';

  const header = normalizeHeader(cell);
  if (!header || /\bso du\b|\bbalance\b/.test(header)) return null;
  // Cột số/tên tài khoản (vd "Tài khoản ghi nợ") không phải cột tiền
  if (ACCOUNT.test(header) && !AMOUNT.test(header)) return null;
  const debit = DEBIT.test(header);
  const credit = CREDIT.test(header);
  // Một cột gộp "Số tiền ghi nợ/có" là cột số tiền có dấu
  if (debit && credit) return AMOUNT.test(header) ? 'amount' : null;
  if (debit) return 'debit';
  if (credit) return 'credit';
  if (DATE.test(header)) return 'date';
  if (AMOUNT.test(header)) return 'amount';
  return NOTE.test(header) ? 'note' : null;
}

function matchColumns(cells: string[]): Columns {
  const columns: Columns = {};
  const headers = cells.map(normalizeHeader);
  headers.forEach((header, index) => {
    const role = roleOf(cells[index]);
    if (!role) return;
    const current = columns[role];
    const preferred = PREFERRED[role];
    if (current === undefined || (preferred?.test(header) && !preferred.test(headers[current]))) {
      columns[role] = index;
    }
  });
  return columns;
}

const hasRequiredColumns = (c: Columns) =>
  c.date !== undefined && (c.debit !== undefined || c.amount !== undefined);

function findTable(text: string) {
  let best: { rows: CsvRow[]; headerIndex: number; columns: Columns; score: number } | null = null;
  let formatError: CsvFormatError | null = null;

  for (const delimiter of DELIMITERS) {
    let rows: CsvRow[];
    try {
      rows = parseCsv(text, delimiter);
    } catch (err) {
      if (!(err instanceof CsvFormatError)) throw err;
      formatError = formatError || err;
      continue;
    }
    for (let i = 0; i < Math.min(rows.length, HEADER_SCAN_ROWS); i++) {
      const columns = matchColumns(rows[i].cells);
      if (!hasRequiredColumns(columns)) continue;
      const score = Object.keys(columns).length;
      if (!best || score > best.score) best = { rows, headerIndex: i, columns, score };
      break;
    }
  }

  return { table: best, formatError };
}

// ---------- Đọc sao kê ----------

export interface StatementExpense {
  line: number;
  date: string; // YYYY-MM-DD
  note: string;
  amount: number;
  categoryId: string;
}

export interface StatementLineError {
  line: number;
  reason: string;
}

export type StatementParseResult =
  | {
      ok: true;
      expenses: StatementExpense[];
      /** Số dòng tiền vào đã bỏ qua */
      incomingCount: number;
      errors: StatementLineError[];
      /** File chỉ có số dương nên toàn bộ được coi là khoản chi */
      assumedAllExpense: boolean;
    }
  | { ok: false; error: string };

const NOTE_MAX = 500;
const DEFAULT_NOTE = 'Giao dịch ngân hàng';
const COLUMN_ERROR =
  'Không tìm thấy các cột cần thiết. Tệp cần có dòng tiêu đề gồm cột Ngày và cột Số tiền (hoặc Ghi nợ/Ghi có), phân cách bằng dấu phẩy, chấm phẩy hoặc tab. Tệp Excel (.xlsx) cần được lưu lại thành CSV (UTF-8).';

/** dd/mm/yyyy, dd-mm-yyyy hoặc yyyy-mm-dd (cho phép kèm giờ). Trả về null nếu không phải ngày thật. */
function parseStatementDate(raw: string): string | null {
  const text = raw.trim().replace(/[ T]+\d{1,2}:\d{2}.*$/, '');
  const dmy = text.match(/^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/);
  const ymd = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!dmy && !ymd) return null;
  const [year, month, day] = (dmy ? [dmy[4], dmy[3], dmy[1]] : [ymd![1], ymd![2], ymd![3]]).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    year >= 1900 && year <= 2100 && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isReal ? date.toISOString().slice(0, 10) : null;
}

type CellAmount =
  | { kind: 'empty' }
  | { kind: 'invalid'; raw: string }
  | { kind: 'value'; value: number; negative: boolean };

/** Sao kê hay ghi dấu +/- ở đầu; phần còn lại đọc theo quy tắc chung của ô tiền */
function readAmountCell(raw: string | undefined): CellAmount {
  const text = (raw || '').trim();
  if (text === '' || text === '-') return { kind: 'empty' };
  const sign = text.match(/^[+\-−]/)?.[0];
  const value = parseVndInput(sign ? text.slice(1) : text);
  if (value === null) return { kind: 'invalid', raw: text };
  return { kind: 'value', value, negative: !!sign && sign !== '+' && value !== 0 };
}

const isNonZero = (a: CellAmount): a is Extract<CellAmount, { kind: 'value' }> =>
  a.kind === 'value' && a.value !== 0;

type Direction = { expense: number } | { incoming: true } | { reason: string };

const invalidAmount = (raw: string): Direction => ({ reason: `Số tiền không hợp lệ: "${raw}".` });
const NO_AMOUNT: Direction = { reason: 'Không có số tiền (trống hoặc bằng 0).' };

function readDirection(cells: string[], columns: Columns, hasNegative: boolean): Direction {
  const at = (index: number | undefined) => readAmountCell(index === undefined ? '' : cells[index]);
  const credit = at(columns.credit);
  if (credit.kind === 'invalid') return invalidAmount(credit.raw);

  // Cột ghi nợ (nếu có) được ưu tiên vì nói rõ chiều tiền
  const useDebit = columns.debit !== undefined;
  const main = at(useDebit ? columns.debit : columns.amount);
  if (main.kind === 'invalid') return invalidAmount(main.raw);

  if (isNonZero(credit)) {
    if (useDebit && isNonZero(main)) return { reason: 'Dòng có cả số tiền ghi nợ và ghi có.' };
    return { incoming: true };
  }
  if (!isNonZero(main)) return NO_AMOUNT;
  if (!useDebit && hasNegative && !main.negative) return { incoming: true };
  return { expense: main.value };
}

export function parseStatement(text: string): StatementParseResult {
  const { table, formatError } = findTable(text);
  if (!table) return { ok: false, error: formatError ? formatError.message : COLUMN_ERROR };

  const { columns } = table;
  const dataRows = table.rows
    .slice(table.headerIndex + 1)
    .filter((row) => row.cells.some((c) => c.trim() !== ''));

  const hasNegative =
    columns.debit === undefined &&
    dataRows.some((row) => {
      const a = readAmountCell(row.cells[columns.amount!]);
      return a.kind === 'value' && a.negative;
    });

  const expenses: StatementExpense[] = [];
  const errors: StatementLineError[] = [];
  let incomingCount = 0;

  for (const { line, cells } of dataRows) {
    const rawDate = (cells[columns.date!] || '').trim();
    const date = parseStatementDate(rawDate);
    if (!date) {
      errors.push({ line, reason: rawDate ? `Ngày không hợp lệ: "${rawDate}".` : 'Thiếu ngày.' });
      continue;
    }

    const direction = readDirection(cells, columns, hasNegative);
    if ('reason' in direction) {
      errors.push({ line, reason: direction.reason });
    } else if ('incoming' in direction) {
      incomingCount++;
    } else {
      const rawNote = columns.note === undefined ? '' : cells[columns.note] || '';
      const note = rawNote.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX) || DEFAULT_NOTE;
      expenses.push({ line, date, note, amount: direction.expense, categoryId: suggestStatementCategory(note) });
    }
  }

  return {
    ok: true,
    expenses,
    incomingCount,
    errors,
    assumedAllExpense:
      columns.debit === undefined && columns.credit === undefined && !hasNegative && expenses.length > 0,
  };
}

// ---------- Xuất CSV ----------

/**
 * Chống formula injection: chuỗi bắt đầu bằng = + - @ tab CR được thêm dấu ' để Excel coi là chữ.
 * Số (kiểu number) giữ nguyên là số.
 */
export function escapeCsvCell(value: string | number): string {
  if (typeof value === 'number') return String(value);
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",;\t\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

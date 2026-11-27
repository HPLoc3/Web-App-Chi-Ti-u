import { describe, it, expect } from 'vitest';
import { parseCsv, parseStatement, escapeCsvCell, toCsv } from '../../../src/utils/csv';

const ok = (text: string) => {
  const r = parseStatement(text);
  if (r.ok === false) throw new Error(r.error);
  return r;
};

describe('parseCsv (RFC4180)', () => {
  it('ngoặc kép, "" thoát, xuống dòng trong ô, BOM, CRLF', () => {
    const rows = parseCsv('﻿a,b\r\n"x, y","nói ""chào""\nxuống dòng"\r\nc,\r\n', ',');
    expect(rows.map((r) => r.cells)).toEqual([
      ['a', 'b'],
      ['x, y', 'nói "chào"\nxuống dòng'],
      ['c', ''],
    ]);
    // Số dòng vật lý nơi bản ghi bắt đầu
    expect(rows.map((r) => r.line)).toEqual([1, 2, 4]);
  });

  it('ngoặc kép giữa ô không bọc giữ nguyên', () => {
    expect(parseCsv('màn 24" rộng;2', ';')[0].cells).toEqual(['màn 24" rộng', '2']);
  });
});

describe('parseStatement', () => {
  it.each([',', ';', '\t'])('dò phân cách %j từ tiêu đề', (d) => {
    const r = ok([['Ngày', 'Nội dung', 'Số tiền'], ['15/08/2026', 'Ăn phở', '45000']].map((x) => x.join(d)).join('\n'));
    expect(r.expenses).toEqual([
      { line: 2, date: '2026-08-15', note: 'Ăn phở', amount: 45000, categoryId: 'an_uong' },
    ]);
  });

  it('tiêu đề tiếng Anh, có dòng thông tin phía trước, ba định dạng ngày', () => {
    const r = ok(
      'Account statement,123456\n\nTransaction Date,Description,Amount (VND),Balance\n' +
        '15-08-2026,Taxi,"-50,000",1\n2026-08-16,Coffee,"-20.000",1\n5/9/2026 14:30:00,Book,-1000,1\n'
    );
    expect(r.expenses.map((e) => [e.date, e.amount])).toEqual([
      ['2026-08-15', 50000],
      ['2026-08-16', 20000],
      ['2026-09-05', 1000],
    ]);
    expect(r.assumedAllExpense).toBe(false);
  });

  it('cột ghi nợ / ghi có: tiền vào bỏ qua và đếm', () => {
    const r = ok(
      'Ngày giao dịch;Diễn giải;Ghi nợ;Ghi có;Số dư\n' +
        '01/11/2026;Tiền điện;350.000;;1\n02/11/2026;Lương;;15.000.000;1\n03/11/2026;Đổ xăng;50.000;0;1\n04/11/2026;Hoàn tiền;0;20.000;1\n'
    );
    expect(r.expenses.map((e) => e.amount)).toEqual([350000, 50000]);
    expect(r.incomingCount).toBe(2);
    expect(r.errors).toEqual([]);
    expect(r.assumedAllExpense).toBe(false);
  });

  it('cột số tiền có cả số âm: số dương (kể cả +) là tiền vào', () => {
    const r = ok('Date,Memo,Amount\n2026-11-01,a,-1000\n2026-11-02,b,+2000\n2026-11-03,c,3000\n');
    expect(r.expenses.map((e) => e.amount)).toEqual([1000]);
    expect(r.incomingCount).toBe(2);
  });

  it('file toàn số dương: coi là chi và đánh dấu giả định', () => {
    const r = ok('Ngày,Mô tả,Số tiền\n01/11/2026,a,1000\n02/11/2026,b,+2000\n');
    expect(r.expenses).toHaveLength(2);
    expect(r.incomingCount).toBe(0);
    expect(r.assumedAllExpense).toBe(true);
  });

  it('dòng lỗi liệt kê số dòng và lý do, không đoán bừa', () => {
    const r = ok(
      'Ngày,Nội dung,Số tiền\n31/02/2026,a,1000\n,b,1000\n01/11/2026,c,\n01/11/2026,d,12.5\n01/11/2026,e,0\n01/11/2026,f,1000\n\n,,\nTổng cộng,,5000\n'
    );
    expect(r.expenses.map((e) => e.note)).toEqual(['f']);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4, 5, 6, 10]);
    expect(r.errors[0].reason).toMatch(/ngày/i);
    expect(r.errors[2].reason).toMatch(/số tiền/i);
  });

  it('cột số thứ tự "No." và cột số tài khoản không bị nhận là cột tiền', () => {
    const r = ok(
      'No.,Date,Debit Account,Account No,Description,Amount\n1,01/11/2026,0123456789,9876,a,5000\n2,02/11/2026,0123456789,9876,b,6000\n'
    );
    expect(r.expenses.map((e) => e.amount)).toEqual([5000, 6000]);
    const viet = ok('Ngày,Tài khoản ghi nợ,Nội dung,Số tiền\n01/11/2026,0123456789,a,7000\n');
    expect(viet.expenses.map((e) => e.amount)).toEqual([7000]);
  });

  it('tiêu đề ngắn "Nợ" / "Có" (có dấu)', () => {
    const r = ok('Ngày,Diễn giải,Nợ,Có\n01/11/2026,a,1000,\n02/11/2026,b,,2000\n');
    expect(r.expenses.map((e) => e.amount)).toEqual([1000]);
    expect(r.incomingCount).toBe(1);
  });

  it('vừa ghi nợ vừa ghi có trên một dòng là lỗi', () => {
    const r = ok('Ngày,Nội dung,Ghi nợ,Ghi có\n01/11/2026,a,1000,2000\n01/11/2026,b,,\n');
    expect(r.expenses).toEqual([]);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3]);
  });

  it.each([
    ['văn bản tự do', 'Ăn sáng 45k\nTaxi 50k'],
    ['thiếu cột tiền', 'Ngày,Nội dung\n01/11/2026,a'],
    ['chỉ có cột ghi có', 'Ngày,Nội dung,Ghi có\n01/11/2026,a,1'],
    ['rỗng', ''],
    ['ngoặc kép không đóng', 'Ngày,Nội dung,Số tiền\n01/11/2026,"a,1000\n'],
  ])('không đọc được (%s): lỗi rõ ràng', (_name, text) => {
    const r = parseStatement(text);
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error.length).toBeGreaterThan(10);
  });

  it('ghi chú dài bị cắt 500 ký tự; mô tả trống có tên mặc định', () => {
    const r = ok(`Ngày,Nội dung,Số tiền\n01/11/2026,${'a'.repeat(600)},1000\n01/11/2026,,1000\n`);
    expect(r.expenses[0].note).toHaveLength(500);
    expect(r.expenses[1].note).toBe('Giao dịch ngân hàng');
  });

  it('đọc lại được file do chính app xuất ra', () => {
    const csv = '﻿' + toCsv([['Ngày', 'Danh mục', 'Số tiền (₫)', 'Ghi chú'], ['2026-11-01', 'Ăn uống', 45000, 'phở, "bò"']]);
    expect(ok(csv).expenses[0]).toMatchObject({ date: '2026-11-01', amount: 45000, note: 'phở, "bò"' });
  });
});

describe('escapeCsvCell', () => {
  it.each(['=1+1', '+84', '-2', '@SUM(A1)', '\tx', '\rx'])('chống formula injection %j', (v) => {
    expect(escapeCsvCell(v).replace(/^"/, '').startsWith("'")).toBe(true);
  });

  it('số vẫn là số, chữ thường giữ nguyên, ký tự đặc biệt được bọc', () => {
    expect(escapeCsvCell(-5000)).toBe('-5000');
    expect(escapeCsvCell(45000)).toBe('45000');
    expect(escapeCsvCell('phở bò')).toBe('phở bò');
    expect(escapeCsvCell('a,"b"')).toBe('"a,""b"""');
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });
});

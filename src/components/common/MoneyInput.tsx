import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { formatVndInput, parseVndInput } from '../../utils/money';

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'inputMode'> {
  value: number | null;
  /** value = null khi ô trống hoặc nội dung không hợp lệ; raw là chuỗi trên ô trước khi định dạng */
  onChange: (value: number | null, raw: string) => void;
  allowNegative?: boolean;
}

interface Draft {
  text: string;
  value: number | null;
  /** Số chữ số/dấu trừ đứng trước con trỏ, để đặt lại con trỏ sau khi định dạng */
  caretAfter: number | null;
}

/** Nội dung mà dấu "." (nếu có) là do ô tự chèn, nên được phép bỏ đi khi người dùng sửa tiếp */
const OWN_TEXT = /^-?(?:\d*|[1-9]\d{0,2}(?:\.\d{3})+)$/;
const SIGNIFICANT = /[\d-]/g;

function caretPosition(text: string, count: number): number {
  let seen = 0;
  let i = 0;
  while (i < text.length && seen < count) {
    if (/[\d-]/.test(text[i])) seen++;
    i++;
  }
  return i;
}

function readEdit(
  prev: string,
  next: string,
  caret: number,
  opts: { strict: boolean; forwardDelete: boolean; allowNegative: boolean }
): Draft {
  const keep: Draft = { text: next, value: null, caretAfter: null };
  const countSignificant = (s: string) => s.match(SIGNIFICANT)?.length ?? 0;
  let caretAfter = countSignificant(next.slice(0, caret));
  let candidate = next;

  if (!opts.strict && OWN_TEXT.test(prev)) {
    // Tách phần người dùng vừa thêm/xóa để chỉ bỏ dấu phân cách cũ, không bỏ dấu họ mới nhập
    const limit = Math.min(prev.length, next.length);
    let start = 0;
    while (start < limit && prev[start] === next[start]) start++;
    let end = 0;
    while (end < limit - start && prev[prev.length - 1 - end] === next[next.length - 1 - end]) end++;

    const inserted = next.slice(start, next.length - end);
    if (/^-?\d*$/.test(inserted)) {
      const removed = prev.slice(start, prev.length - end);
      const head = next.slice(0, start).replace(/\./g, '');
      let tail = next.slice(next.length - end).replace(/\./g, '');
      // Phím Delete trên dấu phân cách: xóa luôn chữ số kế tiếp, nếu không con trỏ bị kẹt
      if (opts.forwardDelete && removed === '.') tail = tail.slice(1);
      candidate = head + inserted + tail;
    }
  }

  if (candidate === '') return { text: '', value: null, caretAfter: null };

  const value = parseVndInput(candidate, { allowNegative: opts.allowNegative });
  if (value === null) return keep;

  // Đang sửa dở (vd xóa chữ số đầu của "1.000"): giữ nguyên các số 0 và dấu trừ
  if (!opts.strict && (/^-?0\d/.test(candidate) || (candidate.startsWith('-') && value === 0))) {
    return { text: candidate, value, caretAfter };
  }

  const text = formatVndInput(value);
  if (opts.strict) caretAfter = countSignificant(text);
  return { text, value, caretAfter };
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, allowNegative = false, onPaste, onKeyDown, onBlur, ...rest },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);
  const strictPasteRef = useRef(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  // Cha đổi value (reset, nạp dữ liệu...) thì bỏ chữ đang giữ
  const activeDraft = draft && Object.is(draft.value, value) ? draft : null;
  if (draft && !activeDraft) setDraft(null);
  const text = activeDraft ? activeDraft.text : formatVndInput(value);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || draft?.caretAfter == null || document.activeElement !== el) return;
    const pos = caretPosition(el.value, draft.caretAfter);
    el.setSelectionRange(pos, pos);
  }, [draft]);

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        const inputType = (e.nativeEvent as InputEvent).inputType;
        const next = readEdit(text, raw, e.target.selectionStart ?? raw.length, {
          strict:
            strictPasteRef.current || inputType === 'insertFromDrop' || inputType === 'insertReplacementText',
          forwardDelete: inputType === 'deleteContentForward',
          allowNegative,
        });
        strictPasteRef.current = false;
        setDraft(next);
        onChange(next.value, raw);
      }}
      onPaste={(e) => {
        // Nội dung dán có ký tự khác chữ số phải được đọc nguyên văn cả ô
        strictPasteRef.current = !/^\d+$/.test(e.clipboardData?.getData('text') ?? '');
        onPaste?.(e);
      }}
      onKeyDown={(e) => {
        strictPasteRef.current = false;
        onKeyDown?.(e);
      }}
      onBlur={(e) => {
        strictPasteRef.current = false;
        if (value !== null) setDraft(null);
        onBlur?.(e);
      }}
    />
  );
});

export default MoneyInput;

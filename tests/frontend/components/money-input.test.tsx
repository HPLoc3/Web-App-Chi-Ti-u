import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MoneyInput } from '../../../src/components/common/MoneyInput';

afterEach(cleanup);

function setup(initial: number | null = null, props: Record<string, unknown> = {}) {
  const spy = vi.fn();
  function Harness() {
    const [value, setValue] = useState<number | null>(initial);
    return (
      <>
        <MoneyInput
          aria-label="tien"
          {...props}
          value={value}
          onChange={(v, raw) => {
            spy(v, raw);
            setValue(v);
          }}
        />
        <button onClick={() => setValue(null)}>reset</button>
        <button onClick={() => setValue(7000)}>set</button>
        <output>{String(value)}</output>
      </>
    );
  }
  render(<Harness />);
  const input = screen.getByLabelText('tien') as HTMLInputElement;
  const value = () => screen.getByRole('status').textContent;
  const change = (v: string, caret: number = v.length) =>
    fireEvent.change(input, { target: { value: v, selectionStart: caret, selectionEnd: caret } });
  const paste = (pasted: string, result = pasted) => {
    fireEvent.paste(input, { clipboardData: { getData: () => pasted } });
    change(result);
  };
  /** Gõ từng ký tự vào cuối chuỗi đang hiển thị */
  const type = (chars: string) => {
    for (const c of chars) change(input.value + c);
  };
  return { input, spy, value, change, paste, type };
}

describe('MoneyInput', () => {
  it('là ô text, bàn phím số, truyền tiếp thuộc tính', () => {
    const onKeyDown = vi.fn();
    const onBlur = vi.fn();
    const { input } = setup(1500000, {
      className: 'c1', placeholder: 'p1', id: 'i1', autoFocus: true,
      'aria-invalid': true, onKeyDown, onBlur,
    });
    expect(input.type).toBe('text');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.value).toBe('1.500.000');
    expect(input.className).toBe('c1');
    expect(input.placeholder).toBe('p1');
    expect(input.id).toBe('i1');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    expect(onKeyDown).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
  });

  it('disabled được truyền xuống', () => {
    expect(setup(null, { disabled: true }).input.disabled).toBe(true);
  });

  it('tự nhóm nghìn khi gõ từng chữ số', () => {
    const { input, value, type, spy } = setup();
    type('1500000');
    expect(input.value).toBe('1.500.000');
    expect(value()).toBe('1500000');
    expect(spy).toHaveBeenLastCalledWith(1500000, expect.any(String));
  });

  it('xóa lùi vẫn nhóm đúng, xóa hết thì null', () => {
    const { input, value, change } = setup(1500);
    change('1.50');
    expect(input.value).toBe('150');
    expect(value()).toBe('150');
    change('');
    expect(input.value).toBe('');
    expect(value()).toBe('null');
  });

  it('chèn giữa chuỗi giữ đúng vị trí con trỏ', () => {
    const { input, change } = setup(2500);
    input.focus();
    change('21.500', 2);
    expect(input.value).toBe('21.500');
    expect(input.selectionStart).toBe(2);
    change('219.500', 3);
    expect(input.value).toBe('219.500');
    expect(input.selectionStart).toBe(3);
    change('2179.500', 3);
    expect(input.value).toBe('2.179.500');
    expect(input.selectionStart).toBe(4);
  });

  it('xóa chữ số đầu không làm mất các số 0 phía sau', () => {
    const { input, value, change } = setup(1000000);
    change('.000.000', 0);
    expect(input.value).toBe('000000');
    expect(value()).toBe('0');
    change('2000000', 1);
    expect(input.value).toBe('2.000.000');
    expect(value()).toBe('2000000');
  });

  it('phím Delete trước dấu phân cách xóa chữ số kế tiếp', () => {
    const { input, value } = setup(1500);
    input.focus();
    fireEvent.input(input, {
      target: { value: '1500', selectionStart: 1, selectionEnd: 1 },
      inputType: 'deleteContentForward',
    });
    expect(input.value).toBe('100');
    expect(value()).toBe('100');
  });

  it.each(['45.5', '45,5', 'abc', '1e15', '1000000000000', '-5'])(
    'dán %j ra null và giữ nguyên chữ',
    (text) => {
      const { input, value, paste, spy } = setup(1000);
      paste(text);
      expect(input.value).toBe(text);
      expect(value()).toBe('null');
      expect(spy).toHaveBeenLastCalledWith(null, text);
      fireEvent.blur(input);
      expect(input.value).toBe(text);
    }
  );

  it('dán "1.5" đè lên "1.500" không bị coi là xóa bớt thành 15', () => {
    const { input, value, paste } = setup(1500);
    paste('1.5');
    expect(input.value).toBe('1.5');
    expect(value()).toBe('null');
  });

  it('dán chuỗi hợp lệ có hậu tố được chuẩn hóa', () => {
    const { input, value, paste } = setup();
    paste('1,500,000 VND');
    expect(input.value).toBe('1.500.000');
    expect(value()).toBe('1500000');
  });

  it('dán toàn chữ số vào giữa số đã định dạng vẫn hợp lệ', () => {
    const { input, value, paste } = setup(1500);
    paste('22', '1.22500');
    expect(input.value).toBe('122.500');
    expect(value()).toBe('122500');
  });

  it('gõ "45.5" từng ký tự không biến thành 455', () => {
    const { input, value, type } = setup();
    type('45.5');
    expect(input.value).toBe('45.5');
    expect(value()).toBe('null');
    type('0');
    expect(value()).toBe('null');
    type('0');
    expect(input.value).toBe('45.500');
    expect(value()).toBe('45500');
  });

  it('vượt trần khi gõ: null, giữ chữ; xóa bớt thì hợp lệ lại', () => {
    const { input, value, type, change } = setup(999999999999);
    type('9');
    expect(value()).toBe('null');
    expect(input.value).toBe('999.999.999.9999');
    change('999.999.999.999');
    expect(value()).toBe('999999999999');
  });

  it('không allowNegative: gõ dấu trừ không bị âm thầm bỏ', () => {
    const { input, value, type } = setup();
    type('-5');
    expect(input.value).toBe('-5');
    expect(value()).toBe('null');
    type('0');
    expect(input.value).toBe('-50');
    expect(value()).toBe('null');
  });

  it('allowNegative: gõ số âm, thêm dấu trừ vào số có sẵn', () => {
    const a = setup(null, { allowNegative: true });
    a.type('-');
    expect(a.input.value).toBe('-');
    expect(a.value()).toBe('null');
    a.type('45000');
    expect(a.input.value).toBe('-45.000');
    expect(a.value()).toBe('-45000');
    cleanup();
    const b = setup(500, { allowNegative: true });
    b.change('-500', 1);
    expect(b.value()).toBe('-500');
  });

  it('đồng bộ khi cha đổi value, không hồi sinh chữ cũ', () => {
    const { input, paste } = setup();
    paste('abc');
    fireEvent.click(screen.getByText('set'));
    expect(input.value).toBe('7.000');
    fireEvent.click(screen.getByText('reset'));
    expect(input.value).toBe('');
  });
});

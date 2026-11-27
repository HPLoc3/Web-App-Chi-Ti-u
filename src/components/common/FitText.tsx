import React from 'react';

/** Bề rộng ước tính mỗi ký tự của font mono (tính theo em), có dư cho ký tự ₫ lấy từ font dự phòng */
const CHAR_EM = 0.62;

interface FitTextProps {
  text: string;
  /** Lớp chữ; đặt cỡ lớn nhất qua biến CSS, vd "[--fit-max:1.5rem]" (mặc định 1.25rem) */
  className?: string;
}

/**
 * Số tiền luôn nằm trên một dòng và vừa khung: cỡ chữ co theo bề rộng khung (đơn vị cqi),
 * không cắt cụt, không ngắt giữa số.
 */
export const FitText: React.FC<FitTextProps> = ({ text, className = '' }) => {
  // Trình duyệt cũ không hiểu cqi: giữ cỡ tối đa và cho xuống dòng thay vì tràn khung
  const canFit = typeof CSS !== 'undefined' && !!CSS.supports?.('width', '1cqi');
  const maxSize = 'var(--fit-max, 1.25rem)';

  return (
    <span className="block w-full min-w-0 [container-type:inline-size]">
      <span
        className={`block ${canFit ? 'whitespace-nowrap' : '[overflow-wrap:anywhere]'} ${className}`}
        style={{
          fontSize: canFit ? `min(${maxSize}, ${(100 / ((text.length + 0.5) * CHAR_EM)).toFixed(2)}cqi)` : maxSize,
        }}
      >
        {text}
      </span>
    </span>
  );
};

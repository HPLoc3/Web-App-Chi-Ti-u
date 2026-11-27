import React from 'react';

// Nhóm 1: **đậm**. Nhóm 2: *nghiêng*.
// Dấu * phải ôm sát chữ, nên "2 * 3", "2*3*4" hay gạch đầu dòng "* mục" được giữ nguyên.
const INLINE_PATTERN =
  /(?<!\p{N})\*\*(?![\s*])([^\n]+?)(?<![\s*])\*\*|(?<![\p{L}\p{N}*])\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?![\p{L}\p{N}*])/gu;

/**
 * Chuyển markdown nội dòng (đậm, nghiêng) thành phần tử React.
 * Mọi phần còn lại là text thuần, React tự escape nên HTML trong chuỗi không được thực thi.
 */
export function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const [raw, bold, italic] = match;
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const Tag = bold !== undefined ? 'strong' : 'em';
    nodes.push(<Tag key={start}>{renderInlineMarkdown(bold ?? italic)}</Tag>);
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

import { describe, expect, it } from 'vitest';
import { classifySize, SIZE_LIMIT_BYTES, SIZE_WARNING_BYTES, utf8ByteLength } from './size';

describe('input size', () => {
  it('한글을 UTF-8 바이트로 계산한다', () => {
    expect(utf8ByteLength('가')).toBe(3);
  });

  it('500KB와 1MB 경계를 분류한다', () => {
    expect(classifySize(SIZE_WARNING_BYTES - 1)).toBe('normal');
    expect(classifySize(SIZE_WARNING_BYTES)).toBe('warning');
    expect(classifySize(SIZE_LIMIT_BYTES)).toBe('warning');
    expect(classifySize(SIZE_LIMIT_BYTES + 1)).toBe('oversized');
  });
});

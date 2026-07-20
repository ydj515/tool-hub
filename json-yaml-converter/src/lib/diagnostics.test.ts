import { describe, expect, it } from 'vitest';
import { buildLineStarts, diagnosticAt, positionAt } from './diagnostics';

describe('diagnostics', () => {
  it('CRLF와 LF가 섞인 offset을 1-based 행/열로 변환한다', () => {
    const starts = buildLineStarts('a\r\nbc\nd');
    expect(starts).toEqual([0, 3, 6]);
    expect(positionAt(starts, 4)).toEqual({ line: 2, column: 2 });
  });

  it('길이가 0인 오류도 최소 한 글자 범위를 만든다', () => {
    expect(diagnosticAt('json', 'CLOSE_BRACE', '닫는 중괄호가 필요합니다.', '{}', 2, 0))
      .toMatchObject({ startOffset: 2, endOffset: 3, line: 1, column: 3 });
  });
});

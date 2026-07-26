import { describe, expect, it } from 'vitest';
import { acceptsRevision } from './protocol';

describe('acceptsRevision', () => {
  it('현재 revision의 응답만 허용한다', () => {
    expect(acceptsRevision(2, 3)).toBe(false);
    expect(acceptsRevision(3, 3)).toBe(true);
  });
});

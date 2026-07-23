import { describe, expect, it } from 'vitest';
import { acceptsRevision } from './protocol';

describe('acceptsRevision', () => {
  it('discards stale worker responses', () => {
    expect(acceptsRevision(4, 5)).toBe(false);
    expect(acceptsRevision(5, 5)).toBe(true);
  });
});

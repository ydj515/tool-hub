import { describe, expect, it } from 'vitest';
import { sha256 } from './sha256';

describe('sha256', () => {
  it('표준 UTF-8 SHA-256 소문자 hex를 반환한다', async () => {
    await expect(sha256('POST|/users|required|email')).resolves.toBe(
      '8487661e9b44397dd55521c5d7397a8b5dc3b65a85978bf5359f20e7e8cfe6d4',
    );
  });
});

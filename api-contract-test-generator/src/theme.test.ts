import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveInitialTheme } from './theme';

describe('resolveInitialTheme', () => {
  afterEach(() => vi.restoreAllMocks());

  it('저장된 테마를 우선한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('dark');

    expect(resolveInitialTheme()).toBe('dark');
  });

  it('저장값이 없으면 시스템 테마를 사용한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);

    expect(resolveInitialTheme()).toBe('dark');
  });
});

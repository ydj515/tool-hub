import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveInitialTheme } from './theme';

describe('resolveInitialTheme', () => {
  beforeEach(() => localStorage.clear());

  it('저장된 테마를 시스템 테마보다 우선한다', () => {
    localStorage.setItem('theme', 'light');
    expect(resolveInitialTheme()).toBe('light');
  });

  it('저장값이 없으면 시스템 다크 테마를 따른다', () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce({
      matches: true,
    } as MediaQueryList);
    expect(resolveInitialTheme()).toBe('dark');
  });
});

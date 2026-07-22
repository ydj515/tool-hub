import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

  it('bootstrap이 브라우저 환경 설정을 읽지 못해도 light 테마를 설정한다', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(indexHtml).toMatch(/catch\s*\([^)]*\)\s*\{\s*document\.documentElement\.setAttribute\('data-theme', 'light'\);\s*\}/);
  });
});

/**
 * 홈 화면의 테마 상태를 data-theme 속성·localStorage와 동기화하는 커스텀 훅이다.
 */
import { useState, useEffect } from 'react';
import { resolveInitialTheme } from '../theme';

type Theme = 'light' | 'dark';

/**
 * 홈 화면의 테마 상태를 data-theme 속성과 localStorage에 동기화한다.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // 프라이버시 모드 등 localStorage 접근 불가 환경 무시
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}

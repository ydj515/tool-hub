/**
 * 홈 화면의 다크 모드 상태를 동기화하는 커스텀 훅이다.
 */
import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

/**
 * 홈 화면의 테마 상태를 DOM과 localStorage에 동기화한다.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    // 인라인 스크립트가 이미 DOM에 적용한 값을 읽어 FOUC 없이 초기 상태를 동기화
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // 프라이버시 모드 등 localStorage 접근 불가 환경 무시
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}

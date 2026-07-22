import { useEffect, useState } from 'react';
import { resolveInitialTheme, type Theme } from '../theme';

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { /* 테마 저장 불가 */ }
  }, [theme]);
  return { theme, toggle: () => setTheme((value) => value === 'light' ? 'dark' : 'light') };
}

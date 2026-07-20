export type Theme = 'light' | 'dark';

export function resolveInitialTheme(): Theme {
  let theme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {
    return theme;
  }
  return theme;
}

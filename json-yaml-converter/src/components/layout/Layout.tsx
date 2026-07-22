import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return <div className="app-shell" data-testid="converter-studio-shell"><div className="app-main">{children}</div></div>;
}

import type { ReactNode } from 'react';

export function Layout({ header, children }: { header: ReactNode; children: ReactNode }) {
  return <div className="app-shell" data-testid="converter-studio-shell">{header}<div className="app-main">{children}</div></div>;
}

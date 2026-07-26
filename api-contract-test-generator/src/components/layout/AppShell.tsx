import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-shell" data-ds-page-shell>{children}</div>;
}

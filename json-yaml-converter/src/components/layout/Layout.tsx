import type { ReactNode } from 'react';

export function Layout({ header, children }: { header: ReactNode; children: ReactNode }) {
  return <div className="app-shell">{header}{children}</div>;
}

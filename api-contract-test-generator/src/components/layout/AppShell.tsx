import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-shell" data-ds-page-shell>{children}<footer className="privacy-note"><ShieldCheck size={16} aria-hidden="true" />명세와 결과는 브라우저 밖으로 전송하지 않습니다.</footer></div>;
}

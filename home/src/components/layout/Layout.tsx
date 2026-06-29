/**
 * 홈 화면의 시각적 셸: 배경 + 헤더 + 본문 슬롯 + 푸터를 조립한다.
 * 테마 상태를 소유해 유일한 소비자인 헤더에 주입한다.
 */
import type { ReactNode } from 'react';
import Background from './Background';
import Header from './Header';
import Footer from './Footer';
import { useTheme } from '../../hooks/useTheme';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-canvas dark:bg-canvas-dark text-gray-900 dark:text-ink-dark">
      <Background />
      <Header theme={theme} onToggle={toggle} />
      <main className="flex-1 relative">{children}</main>
      <Footer />
    </div>
  );
}

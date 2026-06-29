/**
 * 앱 외곽 셸: 화면 패딩 컨테이너. 페이지 콘텐츠를 children으로 받는다.
 */
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return <div className="min-h-screen p-4 md:p-6">{children}</div>;
}

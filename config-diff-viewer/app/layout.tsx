import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Config Diff Viewer",
  description: "설정 파일 비교·검증 도구 — 누락 키, 위험 설정, 민감정보를 배포 전에 탐지합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='light'||t==='dark'?t:'light');}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "DDL Seed Generator",
  description: "DDL을 분석해 DB별 seed SQL과 rollback SQL을 생성합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

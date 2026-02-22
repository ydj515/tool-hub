import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dummy File Generator",
  description: "PDF, DOCX, XLSX 등을 목표 용량으로 생성하는 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

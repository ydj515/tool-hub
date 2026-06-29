import type { FileType } from "@/lib/types";

/**
 * 브랜드 문서 아이콘을 렌더링한다.
 */
function BrandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5h9l3 3V20.5H6z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 3.5v3h3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 10.5h6M9 14h6M9 17.5h3.5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 생성 버튼에서 사용하는 다운로드 아이콘을 렌더링한다.
 */
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m8 11 4 4 4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18h14" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 라이트 모드에서 표시할 달 아이콘을 렌더링한다.
 */
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.7 14.6A8.7 8.7 0 1 1 9.4 3.3a7 7 0 1 0 11.3 11.3z" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 다크 모드에서 표시할 해 아이콘을 렌더링한다.
 */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.3M12 19.2v2.3M21.5 12h-2.3M4.8 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 선택된 파일 포맷에 맞는 아이콘을 반환한다.
 */
function FormatIcon({ type }: { type: FileType }) {
  if (type === "pdf") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3.5h9l3 3V20.5H6z" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 3.5v3h3" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 15.5h8M8 18h6" fill="none" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "docx" || type === "txt") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3.5h9l3 3V20.5H6z" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9.5h6M9 13h6M9 16.5h4.5" fill="none" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "xlsx" || type === "csv") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5.5" y="4.5" width="13" height="15" rx="1.8" fill="none" strokeWidth="1.8" />
        <path d="M5.5 9.5h13M10 4.5v15M14.5 4.5v15" fill="none" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "zip") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3.5h8v17H8z" fill="none" strokeWidth="1.8" />
        <path d="M11 6h2M11 8.5h2M11 11h2M11 13.5h2M10.5 16h3" fill="none" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "json") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5.5C7.8 6.4 7 7.7 7 9.2v5.6C7 16.3 7.8 17.6 9 18.5" fill="none" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15 5.5c1.2.9 2 2.2 2 3.7v5.6c0 1.5-.8 2.8-2 3.7" fill="none" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5.5" y="5.5" width="13" height="13" rx="2" fill="none" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.1" />
    </svg>
  );
}

export { BrandIcon, DownloadIcon, MoonIcon, SunIcon, FormatIcon };

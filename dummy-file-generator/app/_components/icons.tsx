import {
  Braces,
  Download,
  File,
  FileArchive,
  FileText,
  Table2,
  type LucideIcon,
} from "lucide-react";

import type { FileType } from "@/lib/types";

const FORMAT_ICONS = {
  pdf: FileText,
  docx: FileText,
  txt: FileText,
  xlsx: Table2,
  csv: Table2,
  zip: FileArchive,
  json: Braces,
  bin: File,
} satisfies Record<FileType, LucideIcon>;

/**
 * 선택된 파일 포맷에 맞는 Lucide 아이콘을 반환한다.
 */
export function FormatIcon({ type }: { type: FileType }) {
  const Icon = FORMAT_ICONS[type];
  return <Icon size={16} strokeWidth={2} aria-hidden="true" />;
}

/**
 * 생성 버튼에서 사용하는 다운로드 아이콘을 렌더링한다.
 */
export function DownloadIcon() {
  return <Download size={16} strokeWidth={2} aria-hidden="true" />;
}

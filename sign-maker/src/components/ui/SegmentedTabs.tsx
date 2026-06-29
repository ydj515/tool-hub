/**
 * data-active 기반 세그먼트 컨트롤.
 * 옵션 목록을 받아 단일 선택을 토글한다(Draw / Upload 등).
 */
import type { ReactNode } from "react";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <div className="seg flex items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          data-active={value === opt.value}
          className="seg-btn flex items-center gap-1.5 px-3 h-8 text-sm font-semibold"
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

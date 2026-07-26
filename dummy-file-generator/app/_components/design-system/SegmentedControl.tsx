// 이 파일은 packages/design-system/components/SegmentedControl.tsx 에서 생성되었다.
// 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
// `npm run design-system:sync` 를 실행한다.
import type { ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  disabled = false,
}: {
  value: T;
  options: readonly SegmentOption<T>[];
  onValueChange(value: T): void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <div
      data-ds-segmented
      data-ds-control
      className="ds-segmented"
      role="group"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-ds-control
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onValueChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

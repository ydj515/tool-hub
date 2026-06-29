import type { ChangeEvent, ReactNode } from "react";

/**
 * 라벨 + controlSelect 드롭다운 묶음(.fieldGroup). 옵션은 children으로 받는다.
 */
interface SelectFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  spaced?: boolean;
  children: ReactNode;
}

export default function SelectField({ label, id, value, onChange, spaced, children }: SelectFieldProps) {
  return (
    <div className={spaced ? "fieldGroup spaced" : "fieldGroup"}>
      <label htmlFor={id}>{label}</label>
      <select id={id} className="controlSelect" value={value} onChange={onChange}>
        {children}
      </select>
    </div>
  );
}

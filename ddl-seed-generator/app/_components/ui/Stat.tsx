import type { ReactNode } from "react";

/**
 * miniStats / analysisStrip의 단일 통계 항목(라벨 + 값).
 * 상위 .miniStats / .analysisStrip 컨테이너의 자식 div로 렌더되어 스타일을 받는다.
 */
export default function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

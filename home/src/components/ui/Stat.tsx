/**
 * 히어로 영역의 단일 통계 항목(값 + 라벨).
 * tabular는 숫자 정렬용으로, 퍼센트 등 비정수 값은 false로 끈다.
 */
interface StatProps {
  value: string | number;
  label: string;
  tabular?: boolean;
}

export default function Stat({ value, label, tabular = true }: StatProps) {
  return (
    <span>
      <span className={`font-bold text-gray-900 dark:text-white${tabular ? ' tabular-nums' : ''}`}>
        {value}
      </span>
      <span className="text-gray-400 dark:text-white/30 ml-1">{label}</span>
    </span>
  );
}

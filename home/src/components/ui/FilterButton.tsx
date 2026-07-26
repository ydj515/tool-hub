/**
 * 태그 필터에 쓰는 알약형 토글 버튼.
 * 활성/비활성 시각 상태를 캡슐화해 호출부의 className 중복을 없앤다.
 */
interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function FilterButton({ label, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`text-caption font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
        active
          ? 'bg-primary text-on-primary border-primary'
          : 'text-muted border-line hover:border-primary hover:text-primary'
      }`}
    >
      {label}
    </button>
  );
}

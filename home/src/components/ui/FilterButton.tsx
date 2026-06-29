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
      className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
        active
          ? 'bg-primary text-white border-primary'
          : 'text-gray-400 dark:text-white/40 border-black/[0.10] dark:border-white/[0.10] hover:border-primary-light hover:text-primary dark:hover:text-primary-light'
      }`}
    >
      {label}
    </button>
  );
}

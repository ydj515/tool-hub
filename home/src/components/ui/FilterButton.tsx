interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function FilterButton({ label, active, onClick }: FilterButtonProps) {
  return <button onClick={onClick} aria-pressed={active} className="categoryButton">{label}</button>;
}

export type WorkflowStep = 'input' | 'review' | 'export';

const steps: Array<{ id: WorkflowStep; label: string }> = [
  { id: 'input', label: '명세 입력' },
  { id: 'review', label: '테스트 검토' },
  { id: 'export', label: '내보내기' },
];

export function StepNavigator({ current }: { current: WorkflowStep }) {
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <nav className="step-navigator" aria-label="생성 단계">
      <ol>
        {steps.map((step, index) => (
          <li key={step.id} className={index <= currentIndex ? 'is-reached' : ''} aria-current={step.id === current ? 'step' : undefined}>
            <span className="step-index">{index + 1}</span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

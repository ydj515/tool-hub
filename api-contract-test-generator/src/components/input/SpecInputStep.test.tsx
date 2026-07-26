import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (value: string) => void }) => (
    <textarea aria-label="OpenAPI 명세 편집기" value={value} onChange={(event) => onChange?.(event.target.value)} />
  ),
}));

import { SpecInputStep } from './SpecInputStep';

describe('SpecInputStep', () => {
  it('OpenAPI 3.1 예제를 불러오고 분석을 시작한다', async () => {
    const user = userEvent.setup();
    const onSourceChange = vi.fn();
    const onAnalyze = vi.fn();
    render(
      <SpecInputStep
        source=""
        diagnostics={[]}
        disabled={false}
        canAnalyze
        onSourceChange={onSourceChange}
        onFile={vi.fn()}
        onAnalyze={onAnalyze}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'OpenAPI 3.1 예제' }));
    expect(onSourceChange).toHaveBeenCalledWith(expect.stringContaining('openapi: 3.1'));
    await user.click(screen.getByRole('button', { name: '테스트 생성' }));
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });
});

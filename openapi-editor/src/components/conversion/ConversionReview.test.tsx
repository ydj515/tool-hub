import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConversionCandidate } from '../../domain/document';
import { ConversionReview } from './ConversionReview';

function candidate(targetValid: boolean): ConversionCandidate {
  return {
    revision: 1,
    sourceVersion: 'openapi-3.1',
    targetVersion: 'openapi-3.2',
    sourceSnapshot: 'openapi: 3.1.2',
    targetDocument: { openapi: '3.2.0' },
    targetText: 'openapi: 3.2.0',
    diagnostics: [],
    targetValid,
  };
}

describe('ConversionReview', () => {
  it('취소와 적용을 공통 Button으로 렌더하고 callback을 실행한다', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onApply = vi.fn();
    render(<ConversionReview candidate={candidate(true)} onCancel={onCancel} onApply={onApply} />);

    const cancel = screen.getByRole('button', { name: '취소' });
    const apply = screen.getByRole('button', { name: '편집기에 적용' });
    expect(cancel).toHaveAttribute('data-ds-button');
    expect(cancel).toHaveAttribute('data-variant', 'secondary');
    expect(apply).toHaveAttribute('data-ds-button');
    expect(apply).toHaveAttribute('data-variant', 'primary');

    await user.click(cancel);
    await user.click(apply);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('유효하지 않은 변환 결과의 적용을 막는다', () => {
    render(<ConversionReview candidate={candidate(false)} onCancel={() => {}} onApply={() => {}} />);

    expect(screen.getByRole('button', { name: '편집기에 적용' })).toBeDisabled();
  });
});

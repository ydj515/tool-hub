import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('semantic variant class와 disabled 상태를 보존한다', () => {
    render(
      <>
        <Button>보조</Button>
        <Button variant="ghost">고스트</Button>
        <Button variant="icon" aria-label="아이콘" disabled>◐</Button>
      </>,
    );

    expect(screen.getByRole('button', { name: '보조' })).toHaveClass('btn', 'btn-secondary');
    expect(screen.getByRole('button', { name: '고스트' })).toHaveClass('btn', 'btn-ghost');
    expect(screen.getByRole('button', { name: '아이콘' })).toHaveClass('btn', 'btn-icon');
    expect(screen.getByRole('button', { name: '아이콘' })).toBeDisabled();
  });
});

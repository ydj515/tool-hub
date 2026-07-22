import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/editor/CodeEditor', async () => {
  const React = await import('react');
  return {
    CodeEditor: React.forwardRef<HTMLTextAreaElement, {
      ariaLabel: string;
      value: string;
      readOnly: boolean;
      onChange(value: string): void;
    }>(function MockEditor(props, ref) {
      return <textarea ref={ref} aria-label={props.ariaLabel} value={props.value} readOnly={props.readOnly} onChange={(event) => props.onChange(event.target.value)} />;
    }),
  };
});

describe('App shell', () => {
  it('도구 이름과 개인정보 안내를 표시하고 테마를 전환한다', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'JSON YAML Converter' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('입력 내용은 브라우저에서만 처리됩니다.')).toBeInTheDocument();
    expect(screen.getByTestId('converter-app-mark')).toHaveClass('studio-brand__mark');
    expect(screen.getByTestId('converter-app-mark').querySelector('svg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '테마 전환' })).toHaveClass('btn-icon');
    expect(screen.getByTestId('converter-studio-shell')).toBeInTheDocument();
    const banner = screen.getByTestId('converter-app-mark').closest('header');
    const directionGroup = screen.getByRole('radiogroup', { name: '변환 방향' });
    expect(banner).toHaveClass('studio-topbar');
    expect(banner).toContainElement(directionGroup);
    expect(screen.getByRole('radio', { name: 'JSON → YAML' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('button', { name: '테마 전환' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});

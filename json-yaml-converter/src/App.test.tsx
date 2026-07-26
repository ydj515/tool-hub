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
  it('정본 제품명과 공통 페이지·컨트롤 셸을 표시하고 테마를 전환한다', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const heading = await screen.findByRole('heading', { name: 'JSON/YAML Converter' }, { timeout: 5000 });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('JSON과 YAML을 변환하고 검증합니다.')).toBeInTheDocument();
    const banner = heading.closest('header');
    expect(banner?.querySelector('[data-ds-brand-mark] svg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /테마로 전환/ })).toHaveAttribute('data-ds-theme-toggle');
    expect(screen.getByTestId('converter-studio-shell')).toHaveAttribute('data-ds-page-shell');
    expect(container.querySelector('[data-ds-page-shell]')).toBeInTheDocument();
    const directionGroup = screen.getByRole('group', { name: '변환 방향' });
    expect(banner).toHaveAttribute('data-ds-tool-header');
    expect(banner).toContainElement(directionGroup);
    expect(screen.getByRole('button', { name: 'JSON → YAML' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /테마로 전환/ }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('브랜드 블록이 Tool Hub 로 돌아가는 링크다', async () => {
    render(<App />);

    const hubLink = await screen.findByRole('link', { name: /Tool Hub/ }, { timeout: 5000 });
    expect(hubLink).toHaveAttribute('href', 'https://tool-hub-rho.vercel.app/');
  });
});

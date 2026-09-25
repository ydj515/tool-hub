import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('도구 이름과 공통 작업 헤더를 렌더한다', () => {
    const html = renderToStaticMarkup(<Header theme="light" onToggleTheme={() => {}} />);

    expect(html).toContain('data-ds-tool-header="true"');
    expect(html).toContain('API Contract Test Generator');
    expect(html).toContain('Tool Hub');
    expect(html).not.toContain('>AC<');
    expect(html).toContain('다크 테마로 전환');
  });

  it('정본 ThemeToggle로 테마 변경을 요청한다', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    render(<Header theme="light" onToggleTheme={onToggleTheme} />);

    await user.click(screen.getByRole('button', { name: '다크 테마로 전환' }));

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '다크 테마로 전환' })).toHaveAttribute('data-ds-theme-toggle');
  });
});

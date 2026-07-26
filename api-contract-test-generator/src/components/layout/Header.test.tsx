import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('기능 glyph와 공통 카드 셸을 렌더한다', () => {
    const html = renderToStaticMarkup(<Header theme="light" onToggleTheme={() => {}} />);

    expect(html).toContain('data-ds-tool-header="true"');
    expect(html).toContain('API Contract Test Generator');
    expect(html).toContain('OpenAPI 계약에서 테스트를 생성합니다.');
    expect(html).toContain('명세와 결과는 브라우저 밖으로 전송하지 않습니다.');
    expect(html).not.toContain('>AC<');
    expect(html).toContain('다크 테마로 전환');
    expect(html.indexOf('privacy-note')).toBeLessThan(html.indexOf('data-ds-theme-toggle'));
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

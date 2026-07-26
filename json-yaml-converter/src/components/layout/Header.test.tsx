import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

describe('JSON/YAML Converter Header', () => {
  it('정본 제품명과 공통 셸을 actions 다음 utilities 순서로 렌더링한다', () => {
    const html = renderToStaticMarkup(
      <Header
        theme="light"
        direction="json-to-yaml"
        onDirectionChange={() => {}}
        onToggleTheme={() => {}}
      />,
    );

    expect(html).toContain('data-ds-tool-header="true"');
    expect(html).toContain('JSON/YAML Converter');
    expect(html).toContain('data-ds-segmented="true"');
    expect(html).toContain('JSON → YAML');
    expect(html).toContain('data-ds-theme-toggle="true"');
    expect(html.indexOf('data-ds-segmented')).toBeLessThan(
      html.indexOf('data-ds-theme-toggle'),
    );
  });

  it('aria-pressed 방향 그룹에서 선택 변경 callback을 호출한다', async () => {
    const user = userEvent.setup();
    const onDirectionChange = vi.fn();

    render(
      <Header
        theme="light"
        direction="json-to-yaml"
        onDirectionChange={onDirectionChange}
        onToggleTheme={() => {}}
      />,
    );

    const directionGroup = screen.getByRole('group', { name: '변환 방향' });
    expect(directionGroup).toContainElement(screen.getByRole('button', { name: 'JSON → YAML' }));
    expect(screen.getByRole('button', { name: 'JSON → YAML' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'YAML → JSON' })).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: 'YAML → JSON' }));

    expect(onDirectionChange).toHaveBeenCalledWith('yaml-to-json');
  });
});

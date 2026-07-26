import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Topbar } from './Topbar';

type TopbarProps = ComponentProps<typeof Topbar>;

function createProps(overrides: Partial<TopbarProps> = {}): TopbarProps {
  return {
    filename: undefined,
    format: 'yaml',
    target: 'openapi-3.1',
    conversionEnabled: false,
    reviewing: false,
    theme: 'light',
    onFile: vi.fn(),
    onTarget: vi.fn(),
    onDownloadSample: vi.fn(),
    onConvert: vi.fn(),
    onDownload: vi.fn(),
    canDownloadYaml: false,
    canDownloadJson: false,
    onRestore: vi.fn(),
    canRestore: false,
    onToggleTheme: vi.fn(),
    ...overrides,
  };
}

describe('OpenAPI Editor Topbar', () => {
  it('공통 카드 셸에서 승인된 제품명과 단일 action row를 렌더한다', () => {
    const html = renderToStaticMarkup(<Topbar {...createProps()} />);

    expect(html).toContain('OpenAPI Editor');
    expect(html).toContain('data-ds-tool-header="true"');
    expect(html).toContain('더보기');
    expect(html).not.toContain('topbar-secondary-row');
  });

  it('대상 버전, 업로드, 변환, 더보기를 지정된 순서로 배치하고 테마를 utilities 마지막에 둔다', () => {
    render(<Topbar {...createProps()} />);

    const actions = document.querySelector<HTMLElement>('[data-ds-tool-actions]');
    const utilities = document.querySelector('[data-ds-tool-utilities]');
    if (!actions || !utilities) throw new Error('공통 헤더 슬롯을 찾을 수 없습니다.');

    expect(
      Array.from(actions.querySelectorAll('select, button')).map((control) =>
        control.getAttribute('aria-label') ?? control.textContent?.trim(),
      ),
    ).toEqual(['대상 버전', '파일 업로드', '문서 변환', '더보기 메뉴']);
    expect(utilities.lastElementChild).toBe(screen.getByRole('button', { name: '다크 테마로 전환' }));
    expect(within(actions).getAllByRole('button').every((button) => button.hasAttribute('data-ds-button'))).toBe(true);
  });

  it('review 상태와 현재 문서 상태에 맞게 action을 비활성화한다', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Topbar {...createProps()} />);

    expect(screen.getByLabelText('대상 버전')).toBeEnabled();
    expect(screen.getByRole('button', { name: '파일 업로드' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '문서 변환' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '더보기 메뉴' }));
    expect(screen.getByRole('menuitem', { name: 'YAML 다운로드' })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: 'JSON 다운로드' })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: 'Swagger 2.0 샘플' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: '원본 복원' })).toBeDisabled();

    rerender(<Topbar {...createProps({ conversionEnabled: true, reviewing: true, canDownloadYaml: true, canDownloadJson: true, canRestore: true })} />);

    expect(screen.getByLabelText('대상 버전')).toBeDisabled();
    expect(screen.getByRole('button', { name: '파일 업로드' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '문서 변환' })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: 'YAML 다운로드' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'JSON 다운로드' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Swagger 2.0 샘플' })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: '원본 복원' })).toBeDisabled();
  });

  it('파일, 대상 버전, 변환, 다운로드, 샘플, 복원, 테마 callback을 실행한다', async () => {
    const user = userEvent.setup();
    const props = createProps({ conversionEnabled: true, canDownloadYaml: true, canDownloadJson: true, canRestore: true });
    render(<Topbar {...props} />);

    await user.selectOptions(screen.getByLabelText('대상 버전'), 'openapi-3.2');
    expect(props.onTarget).toHaveBeenCalledWith('openapi-3.2');

    const file = new File(['openapi: 3.1.2'], 'openapi.yaml', { type: 'application/yaml' });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('파일 입력을 찾을 수 없습니다.');
    await user.upload(input, file);
    expect(props.onFile).toHaveBeenCalledWith(file);

    await user.click(screen.getByRole('button', { name: '문서 변환' }));
    expect(props.onConvert).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: '더보기 메뉴' }));
    await user.click(screen.getByRole('menuitem', { name: 'YAML 다운로드' }));
    expect(props.onDownload).toHaveBeenCalledWith('yaml');
    expect(screen.queryByRole('menu', { name: '더보기 작업' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '더보기 메뉴' }));
    await user.click(screen.getByRole('menuitem', { name: 'OpenAPI 3.2.0 샘플' }));
    expect(props.onDownloadSample).toHaveBeenCalledWith('openapi-3.2');

    await user.click(screen.getByRole('button', { name: '더보기 메뉴' }));
    await user.click(screen.getByRole('menuitem', { name: '원본 복원' }));
    expect(props.onRestore).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: '다크 테마로 전환' }));
    expect(props.onToggleTheme).toHaveBeenCalledOnce();
  });

  it('포커스로 메뉴를 열고 Escape, 포커스 이탈, 외부 포인터 입력으로 닫는다', async () => {
    const user = userEvent.setup();
    render(<Topbar {...createProps()} />);
    const trigger = screen.getByRole('button', { name: '더보기 메뉴' });
    const home = screen.getByRole('link', { name: 'Tool Hub로 이동' });

    trigger.focus();
    await waitFor(() => expect(screen.getByRole('menu', { name: '더보기 작업' })).toBeInTheDocument());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu', { name: '더보기 작업' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    trigger.focus();
    home.focus();
    await waitFor(() => expect(screen.queryByRole('menu', { name: '더보기 작업' })).not.toBeInTheDocument());

    await user.click(trigger);
    expect(screen.getByRole('menu', { name: '더보기 작업' })).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('menu', { name: '더보기 작업' })).not.toBeInTheDocument();
  });
});

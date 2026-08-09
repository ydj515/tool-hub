import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useRef, useState, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { VersionGuideDialog } from './VersionGuideDialog';

function renderDialog(overrides: Partial<ComponentProps<typeof VersionGuideDialog>> = {}) {
  const returnFocusRef = createRef<HTMLButtonElement>();
  const onClose = vi.fn();
  render(<>
    <button ref={returnFocusRef}>더보기 메뉴</button>
    <VersionGuideDialog
      open
      sourceVersion="swagger-2.0"
      targetVersion="openapi-3.1"
      returnFocusRef={returnFocusRef}
      onClose={onClose}
      {...overrides}
    />
  </>);
  return { onClose, returnFocusRef };
}

function StatefulDialogHarness() {
  const [open, setOpen] = useState(true);
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={returnFocusRef}>더보기 메뉴</button>
    <VersionGuideDialog open={open} targetVersion="openapi-3.1" returnFocusRef={returnFocusRef} onClose={() => setOpen(false)} />
  </>;
}

describe('VersionGuideDialog', () => {
  it('네 지원 버전과 공식 명세 링크를 읽기 전용으로 표시한다', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Swagger/OpenAPI 버전 가이드' });
    const summaryTable = within(dialog).getByRole('table', { name: '버전별 핵심 차이와 선택 기준' });

    for (const label of ['Swagger 2.0', 'OpenAPI 3.0.4', 'OpenAPI 3.1.2', 'OpenAPI 3.2.0']) {
      expect(within(summaryTable).getByRole('rowheader', { name: new RegExp(label) })).toBeVisible();
      expect(within(dialog).getByRole('link', { name: `${label} 공식 명세 새 탭에서 열기` })).toHaveAttribute('target', '_blank');
    }
    expect(within(dialog).queryByRole('button', { name: /선택|변환/ })).not.toBeInTheDocument();
  });

  it('null 허용과 예시 키워드의 버전별 작성 문법을 구분해 표시한다', () => {
    renderDialog();
    const syntaxGuide = screen.getByRole('region', { name: '자주 헷갈리는 문법' });
    const swaggerRow = within(syntaxGuide).getByRole('rowheader', { name: 'Swagger 2.0' }).closest('tr');
    const openApi30Row = within(syntaxGuide).getByRole('rowheader', { name: 'OpenAPI 3.0.4' }).closest('tr');
    const openApi31Row = within(syntaxGuide).getByRole('rowheader', { name: 'OpenAPI 3.1.2' }).closest('tr');

    expect(swaggerRow).toHaveTextContent('표준 nullable 키워드 없음');
    expect(within(swaggerRow as HTMLElement).getByText('example: value')).toBeVisible();
    expect(within(swaggerRow as HTMLElement).getByText('examples: {application/json: value}')).toBeVisible();

    expect(within(openApi30Row as HTMLElement).getByText('nullable: true')).toBeVisible();
    expect(within(openApi30Row as HTMLElement).getByText('example: value')).toBeVisible();
    expect(within(openApi30Row as HTMLElement).getByText('examples: {named: {value: value}}')).toBeVisible();

    expect(within(openApi31Row as HTMLElement).getByText('type: [string, "null"]')).toBeVisible();
    expect(within(openApi31Row as HTMLElement).getByText('examples: [value]')).toBeVisible();
    expect(openApi31Row).toHaveTextContent('Schema에서는 배열');
    expect(openApi31Row).toHaveTextContent('Parameter/Media에서는 이름 기반 맵');
  });

  it('현재 문서와 변환 대상 버전을 독립적인 배지로 표시한다', () => {
    renderDialog();
    const summaryTable = screen.getByRole('table', { name: '버전별 핵심 차이와 선택 기준' });
    const swaggerRow = within(summaryTable).getByRole('rowheader', { name: /Swagger 2.0/ }).closest('tr');
    const openApi31Row = within(summaryTable).getByRole('rowheader', { name: /OpenAPI 3.1.2/ }).closest('tr');

    expect(swaggerRow).toHaveTextContent('현재 문서');
    expect(swaggerRow).not.toHaveTextContent('변환 대상');
    expect(openApi31Row).toHaveTextContent('변환 대상');
    expect(openApi31Row).not.toHaveTextContent('현재 문서');
  });

  it('같은 버전이면 현재 문서와 변환 대상 배지를 모두 표시한다', () => {
    renderDialog({ sourceVersion: 'openapi-3.1', targetVersion: 'openapi-3.1' });
    const summaryTable = screen.getByRole('table', { name: '버전별 핵심 차이와 선택 기준' });
    const row = within(summaryTable).getByRole('rowheader', { name: /OpenAPI 3.1.2/ }).closest('tr');

    expect(row).toHaveTextContent('현재 문서');
    expect(row).toHaveTextContent('변환 대상');
  });

  it('Escape로 닫고 더보기 메뉴로 포커스를 복원한다', async () => {
    const user = userEvent.setup();
    render(<StatefulDialogHarness />);
    await waitFor(() => expect(screen.getByRole('button', { name: '버전 가이드 닫기' })).toHaveFocus());

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '더보기 메뉴' })).toHaveFocus();
  });

  it('열릴 때의 복귀 대상을 저장해 ref가 바뀌어도 원래 트리거로 돌아간다', () => {
    const returnFocusRef = createRef<HTMLButtonElement>();
    const props = { targetVersion: 'openapi-3.1' as const, returnFocusRef, onClose: vi.fn() };
    const { rerender } = render(<>
      <button ref={returnFocusRef}>원래 더보기 메뉴</button>
      <VersionGuideDialog {...props} open />
    </>);
    const originalTrigger = screen.getByRole('button', { name: '원래 더보기 메뉴' });
    const replacement = document.createElement('button');
    replacement.textContent = '교체된 대상';
    document.body.append(replacement);
    returnFocusRef.current = replacement;

    rerender(<>
      <button>원래 더보기 메뉴</button>
      <VersionGuideDialog {...props} open={false} />
    </>);

    expect(originalTrigger).toHaveFocus();
    replacement.remove();
  });

  it('마지막 링크에서 Tab을 누르면 닫기 버튼으로 순환한다', async () => {
    const user = userEvent.setup();
    renderDialog();
    const lastLink = screen.getByRole('link', { name: 'OpenAPI 3.2.0 공식 명세 새 탭에서 열기' });
    lastLink.focus();

    await user.tab();

    expect(screen.getByRole('button', { name: '버전 가이드 닫기' })).toHaveFocus();
  });

  it('배경을 선택하면 닫기 동작을 실행한다', () => {
    const { onClose } = renderDialog();
    const backdrop = screen.getByRole('dialog').parentElement;
    if (!backdrop) throw new Error('버전 가이드 배경을 찾을 수 없습니다.');

    fireEvent.mouseDown(backdrop);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('열린 동안 배경 스크롤을 막고 닫히면 기존 값을 복원한다', () => {
    document.body.style.overflow = 'auto';
    const props = {
      open: true,
      sourceVersion: undefined,
      targetVersion: 'openapi-3.1' as const,
      returnFocusRef: createRef<HTMLButtonElement>(),
      onClose: vi.fn(),
    };
    const { rerender } = render(<VersionGuideDialog {...props} />);

    expect(document.body.style.overflow).toBe('hidden');
    rerender(<VersionGuideDialog {...props} open={false} />);
    expect(document.body.style.overflow).toBe('auto');
  });
});

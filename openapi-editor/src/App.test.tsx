import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/editor/CodeEditor', () => ({
  CodeEditor: () => <textarea aria-label="OpenAPI 문서 편집기" />,
}));

vi.mock('./components/preview/SwaggerPreview', () => ({
  SwaggerPreview: () => <div aria-label="Swagger UI 미리보기" />,
}));

describe('openapi-editor App', () => {
  it('renders the editor workspace shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'openapi-editor' })).toBeInTheDocument();
    expect(screen.getByLabelText('핵심 작업')).toBeInTheDocument();
    expect(screen.getByLabelText('보조 작업')).toBeInTheDocument();
    const formatMenu = screen.getByLabelText('형식 메뉴');
    expect(formatMenu.closest('.editor-header')).not.toBeNull();
    expect(formatMenu.closest('.topbar-secondary-row')).toBeNull();
    expect(screen.getByLabelText('내보내기 메뉴')).toBeInTheDocument();
    expect(screen.getByLabelText('샘플 메뉴')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '테마 전환' }).closest('.topbar-main-row')).not.toBeNull();
    expect(screen.getByRole('button', { name: '테마 전환' }).closest('.primary-actions')).toBeNull();
    expect(screen.getByRole('button', { name: '파일 업로드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '변환' })).toBeDisabled();
    expect(screen.getAllByRole('option', { name: 'OpenAPI 3.2.0' })).toHaveLength(1);
    expect(screen.getByLabelText('문서 탐색기')).toBeInTheDocument();
    expect(screen.getByLabelText('문서 편집기')).toBeInTheDocument();
    expect(screen.getByLabelText('API 미리보기')).toBeInTheDocument();
  });

  it('toggles the document theme', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '테마 전환' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('renders the workspace status before the workspace grid', () => {
    render(<App />);

    const statusbar = screen.getByText('입력 대기').closest('.workspace-statusbar');
    const workspaceGrid = document.querySelector('main.workspace-grid');

    expect(statusbar).not.toBeNull();
    expect(workspaceGrid).not.toBeNull();
    expect(statusbar!.compareDocumentPosition(workspaceGrid!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders direct sample downloads without a sample selector', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByLabelText('샘플 버전')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '샘플 다운로드' })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('샘플 메뉴'));

    expect(screen.getByRole('menuitem', { name: 'Swagger 2.0 샘플 다운로드' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'OpenAPI 3.2.0 샘플 다운로드' })).toBeInTheDocument();
  });

  it.each([
    ['탐색기 접기', '탐색기 열기', () => screen.queryByRole('tablist', { name: '탐색기 보기' }), () => screen.getByRole('tablist', { name: '탐색기 보기' })],
    ['미리보기 접기', '미리보기 열기', () => screen.queryByLabelText('Swagger UI 미리보기'), () => screen.getByLabelText('Swagger UI 미리보기')],
  ])('restores a collapsed panel through its visible reopen control', async (closeLabel, openLabel, collapsedContent, restoredContent) => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: closeLabel }));

    expect(collapsedContent()).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: openLabel }));

    expect(restoredContent()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: closeLabel })).toBeVisible();
  });
});

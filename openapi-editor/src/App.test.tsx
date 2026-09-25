import { fireEvent, render, screen } from '@testing-library/react';
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
  it('shows a file drop hint across nested regions and clears it on exit', () => {
    render(<App />);
    const dataTransfer = { types: ['Files'], files: [] };
    fireEvent.dragEnter(document.body, { dataTransfer });
    fireEvent.dragEnter(screen.getByLabelText('문서 편집기'), { dataTransfer });
    fireEvent.dragLeave(screen.getByLabelText('문서 편집기'), { dataTransfer });
    expect(screen.getByText('파일을 놓으면 OpenAPI 문서를 불러옵니다.')).toBeVisible();
    fireEvent.dragLeave(document.body, { dataTransfer });
    expect(screen.queryByText('파일을 놓으면 OpenAPI 문서를 불러옵니다.')).not.toBeInTheDocument();
  });

  it('does not intercept text dragging', () => {
    render(<App />);
    const dataTransfer = { types: ['text/plain'], files: [] };
    fireEvent.dragEnter(document.body, { dataTransfer });
    expect(fireEvent.dragOver(document.body, { dataTransfer })).toBe(true);
    expect(fireEvent.drop(document.body, { dataTransfer })).toBe(true);
    expect(screen.queryByText('파일을 놓으면 OpenAPI 문서를 불러옵니다.')).not.toBeInTheDocument();
  });

  it('renders the editor workspace shell', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'OpenAPI Editor' })).toBeInTheDocument();
    expect(document.querySelector('[data-ds-page-shell]')).toHaveClass('app-shell');
    expect(document.querySelector('[data-ds-tool-header]')).toBeInTheDocument();
    const formatMenu = screen.getByLabelText('형식 메뉴');
    expect(formatMenu.closest('.editor-header')).not.toBeNull();
    expect(formatMenu.closest('[data-ds-tool-header]')).toBeNull();
    expect(screen.getByLabelText('더보기 메뉴')).toBeInTheDocument();
    const utilities = document.querySelector('[data-ds-tool-utilities]');
    expect(utilities?.lastElementChild).toBe(screen.getByRole('button', { name: /테마로 전환/ }));
    expect(screen.getByRole('button', { name: '파일 업로드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '문서 변환' })).toBeDisabled();
    expect(screen.getAllByRole('option', { name: 'OpenAPI 3.2.0' })).toHaveLength(1);
    expect(screen.getByLabelText('문서 탐색기')).toBeInTheDocument();
    expect(screen.getByLabelText('문서 편집기')).toBeInTheDocument();
    expect(screen.getByLabelText('API 미리보기')).toBeInTheDocument();
  });

  it('toggles the document theme', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /테마로 전환/ }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('브랜드 블록이 Tool Hub 로 돌아가는 링크다', () => {
    render(<App />);

    const hubLink = screen.getByRole('link', { name: /Tool Hub/ });
    expect(hubLink).toHaveAttribute('href', 'https://tool-hub-rho.vercel.app/');
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

    await user.click(screen.getByLabelText('더보기 메뉴'));

    expect(screen.getByRole('menuitem', { name: 'Swagger 2.0 샘플' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'OpenAPI 3.2.0 샘플' })).toBeInTheDocument();
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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DocumentEditor } from './DocumentEditor';

vi.mock('./CodeEditor', () => ({
  CodeEditor: () => <textarea aria-label="OpenAPI 문서 편집기" />,
}));

describe('DocumentEditor', () => {
  it('형식 메뉴의 다섯 작업을 공통 Button으로 렌더하고 callback 후 닫는다', async () => {
    const user = userEvent.setup();
    const onConvertFormat = vi.fn();
    render(
      <DocumentEditor
        source="openapi: 3.1.2"
        format="yaml"
        theme="light"
        diagnostics={[]}
        onChange={() => {}}
        formatConversionEnabled
        reviewing={false}
        onConvertFormat={onConvertFormat}
        onRedetect={() => {}}
        onForceFormat={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: '형식 메뉴' }));
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(5);
    expect(items.every((item) => item.hasAttribute('data-ds-button'))).toBe(true);

    await user.click(screen.getByRole('menuitem', { name: 'JSON으로 변환' }));
    expect(onConvertFormat).toHaveBeenCalledWith('json');
    expect(screen.queryByRole('menu', { name: '형식 작업' })).not.toBeInTheDocument();
  });
});

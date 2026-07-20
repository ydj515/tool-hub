import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodeEditor, type CodeEditorHandle } from './CodeEditor';

vi.mock('../../editor/setupMonaco', () => ({ setupMonaco: vi.fn() }));

const setModelMarkers = vi.fn();
const revealPositionInCenter = vi.fn();
const setPosition = vi.fn();
const focus = vi.fn();
const executeEdits = vi.fn();
const pushUndoStop = vi.fn();
const model = {
  getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
  getFullModelRange: () => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 3 }),
};

vi.mock('@monaco-editor/react', () => ({
  loader: { config: vi.fn() },
  Editor: ({ onMount }: { onMount?: (editor: unknown, monaco: unknown) => void }) => {
    onMount?.(
      { getModel: () => model, revealPositionInCenter, setPosition, focus, executeEdits, pushUndoStop },
      { editor: { setModelMarkers }, MarkerSeverity: { Error: 8 } },
    );
    return <div data-testid="monaco-editor" />;
  },
}));

describe('CodeEditor', () => {
  it('진단 범위를 Monaco marker로 등록하고 위치에 포커스한다', () => {
    const ref = createRef<CodeEditorHandle>();
    render(
      <CodeEditor
        ref={ref}
        ariaLabel="JSON 원본"
        value="{}"
        format="json"
        theme="light"
        readOnly={false}
        diagnostic={{
          format: 'json', code: 'X', message: '오류', startOffset: 1, endOffset: 2, line: 1, column: 2,
        }}
        onChange={vi.fn()}
      />,
    );

    expect(setModelMarkers).toHaveBeenCalledWith(model, 'json-yaml-converter', [
      expect.objectContaining({
        startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 3, message: '오류',
      }),
    ]);

    ref.current?.focusDiagnostic();

    expect(revealPositionInCenter).toHaveBeenCalledWith({ lineNumber: 1, column: 2 });
    expect(setPosition).toHaveBeenCalledWith({ lineNumber: 1, column: 2 });
    expect(focus).toHaveBeenCalled();
  });

  it('Pretty 결과를 undo 가능한 전체 문서 edit로 적용한다', () => {
    const ref = createRef<CodeEditorHandle>();
    render(<CodeEditor ref={ref} ariaLabel="원본" value="{}" format="json" theme="light" readOnly={false} diagnostic={null} onChange={vi.fn()} />);

    ref.current?.replaceAll('{\n}\n');

    expect(pushUndoStop).toHaveBeenCalledTimes(2);
    expect(executeEdits).toHaveBeenCalledWith('pretty', [expect.objectContaining({ text: '{\n}\n' })]);
  });
});

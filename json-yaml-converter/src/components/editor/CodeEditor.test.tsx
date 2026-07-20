import { createRef } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeEditor, type CodeEditorHandle } from './CodeEditor';

vi.mock('../../editor/setupMonaco', () => ({ setupMonaco: vi.fn() }));

const setModelMarkers = vi.fn();
const revealPositionInCenter = vi.fn();
const setPosition = vi.fn();
const focus = vi.fn();
const executeEdits = vi.fn();
const pushUndoStop = vi.fn();
const disposeModelListener = vi.fn();
const modelA = {
  getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
  getFullModelRange: () => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 3 }),
};
const modelB = {
  getPositionAt: (offset: number) => ({ lineNumber: 2, column: offset + 1 }),
  getFullModelRange: () => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 2, endColumn: 3 }),
};
let currentModel = modelA;
let mountEditor: ((editor: unknown, monaco: unknown) => void) | undefined;
let changeModel: (() => void) | undefined;

const editor = {
  getModel: () => currentModel,
  onDidChangeModel: (listener: () => void) => {
    changeModel = listener;
    return { dispose: disposeModelListener };
  },
  revealPositionInCenter,
  setPosition,
  focus,
  executeEdits,
  pushUndoStop,
};
const monaco = { editor: { setModelMarkers }, MarkerSeverity: { Error: 8 } };

vi.mock('@monaco-editor/react', () => ({
  loader: { config: vi.fn() },
  Editor: ({ onMount }: { onMount?: (editor: unknown, monaco: unknown) => void }) => {
    mountEditor = onMount;
    return <div data-testid="monaco-editor" />;
  },
}));

describe('CodeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentModel = modelA;
    mountEditor = undefined;
    changeModel = undefined;
  });

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

    act(() => mountEditor?.(editor, monaco));

    expect(setModelMarkers).toHaveBeenCalledWith(modelA, 'json-yaml-converter', [
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
    act(() => mountEditor?.(editor, monaco));

    ref.current?.replaceAll('{\n}\n');

    expect(pushUndoStop).toHaveBeenCalledTimes(2);
    expect(executeEdits).toHaveBeenCalledWith('pretty', [expect.objectContaining({ text: '{\n}\n' })]);
  });

  it('지연된 Monaco mount 뒤에도 초기 diagnostic marker를 등록한다', () => {
    render(<CodeEditor ariaLabel="원본" value="{}" format="json" theme="light" readOnly={false} diagnostic={{
      format: 'json', code: 'X', message: '초기 오류', startOffset: 1, endOffset: 2, line: 1, column: 2,
    }} onChange={vi.fn()} />);

    expect(setModelMarkers).not.toHaveBeenCalled();
    act(() => mountEditor?.(editor, monaco));

    expect(setModelMarkers).toHaveBeenCalledWith(modelA, 'json-yaml-converter', [
      expect.objectContaining({ message: '초기 오류' }),
    ]);
  });

  it('model 교체 시 이전 marker를 정리하고 새 model에 다시 적용한 뒤 unmount에서 구독을 해제한다', () => {
    const { unmount } = render(<CodeEditor ariaLabel="원본" value="{}" format="json" theme="light" readOnly={false} diagnostic={{
      format: 'json', code: 'X', message: '오류', startOffset: 1, endOffset: 2, line: 1, column: 2,
    }} onChange={vi.fn()} />);

    act(() => mountEditor?.(editor, monaco));
    expect(setModelMarkers).toHaveBeenCalledWith(modelA, 'json-yaml-converter', [expect.any(Object)]);

    currentModel = modelB;
    act(() => changeModel?.());

    expect(setModelMarkers).toHaveBeenCalledWith(modelA, 'json-yaml-converter', []);
    expect(setModelMarkers).toHaveBeenCalledWith(modelB, 'json-yaml-converter', [
      expect.objectContaining({ startLineNumber: 2, message: '오류' }),
    ]);

    unmount();

    expect(setModelMarkers).toHaveBeenCalledWith(modelB, 'json-yaml-converter', []);
    expect(disposeModelListener).toHaveBeenCalledTimes(1);
  });
});

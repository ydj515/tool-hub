import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Editor, type Monaco, type OnMount } from '@monaco-editor/react';
import type { Diagnostic, DataFormat } from '../../lib/diagnostics';
import type { Theme } from '../../theme';
import { setupMonaco } from '../../editor/setupMonaco';

setupMonaco();

const MARKER_OWNER = 'json-yaml-converter';

export interface CodeEditorHandle {
  focusDiagnostic(): void;
  replaceAll(value: string): void;
}

interface CodeEditorProps {
  ariaLabel: string;
  value: string;
  format: DataFormat;
  theme: Theme;
  readOnly: boolean;
  diagnostic: Diagnostic | null;
  onChange(value: string): void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { ariaLabel, value, format, theme, readOnly, diagnostic, onChange },
  ref,
) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!monaco || !model) return;

    const markers = diagnostic
      ? (() => {
          const start = model.getPositionAt(diagnostic.startOffset);
          const end = model.getPositionAt(diagnostic.endOffset);
          return [{
            severity: monaco.MarkerSeverity.Error,
            message: diagnostic.message,
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: start.lineNumber === end.lineNumber && start.column === end.column
              ? start.column + 1
              : end.column,
          }];
        })()
      : [];

    monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
    return () => monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
  }, [diagnostic]);

  useImperativeHandle(ref, () => ({
    focusDiagnostic() {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (!editor || !model || !diagnostic) return;
      const position = model.getPositionAt(diagnostic.startOffset);
      editor.setPosition(position);
      editor.revealPositionInCenter(position);
      editor.focus();
    },
    replaceAll(nextValue: string) {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (!editor || !model) return;
      editor.pushUndoStop();
      editor.executeEdits('pretty', [{
        range: model.getFullModelRange(),
        text: nextValue,
        forceMoveMarkers: true,
      }]);
      editor.pushUndoStop();
    },
  }), [diagnostic]);

  return <Editor
    path={`${ariaLabel}.${format}`}
    value={value}
    language={format}
    theme={theme === 'dark' ? 'vs-dark' : 'vs'}
    onChange={(next) => onChange(next ?? '')}
    onMount={handleMount}
    loading={<div role="status">편집기를 불러오는 중입니다.</div>}
    options={{
      readOnly,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      wordWrap: 'off',
      fontSize: 13,
      lineHeight: 20,
      padding: { top: 12, bottom: 12 },
      renderValidationDecorations: 'on',
      ariaLabel,
    }}
  />;
});

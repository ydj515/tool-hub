import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Editor, type Monaco, type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { Diagnostic, DocumentFormat, SourceLocation } from '../../domain/document';
import type { Theme } from '../../theme';

export interface CodeEditorHandle {
  selectLocation(location: SourceLocation): void;
}

interface CodeEditorProps {
  value: string;
  format: DocumentFormat;
  theme: Theme;
  readOnly: boolean;
  diagnostics: Diagnostic[];
  onChange(value: string): void;
}

const MARKER_OWNER = 'openapi-studio';

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor({ value, format, theme, readOnly, diagnostics, onChange }, ref) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | undefined>(undefined);
  const monacoRef = useRef<Monaco | undefined>(undefined);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;
    monaco.editor.setModelMarkers(model, MARKER_OWNER, diagnostics.filter((item) => item.location).map((item) => ({
      severity: item.severity === 'error' ? monaco.MarkerSeverity.Error : item.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
      message: item.message,
      startLineNumber: item.location!.startLine,
      startColumn: item.location!.startColumn,
      endLineNumber: item.location!.endLine,
      endColumn: item.location!.endColumn,
    })));
    return () => monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
  }, [diagnostics]);

  useImperativeHandle(ref, () => ({
    selectLocation(location) {
      const editor = editorRef.current;
      if (!editor) return;
      editor.setSelection({ startLineNumber: location.startLine, startColumn: location.startColumn, endLineNumber: location.endLine, endColumn: location.endColumn });
      editor.revealPositionInCenter({ lineNumber: location.startLine, column: location.startColumn });
      editor.focus();
    },
  }), []);

  return <Editor
    height="100%"
    value={value}
    language={format}
    theme={theme === 'dark' ? 'vs-dark' : 'vs'}
    onChange={(next) => onChange(next ?? '')}
    onMount={onMount}
    loading={<div className="editor-loading" role="status">편집기를 불러오는 중입니다.</div>}
    options={{
      readOnly,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      wordWrap: 'off',
      fontSize: 13,
      lineHeight: 20,
      padding: { top: 12, bottom: 12 },
      glyphMargin: true,
      ariaLabel: 'OpenAPI 문서 편집기',
    }}
  />;
});

import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect, useRef } from 'react';
import type { Diagnostic } from '../../domain/diagnostic';
import type { Theme } from '../../theme';

interface SpecEditorProps {
  value: string;
  filename?: string;
  diagnostics: Diagnostic[];
  theme: Theme;
  disabled: boolean;
  onChange: (value: string) => void;
}

type EditorApi = Parameters<OnMount>[0];
type MonacoApi = Parameters<OnMount>[1];

export function SpecEditor({ value, filename, diagnostics, theme, disabled, onChange }: SpecEditorProps) {
  const editorRef = useRef<EditorApi | null>(null);
  const monacoRef = useRef<MonacoApi | null>(null);

  const updateMarkers = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;
    const blocking = diagnostics.find((diagnostic) => diagnostic.blocking && diagnostic.location);
    monaco.editor.setModelMarkers(model, 'openapi-contract', blocking?.location ? [{
      startLineNumber: blocking.location.startLine,
      startColumn: blocking.location.startColumn,
      endLineNumber: blocking.location.endLine,
      endColumn: blocking.location.endColumn,
      message: blocking.message,
      severity: monaco.MarkerSeverity.Error,
      code: blocking.code,
    }] : []);
  }, [diagnostics]);

  useEffect(updateMarkers, [updateMarkers]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    updateMarkers();
  };

  return (
    <section className="spec-editor" aria-label="OpenAPI 명세 편집기">
      <Editor
        height="100%"
        language={filename?.toLowerCase().endsWith('.json') ? 'json' : 'yaml'}
        value={value}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        onChange={(next) => onChange(next ?? '')}
        onMount={handleMount}
        options={{
          readOnly: disabled,
          minimap: { enabled: false },
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineHeight: 21,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </section>
  );
}

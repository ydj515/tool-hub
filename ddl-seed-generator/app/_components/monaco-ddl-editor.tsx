"use client";

import { useEffect, useRef } from "react";
import Editor, { loader, useMonaco, type OnMount } from "@monaco-editor/react";
import * as monacoLib from "monaco-editor";
import type { editor, IDisposable, languages } from "monaco-editor";

import type { Dialect, DdlSyntaxIssue } from "@/lib/types";

// 로컬 번들을 직접 사용해 CDN 요청 및 worker URL 404를 방지합니다.
loader.config({ monaco: monacoLib });

const SQL_KEYWORDS = [
  "CREATE TABLE",
  "ALTER TABLE",
  "ADD CONSTRAINT",
  "FOREIGN KEY",
  "REFERENCES",
  "PRIMARY KEY",
  "NOT NULL",
  "UNIQUE",
  "CHECK",
  "DEFAULT",
  "IF NOT EXISTS",
];

const SQL_TYPES_BY_DIALECT: Record<Dialect, string[]> = {
  postgresql: ["BIGINT", "INT", "INTEGER", "SMALLINT", "SERIAL", "BIGSERIAL", "VARCHAR", "TEXT", "CHAR", "BOOLEAN", "DECIMAL", "NUMERIC", "REAL", "DOUBLE PRECISION", "FLOAT", "TIMESTAMP", "DATE", "TIME", "UUID", "JSONB", "JSON", "BYTEA"],
  mysql: ["BIGINT", "INT", "INTEGER", "SMALLINT", "TINYINT", "AUTO_INCREMENT", "VARCHAR", "TEXT", "CHAR", "TINYTEXT", "LONGTEXT", "BOOLEAN", "TINYINT(1)", "DECIMAL", "NUMERIC", "FLOAT", "DOUBLE", "DATETIME", "TIMESTAMP", "DATE", "TIME", "JSON", "BLOB", "ENUM"],
  h2: ["BIGINT", "INT", "INTEGER", "SMALLINT", "IDENTITY", "VARCHAR", "VARCHAR2", "TEXT", "CHAR", "BOOLEAN", "DECIMAL", "NUMERIC", "REAL", "DOUBLE", "TIMESTAMP", "DATE", "TIME", "UUID", "JSON", "BINARY"],
};

const QUOTE_SNIPPETS: Record<Dialect, string> = {
  postgresql: '"identifier"',
  mysql: "`identifier`",
  h2: '"identifier"',
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  issues: DdlSyntaxIssue[];
  dialect: Dialect;
  tableNames: string[];
  columnNames: string[];
  onEditorMount: (editorInstance: editor.IStandaloneCodeEditor) => void;
  hasErrors: boolean;
}

export default function MonacoDdlEditor({
  value,
  onChange,
  issues,
  dialect,
  tableNames,
  columnNames,
  onEditorMount,
  hasErrors,
}: Props) {
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const completionDisposable = useRef<IDisposable | null>(null);
  const tableNamesRef = useRef<string[]>(tableNames);
  const columnNamesRef = useRef<string[]>(columnNames);
  const dialectRef = useRef<Dialect>(dialect);

  useEffect(() => { tableNamesRef.current = tableNames; }, [tableNames]);
  useEffect(() => { columnNamesRef.current = columnNames; }, [columnNames]);
  useEffect(() => { dialectRef.current = dialect; }, [dialect]);

  const handleMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
    onEditorMount(editorInstance);
  };

  // Sync validation markers
  useEffect(() => {
    if (!monaco || !editorRef.current) {
      return;
    }
    const model = editorRef.current.getModel();
    if (!model) {
      return;
    }

    const markers = issues.map((issue) => ({
      severity:
        issue.severity === "error"
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning,
      startLineNumber: issue.line,
      startColumn: issue.column,
      endLineNumber: issue.line,
      endColumn: issue.column + 1,
      message: issue.hint ? `${issue.message}\n${issue.hint}` : issue.message,
    }));

    monaco.editor.setModelMarkers(model, "ddl-validation", markers);
  }, [monaco, issues]);

  // Register autocomplete provider once per monaco instance
  useEffect(() => {
    if (!monaco) {
      return;
    }

    completionDisposable.current?.dispose();
    completionDisposable.current = monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const currentDialect = dialectRef.current;
        const types = SQL_TYPES_BY_DIALECT[currentDialect];
        const quoteSnippet = QUOTE_SNIPPETS[currentDialect];

        const suggestions: languages.CompletionItem[] = [
          ...SQL_KEYWORDS.map((kw) => ({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
          })),
          ...types.map((t) => ({
            label: t,
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: t,
            range,
          })),
          {
            label: quoteSnippet,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: quoteSnippet,
            detail: `${currentDialect} quoted identifier`,
            range,
          },
          ...tableNamesRef.current.map((name) => ({
            label: name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: name,
            detail: "table",
            range,
          })),
          ...columnNamesRef.current.map((name) => ({
            label: name,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: name,
            detail: "column",
            range,
          })),
        ];

        return { suggestions };
      },
    });

    return () => {
      completionDisposable.current?.dispose();
    };
  }, [monaco]);

  return (
    <div className={`monacoWrapper ${hasErrors ? "hasSyntaxError" : ""}`}>
      <Editor
        language="sql"
        value={value}
        theme="vs"
        onChange={(val) => onChange(val ?? "")}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 20,
          wordWrap: "off",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          padding: { top: 12, bottom: 12 },
          scrollbar: { vertical: "auto", horizontal: "auto" },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
        }}
      />
    </div>
  );
}

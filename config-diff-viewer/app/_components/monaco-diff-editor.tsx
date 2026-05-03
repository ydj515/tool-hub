"use client";

import { DiffEditor, loader } from "@monaco-editor/react";
import * as monacoLib from "monaco-editor";
import type { ConfigFormat } from "@/lib/types";

loader.config({ monaco: monacoLib });

function toMonacoLang(format: ConfigFormat): string {
  switch (format) {
    case "yaml": return "yaml";
    case "json": return "json";
    case "properties": return "ini";
    case "env": return "ini";
  }
}

interface Props {
  original: string;
  modified: string;
  formatA: ConfigFormat;
  formatB: ConfigFormat;
}

export default function MonacoDiffEditor({ original, modified, formatA, formatB }: Props) {
  return (
    <DiffEditor
      original={original}
      modified={modified}
      originalLanguage={toMonacoLang(formatA)}
      modifiedLanguage={toMonacoLang(formatB)}
      theme="vs"
      height="420px"
      options={{
        renderSideBySide: true,
        readOnly: true,
        originalEditable: false,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        wordWrap: "off",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 10, bottom: 10 },
        scrollbar: { vertical: "auto", horizontal: "auto" },
        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
        renderWhitespace: "none",
        diffAlgorithm: "advanced",
      }}
    />
  );
}

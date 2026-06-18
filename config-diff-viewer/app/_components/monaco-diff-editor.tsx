/**
 * 원본과 대상 설정 파일을 나란히 보여주는 Monaco diff 래퍼다.
 */
"use client";

import { DiffEditor, loader } from "@monaco-editor/react";
import * as monacoLib from "monaco-editor";
import type { ConfigFormat } from "@/lib/types";

// MonacoEnvironment.getWorker를 설정하지 않으면 워커 생성 실패 경고가 발생합니다.
if (typeof window !== 'undefined') {
  window.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      if (label === 'json') {
        return new Worker(
          new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url)
        );
      }
      // yaml/ini는 별도 언어 워커 없음 — editor worker로 fallback
      return new Worker(
        new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url)
      );
    },
  };
}

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
  theme?: "light" | "dark";
}

export default function MonacoDiffEditor({ original, modified, formatA, formatB, theme = "light" }: Props) {
  return (
    <DiffEditor
      original={original}
      modified={modified}
      originalLanguage={toMonacoLang(formatA)}
      modifiedLanguage={toMonacoLang(formatB)}
      theme={theme === "dark" ? "vs-dark" : "vs"}
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

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker?worker';

declare global {
  interface Window {
    MonacoEnvironment?: { getWorker(moduleId: string, label: string): Worker };
  }
}

let configured = false;

export function setupMonaco(): void {
  if (configured) return;
  configured = true;

  window.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      return label === 'json' ? new JsonWorker() : new EditorWorker();
    },
  };
  loader.config({ monaco });
  monaco.json.jsonDefaults.setDiagnosticsOptions({ validate: false });

  if (!monaco.languages.getLanguages().some(({ id }) => id === 'yaml')) {
    monaco.languages.register({ id: 'yaml', extensions: ['.yaml', '.yml'] });
    monaco.languages.setMonarchTokensProvider('yaml', {
      tokenizer: {
        root: [
          [/#.*$/, 'comment'],
          [/^\s*[-?](?=\s)/, 'delimiter'],
          [/[&*][\w-]+/, 'tag'],
          [/![\w!:/.-]+/, 'tag'],
          [/(^|\s)(true|false|null|~)(?=\s|$)/, 'keyword'],
          [/(^|\s)[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?(?=\s|$)/i, 'number'],
          [/"(?:[^"\\]|\\.)*"/, 'string'],
          [/'(?:[^']|'')*'/, 'string'],
          [/[^\s:#][^:#]*?(?=\s*:)/, 'type.identifier'],
        ],
      },
    });
  }
}

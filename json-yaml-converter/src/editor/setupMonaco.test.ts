import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('setupMonaco', () => {
  it('Monaco 0.56의 공개 worker entrypoint를 사용한다', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/editor/setupMonaco.ts'), 'utf8');

    expect(source).toContain("monaco-editor/editor/editor.worker?worker");
    expect(source).toContain("monaco-editor/language/json/json.worker?worker");
  });

  it('Monaco 0.56의 최상위 JSON 설정 API를 사용한다', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/editor/setupMonaco.ts'), 'utf8');

    expect(source).toContain('monaco.json.jsonDefaults.setDiagnosticsOptions');
  });
});

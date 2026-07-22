import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('favicon', () => {
  it('document head가 ICO favicon을 선언한다', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(indexHtml).toContain('<link rel="icon" type="image/x-icon" href="/favicon.ico" />');
  });

  it('ICO favicon 파일을 제공한다', () => {
    const favicon = readFileSync(resolve(process.cwd(), 'public/favicon.ico'));
    expect(favicon.subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]));
  });
});

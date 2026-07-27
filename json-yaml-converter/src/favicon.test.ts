import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('favicon', () => {
  it('document head가 표준 favicon 링크와 제품명을 제공한다', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const document = new DOMParser().parseFromString(indexHtml, 'text/html');

    expect(document.title).toBe('JSON/YAML Converter');
    expect(
      Array.from(document.head.querySelectorAll<HTMLLinkElement>('link')).map((link) => ({
        rel: link.rel,
        href: link.getAttribute('href'),
        sizes: link.getAttribute('sizes'),
        type: link.type || null,
      })),
    ).toEqual([
      { rel: 'icon', href: '/favicon.svg', sizes: null, type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: null, type: 'image/x-icon' },
      { rel: 'icon', href: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { rel: 'icon', href: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: null, type: null },
      { rel: 'manifest', href: '/site.webmanifest', sizes: null, type: null },
    ]);
  });
});

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { WEB_TOOLS } from '../packages/design-system/products.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWED_BREAKPOINTS = new Set([767, 768, 1023, 1024, 1279, 1280]);
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const MEDIA_QUERY = /@media\b([^{}]+)\{/gi;
const WIDTH = /\b(?:min-|max-)?width\b/i;
const PIXEL_VALUE = /(?<![\w.-])([+-]?(?:\d+\.\d+|\d+|\.\d+)(?:e[+-]?\d+)?)px(?![\w-])/gi;

function cssFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') && !entry.name.startsWith('ds-') ? [path] : [];
  });
}

function mediaConditions(source) {
  const conditions = [];
  let depth = 0;
  let start = -1;

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '(') {
      if (depth === 0) start = index + 1;
      depth += 1;
    } else if (source[index] === ')' && depth > 0) {
      depth -= 1;
      if (depth === 0) conditions.push(source.slice(start, index));
    }
  }

  return conditions;
}

function breakpointsInCss(source) {
  const uncommented = source.replace(CSS_COMMENT, '');

  return Array.from(uncommented.matchAll(MEDIA_QUERY)).flatMap((media) => {
    return mediaConditions(media[1]).flatMap((condition) => {
      if (!WIDTH.test(condition)) return [];
      return Array.from(condition.matchAll(PIXEL_VALUE), (match) => Number(match[1]));
    });
  });
}

test('breakpoint parser가 주석을 제외하고 대소문자와 range syntax를 처리한다', () => {
  const source = `
    /* @media (max-width: 599px) { .commented { display: none; } } */
    @MEDIA (MAX-WIDTH: 600px) { .legacy { display: none; } }
    @media (767px <= width < 901px) { .range { display: block; } }
    @media (min-width: calc(900px)) { .calculated { display: block; } }
    @media (max-width: .768px) { .fractional { display: block; } }
    @media (min-width: 7.68e2px) { .exponent { display: block; } }
    @media (min-width: 1024px) and (max-width: 1279px) { .bounded { display: grid; } }
  `;

  assert.deepEqual(breakpointsInCss(source), [600, 767, 901, 900, 0.768, 768, 1024, 1279]);
});

describe('반응형 계약', () => {
  for (const product of WEB_TOOLS) {
    test(`${product.id}가 표준 breakpoint만 쓴다`, () => {
      const sourceRoot = product.stack === 'vite' ? 'src' : 'app';
      const offenders = [];
      const files = cssFiles(resolve(REPOSITORY_ROOT, product.id, sourceRoot));

      assert.ok(files.length > 0, `${product.id}의 source CSS를 찾지 못했다`);

      for (const file of files) {
        for (const breakpoint of breakpointsInCss(readFileSync(file, 'utf8'))) {
          if (!ALLOWED_BREAKPOINTS.has(breakpoint)) {
            offenders.push(`${relative(REPOSITORY_ROOT, file)}:${breakpoint}px`);
          }
        }
      }

      assert.deepEqual(offenders, []);
    });
  }
});

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
const FUNCTION_VALUE = /\b[a-z-][\w-]*\s*\(/i;
const PIXEL_VALUE = /(?<![\w.-])([+-]?(?:\d+\.\d+|\d+|\.\d+)(?:e[+-]?\d+)?)px(?![\w-])/gi;
const WIDTH_DIMENSION =
  /(?<![\w.-])([+-]?(?:\d+\.\d+|\d+|\.\d+)(?:e[+-]?\d+)?)([a-z%]+)(?![\w-])/gi;

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

function widthMediaConditions(source) {
  const uncommented = source.replace(CSS_COMMENT, '');

  return Array.from(uncommented.matchAll(MEDIA_QUERY)).flatMap((media) => {
    return mediaConditions(media[1]).filter((condition) => WIDTH.test(condition));
  });
}

function breakpointsInCss(source) {
  return widthMediaConditions(source).flatMap((condition) => {
    return Array.from(condition.matchAll(PIXEL_VALUE), (match) => Number(match[1]));
  });
}

function breakpointViolationsInCss(source) {
  return widthMediaConditions(source).flatMap((condition) => {
    if (FUNCTION_VALUE.test(condition)) return [`unsupported:${condition.trim()}`];

    const dimensions = Array.from(condition.matchAll(WIDTH_DIMENSION));
    if (dimensions.length === 0) return [`unsupported:${condition.trim()}`];

    return dimensions.flatMap((match) => {
      const value = Number(match[1]);
      const unit = match[2].toLowerCase();
      return unit === 'px' && ALLOWED_BREAKPOINTS.has(value) ? [] : [match[0]];
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

test('breakpoint policy가 비-px 단위와 해석할 수 없는 width 조건을 거부한다', () => {
  const source = `
    @media (min-width: 37.5rem) { .rem { display: block; } }
    @media (width < 50em) { .em { display: block; } }
    @media (min-width: var(--tablet)) { .variable { display: block; } }
    @media (min-width: var(--tablet, 768px)) { .variable-fallback { display: block; } }
    @media (min-width: calc(768px + 768px)) { .calculated { display: block; } }
  `;

  assert.deepEqual(breakpointViolationsInCss(source), [
    '37.5rem',
    '50em',
    'unsupported:min-width: var(--tablet)',
    'unsupported:min-width: var(--tablet, 768px)',
    'unsupported:min-width: calc(768px + 768px)',
  ]);
});

describe('반응형 계약', () => {
  for (const product of WEB_TOOLS) {
    test(`${product.id}가 표준 breakpoint만 쓴다`, () => {
      const sourceRoot = product.stack === 'vite' ? 'src' : 'app';
      const offenders = [];
      const files = cssFiles(resolve(REPOSITORY_ROOT, product.id, sourceRoot));

      assert.ok(files.length > 0, `${product.id}의 source CSS를 찾지 못했다`);

      for (const file of files) {
        for (const violation of breakpointViolationsInCss(readFileSync(file, 'utf8'))) {
          offenders.push(`${relative(REPOSITORY_ROOT, file)}:${violation}`);
        }
      }

      assert.deepEqual(offenders, []);
    });
  }
});

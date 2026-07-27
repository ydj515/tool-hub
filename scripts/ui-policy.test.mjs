import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const UI_HOLDERS = [
  'sign-maker/src/components/layout/Header.tsx',
  'sign-maker/index.html',
  'json-yaml-converter/src/components/layout/Header.tsx',
  'json-yaml-converter/index.html',
  'openapi-editor/src/components/layout/Topbar.tsx',
  'openapi-editor/index.html',
  'api-contract-test-generator/src/components/layout/Header.tsx',
  'api-contract-test-generator/src/components/input/SpecInputStep.tsx',
  'api-contract-test-generator/src/components/review/ReviewStep.tsx',
  'api-contract-test-generator/src/components/export/ExportStep.tsx',
  'api-contract-test-generator/src/components/review/EndpointNavigator.tsx',
  'api-contract-test-generator/src/components/review/TestCaseDetail.tsx',
  'api-contract-test-generator/index.html',
  'ddl-seed-generator/app/_components/Topbar.tsx',
  'ddl-seed-generator/app/_components/ControlPanel.tsx',
  'ddl-seed-generator/app/_components/ResultPanel.tsx',
  'ddl-seed-generator/app/layout.tsx',
  'config-diff-viewer/app/_components/Topbar.tsx',
  'config-diff-viewer/app/_components/analysis-options.tsx',
  'config-diff-viewer/app/_components/issue-badge.tsx',
  'config-diff-viewer/app/_components/stats-bar.tsx',
  'config-diff-viewer/app/layout.tsx',
  'dummy-file-generator/app/_components/GeneratorForm.tsx',
  'dummy-file-generator/app/_components/generator-client.tsx',
  'dummy-file-generator/app/layout.tsx',
];

const FAVICON_HOLDERS = [
  'home/index.html',
  'sign-maker/index.html',
  'json-yaml-converter/index.html',
  'openapi-editor/index.html',
  'api-contract-test-generator/index.html',
  'ddl-seed-generator/app/layout.tsx',
  'config-diff-viewer/app/layout.tsx',
  'dummy-file-generator/app/layout.tsx',
];

const PRODUCT_NAME_HOLDERS = [
  { path: 'sign-maker/index.html', expectedName: 'Sign Maker' },
  { path: 'json-yaml-converter/index.html', expectedName: 'JSON/YAML Converter' },
  { path: 'openapi-editor/index.html', expectedName: 'OpenAPI Editor' },
  {
    path: 'api-contract-test-generator/index.html',
    expectedName: 'API Contract Test Generator',
  },
  { path: 'ddl-seed-generator/app/layout.tsx', expectedName: 'DDL Seed Generator' },
  { path: 'config-diff-viewer/app/layout.tsx', expectedName: 'Config Diff Viewer' },
  { path: 'dummy-file-generator/app/layout.tsx', expectedName: 'Dummy File Generator' },
];

const FAVICON_FILES = [
  'favicon.svg',
  'favicon-32x32.png',
  'favicon-16x16.png',
  'apple-touch-icon.png',
  'site.webmanifest',
];

const PRODUCT_NAMES = PRODUCT_NAME_HOLDERS.map(({ expectedName }) => expectedName);

const BANNED_UI_COPY = [
  /Signature\s*&\s*Trace\s+Studio/i,
  /JSON\s+YAML\s+Converter/i,
  /<h1[^>]*>\s*openapi-editor\s*<\/h1>/i,
  />\s*(?:Draw|Upload|Generate|Sample|English|Endpoints)\s*</i,
  /Generate\s+File/i,
  /File\s+Format/i,
  /Target\s+Size/i,
  /realistic\s+seed/i,
  /\}\s*bytes\s*</i,
  /\bBytes\./i,
  /\bStep\s+[123]\b/i,
  /Selected\s+test/i,
];

const FAVICON_CONTRACTS = [
  { name: 'favicon.svg', href: '/favicon.svg', rel: 'icon', type: 'image/svg+xml' },
  {
    name: 'favicon-32x32.png',
    href: '/favicon-32x32.png',
    rel: 'icon',
    type: 'image/png',
    sizes: '32x32',
  },
  {
    name: 'favicon-16x16.png',
    href: '/favicon-16x16.png',
    rel: 'icon',
    type: 'image/png',
    sizes: '16x16',
  },
  { name: 'apple-touch-icon.png', href: '/apple-touch-icon.png', rel: 'apple-touch-icon' },
  { name: 'site.webmanifest', href: '/site.webmanifest', rel: 'manifest' },
];

function read(path) {
  return readFileSync(resolve(REPOSITORY_ROOT, path), 'utf8');
}

function flexibleProductName(name) {
  return new RegExp(
    name
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replaceAll(' ', '\\s+')
      .replace('/', '\\s*\\/\\s*'),
    'gi',
  );
}

function ownerProductName(path, source) {
  if (path.endsWith('.html')) {
    const uncommented = source.replace(/<!--[\s\S]*?-->/g, '');
    const titles = Array.from(
      uncommented.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi),
      (match) => match[1].trim(),
    );
    return titles.length === 1 ? titles[0] : undefined;
  }

  const uncommented = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const metadata = assignedObject(uncommented, 'metadata');
  return metadata && literalObjectPropertyNames(metadata)
    ? stringProperty(metadata, 'title')
    : undefined;
}

function violatesUiPolicy(path, source) {
  const owner = PRODUCT_NAME_HOLDERS.find((holder) => holder.path === path);
  if (owner && ownerProductName(path, source) !== owner.expectedName) return true;

  for (const productName of PRODUCT_NAMES) {
    const matches = source.matchAll(flexibleProductName(productName));
    if (Array.from(matches, (match) => match[0]).some((match) => match !== productName)) {
      return true;
    }
  }

  return BANNED_UI_COPY.some((pattern) => pattern.test(source));
}

function attributes(source) {
  return new Map(
    Array.from(source.matchAll(/([^\s"'=<>`]+)\s*=\s*(["'])(.*?)\2/g), (match) => [
      match[1].toLowerCase(),
      match[3],
    ]),
  );
}

function collectionAt(source, start) {
  const closing = { '{': '}', '[': ']', '(': ')' }[source[start]];
  if (!closing) return undefined;

  const stack = [];
  let quote;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{' || character === '[' || character === '(') {
      stack.push(character);
      continue;
    }
    if (character === '}' || character === ']' || character === ')') {
      stack.pop();
      if (stack.length === 0) return source.slice(start, index + 1);
    }
  }

  return undefined;
}

function topLevelSegments(source) {
  const segments = [];
  const stack = [];
  let start = 0;
  let quote;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{' || character === '[' || character === '(') {
      stack.push(character);
      continue;
    }
    if (character === '}' || character === ']' || character === ')') {
      stack.pop();
      continue;
    }
    if (character === ',' && stack.length === 0) {
      const segment = source.slice(start, index).trim();
      if (segment) segments.push(segment);
      start = index + 1;
    }
  }

  const segment = source.slice(start).trim();
  if (segment) segments.push(segment);
  return segments;
}

function literalObjectPropertyNames(object) {
  if (!object.startsWith('{') || !object.endsWith('}')) return undefined;

  const names = [];
  const seen = new Set();
  for (const segment of topLevelSegments(object.slice(1, -1))) {
    const property = segment.match(/^([A-Za-z_$][\w$]*)\s*:/);
    if (!property || seen.has(property[1])) return undefined;
    seen.add(property[1]);
    names.push(property[1]);
  }
  return names;
}

function literalObjectArray(array) {
  if (!array?.startsWith('[') || !array.endsWith(']')) return undefined;

  const objects = topLevelSegments(array.slice(1, -1));
  if (
    objects.some(
      (object) => collectionAt(object, 0) !== object || !literalObjectPropertyNames(object),
    )
  ) {
    return undefined;
  }
  return objects;
}

function propertyValueStart(object, name) {
  const stack = [];
  let quote;
  let escaped = false;

  for (let index = 0; index < object.length; index += 1) {
    const character = object[index];

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{' || character === '[' || character === '(') {
      stack.push(character);
      continue;
    }
    if (character === '}' || character === ']' || character === ')') {
      stack.pop();
      continue;
    }
    if (stack.length !== 1 || !object.startsWith(name, index)) continue;

    const previous = object[index - 1];
    const next = object[index + name.length];
    if ((previous && /[\w$]/.test(previous)) || (next && /[\w$]/.test(next))) continue;

    let valueStart = index + name.length;
    while (/\s/.test(object[valueStart])) valueStart += 1;
    if (object[valueStart] !== ':') continue;
    valueStart += 1;
    while (/\s/.test(object[valueStart])) valueStart += 1;
    return valueStart;
  }

  return -1;
}

function stringProperty(object, name) {
  const start = propertyValueStart(object, name);
  if (start < 0 || !['"', "'"].includes(object[start])) return undefined;

  const quote = object[start];
  let escaped = false;
  for (let index = start + 1; index < object.length; index += 1) {
    const character = object[index];
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === quote) return object.slice(start + 1, index);
  }

  return undefined;
}

function collectionProperty(object, name) {
  const start = propertyValueStart(object, name);
  return start < 0 ? undefined : collectionAt(object, start);
}

function assignedObject(source, name) {
  const assignment = source.match(
    new RegExp(`(?:^|\\n)\\s*export\\s+const\\s+${name}\\b[^=]*=\\s*\\{`),
  );
  if (!assignment || assignment.index === undefined) return undefined;

  const start = assignment.index + assignment[0].lastIndexOf('{');
  return collectionAt(source, start);
}

function hasHtmlLink(source, contract) {
  const uncommented = source.replace(/<!--[\s\S]*?-->/g, '');
  const links = uncommented.match(/<link\b[^>]*>/gi) ?? [];

  return links.some((link) => {
    const linkAttributes = attributes(link);
    const rel = linkAttributes.get('rel')?.toLowerCase().split(/\s+/) ?? [];
    return (
      rel.includes(contract.rel) &&
      linkAttributes.get('href') === contract.href &&
      (!contract.type || linkAttributes.get('type') === contract.type) &&
      (!contract.sizes || linkAttributes.get('sizes') === contract.sizes)
    );
  });
}

function hasNextMetadataEntry(source, contract) {
  const uncommented = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const metadata = assignedObject(uncommented, 'metadata');
  if (!metadata || !literalObjectPropertyNames(metadata)) return false;

  const icons = collectionProperty(metadata, 'icons');
  if (!icons || !literalObjectPropertyNames(icons)) return false;

  if (contract.name === 'site.webmanifest') {
    return stringProperty(metadata, 'manifest') === contract.href;
  }
  if (contract.name === 'apple-touch-icon.png') {
    return stringProperty(icons, 'apple') === contract.href;
  }

  const iconEntries = collectionProperty(icons, 'icon');
  const objects = literalObjectArray(iconEntries) ?? [];
  return objects.some((object) => {
    return (
      stringProperty(object, 'url') === contract.href &&
      stringProperty(object, 'type') === contract.type &&
      (!contract.sizes || stringProperty(object, 'sizes') === contract.sizes)
    );
  });
}

function missingFaviconEntries(path, source) {
  const hasEntry = path.endsWith('.html') ? hasHtmlLink : hasNextMetadataEntry;
  const missing = FAVICON_CONTRACTS.filter((contract) => !hasEntry(source, contract)).map(
    ({ name }) => name,
  );

  assert.deepEqual(FAVICON_FILES, FAVICON_CONTRACTS.map(({ name }) => name));
  return missing;
}

test('UI policy matcher가 제품명 casing과 공백 변형을 검출한다', () => {
  assert.equal(violatesUiPolicy('sign-maker/index.html', '<title>Sign maker</title>'), true);
  assert.equal(
    violatesUiPolicy('openapi-editor/index.html', '<title>OpenApi Editor</title>'),
    true,
  );
  assert.equal(
    violatesUiPolicy('sample.tsx', '<button>\n  generate\n</button>'),
    true,
  );
  assert.equal(violatesUiPolicy('sign-maker/index.html', '<title>Sign Maker</title>'), false);
});

test('제품명 owner field가 경로별 identity와 정확히 일치한다', () => {
  assert.equal(
    violatesUiPolicy('sign-maker/index.html', '<title>OpenAPI Editor</title>'),
    true,
  );
  assert.equal(violatesUiPolicy('sign-maker/index.html', '<title>Sign Maker Pro</title>'), true);
  assert.equal(
    violatesUiPolicy(
      'dummy-file-generator/app/layout.tsx',
      'export const metadata: Metadata = { title: "Config Diff Viewer" };',
    ),
    true,
  );
  assert.equal(
    violatesUiPolicy(
      'dummy-file-generator/app/layout.tsx',
      'export const metadata: Metadata = { title: "Dummy File Generator" };',
    ),
    false,
  );
});

const VALID_NEXT_METADATA = `
  export const metadata: Metadata = {
    title: "Dummy File Generator",
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
  };
`;

const AMBIGUOUS_NEXT_METADATA = [
  {
    name: 'metadata 후행 spread',
    source: VALID_NEXT_METADATA.replace('\n  };', '\n    ...overrideMetadata,\n  };'),
  },
  {
    name: 'icons 후행 spread',
    source: VALID_NEXT_METADATA.replace(
      '      apple: "/apple-touch-icon.png",',
      '      apple: "/apple-touch-icon.png",\n      ...overrideIcons,',
    ),
  },
  {
    name: 'metadata 중복 field',
    source: VALID_NEXT_METADATA.replace(
      '    manifest: "/site.webmanifest",',
      '    manifest: "/site.webmanifest",\n    manifest: "/legacy.webmanifest",',
    ),
  },
  {
    name: 'icons 중복 field',
    source: VALID_NEXT_METADATA.replace(
      '      apple: "/apple-touch-icon.png",',
      '      apple: "/apple-touch-icon.png",\n      apple: "/legacy-apple.png",',
    ),
  },
  {
    name: 'metadata 후행 shorthand',
    source: VALID_NEXT_METADATA.replace(
      '    manifest: "/site.webmanifest",',
      '    manifest: "/site.webmanifest",\n    manifest,',
    ),
  },
  {
    name: 'icons 후행 shorthand',
    source: VALID_NEXT_METADATA.replace(
      '      apple: "/apple-touch-icon.png",',
      '      apple: "/apple-touch-icon.png",\n      apple,',
    ),
  },
];

for (const { name, source } of AMBIGUOUS_NEXT_METADATA) {
  test(`Next favicon matcher가 ${name} 구조를 거부한다`, () => {
    assert.deepEqual(missingFaviconEntries('dummy-file-generator/app/layout.tsx', source), [
      'favicon.svg',
      'favicon-32x32.png',
      'favicon-16x16.png',
      'apple-touch-icon.png',
      'site.webmanifest',
    ]);
  });
}

test('favicon matcher가 주석과 잘못된 URL을 실제 연결로 인정하지 않는다', () => {
  const commented = `<!--
    /favicon.svg /favicon-32x32.png /favicon-16x16.png
    /apple-touch-icon.png /site.webmanifest
  -->`;

  assert.deepEqual(missingFaviconEntries('home/index.html', commented), [
    'favicon.svg',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'apple-touch-icon.png',
    'site.webmanifest',
  ]);
  assert.deepEqual(
    missingFaviconEntries(
      'home/index.html',
      '<link rel="icon" type="image/svg+xml" href="/legacy/favicon.svg" />',
    ),
    [
      'favicon.svg',
      'favicon-32x32.png',
      'favicon-16x16.png',
      'apple-touch-icon.png',
      'site.webmanifest',
    ],
  );
  assert.deepEqual(
    missingFaviconEntries(
      'home/index.html',
      '<link data-rel="icon" data-type="image/svg+xml" data-href="/favicon.svg" />',
    ),
    [
      'favicon.svg',
      'favicon-32x32.png',
      'favicon-16x16.png',
      'apple-touch-icon.png',
      'site.webmanifest',
    ],
  );

  const unrelatedNextObject = `
    export const metadata = { title: "Dummy File Generator" };
    const faviconExamples = {
      manifest: "/site.webmanifest",
      icons: {
        icon: [
          { url: "/favicon.svg", type: "image/svg+xml" },
          { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
          { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        ],
        apple: "/apple-touch-icon.png",
      },
    };
  `;
  assert.deepEqual(missingFaviconEntries('dummy-file-generator/app/layout.tsx', unrelatedNextObject), [
    'favicon.svg',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'apple-touch-icon.png',
    'site.webmanifest',
  ]);

  const unexportedMetadata = `
    const metadata: Metadata = {
      manifest: "/site.webmanifest",
      icons: {
        icon: [
          { url: "/favicon.svg", type: "image/svg+xml" },
          { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
          { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        ],
        apple: "/apple-touch-icon.png",
      },
    };
  `;
  assert.deepEqual(missingFaviconEntries('dummy-file-generator/app/layout.tsx', unexportedMetadata), [
    'favicon.svg',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'apple-touch-icon.png',
    'site.webmanifest',
  ]);
});

test('승인되지 않은 제품명과 혼용 UI copy가 없다', () => {
  const offenders = UI_HOLDERS.filter((path) => violatesUiPolicy(path, read(path)));

  assert.deepEqual(offenders, []);
});

test('Vite와 Next entry가 생성된 favicon set을 연결한다', () => {
  const offenders = FAVICON_HOLDERS.flatMap((path) => {
    return missingFaviconEntries(path, read(path)).map((name) => `${path}:${name}`);
  });

  assert.deepEqual(offenders, []);
});

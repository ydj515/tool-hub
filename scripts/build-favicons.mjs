#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { PRODUCTS } from '../packages/design-system/products.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(SCRIPT_DIR, '..');
const FAVICON_NAMES = [
  'favicon.svg',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'site.webmanifest',
];

export async function renderToolFaviconSvg(product) {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const lucide = await import('lucide-react');
  const Icon = lucide[product.icon];
  if (!Icon) {
    throw new Error(`지원하지 않는 Lucide 아이콘: ${product.icon}`);
  }
  const glyph = renderToStaticMarkup(
    React.createElement(Icon, {
      x: 12,
      y: 12,
      width: 16,
      height: 16,
      strokeWidth: 2,
      color: '#ffffff',
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#3366ff"/>${glyph}</svg>\n`;
}

export function encodeIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  images.forEach(({ width, height, png }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(width === 256 ? 0 : width, entry);
    header.writeUInt8(height === 256 ? 0 : height, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });

  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

function renderManifest(product) {
  return `${JSON.stringify(
    {
      name: product.name,
      short_name: product.name,
      icons: [
        {
          src: '/favicon-32x32.png',
          sizes: '32x32',
          type: 'image/png',
        },
        {
          src: '/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png',
        },
      ],
      theme_color: '#3366ff',
      background_color: '#f7f7f8',
      display: 'standalone',
    },
    null,
    2,
  )}\n`;
}

async function renderPng(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

export async function buildFaviconSet(product, { root = DEFAULT_ROOT } = {}) {
  const dir = resolve(root, 'packages/design-system/favicons', product.id);
  await mkdir(dir, { recursive: true });

  const svg =
    product.id === 'home'
      ? await readFile(join(dir, 'source.svg'), 'utf8')
      : await renderToolFaviconSvg(product);
  const png16 = await renderPng(svg, 16);
  const png32 = await renderPng(svg, 32);
  const png180 = await renderPng(svg, 180);
  const files = new Map([
    ['favicon.svg', svg],
    ['favicon.ico', encodeIco([
      { width: 16, height: 16, png: png16 },
      { width: 32, height: 32, png: png32 },
    ])],
    ['favicon-16x16.png', png16],
    ['favicon-32x32.png', png32],
    ['apple-touch-icon.png', png180],
    ['site.webmanifest', renderManifest(product)],
  ]);

  await Promise.all(
    [...files].map(([name, content]) => writeFile(join(dir, name), content)),
  );
  return FAVICON_NAMES.map((name) => join(dir, name));
}

async function run() {
  const generated = (
    await Promise.all(PRODUCTS.map((product) => buildFaviconSet(product)))
  ).flat();
  for (const path of generated) {
    console.log(path);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

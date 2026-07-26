import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { PRODUCTS } from '../packages/design-system/products.mjs';

const REQUIRED = [
  'favicon.svg',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'site.webmanifest',
];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function assertPngDimensions(path, width, height) {
  const png = readFileSync(path);
  assert.ok(png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE));
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
}

describe('파비콘 정본', () => {
  for (const product of PRODUCTS) {
    test(`${product.id} 세트가 완전하다`, () => {
      const dir = join('packages/design-system/favicons', product.id);
      for (const name of REQUIRED) {
        assert.doesNotThrow(() => readFileSync(join(dir, name)));
      }

      assertPngDimensions(join(dir, 'favicon-16x16.png'), 16, 16);
      assertPngDimensions(join(dir, 'favicon-32x32.png'), 32, 32);
      assertPngDimensions(join(dir, 'apple-touch-icon.png'), 180, 180);

      const ico = readFileSync(join(dir, 'favicon.ico'));
      assert.equal(ico.readUInt16LE(0), 0);
      assert.equal(ico.readUInt16LE(2), 1);
      assert.equal(ico.readUInt16LE(4), 2);

      const manifest = JSON.parse(
        readFileSync(join(dir, 'site.webmanifest'), 'utf8'),
      );
      assert.equal(manifest.name, product.name);
      assert.equal(manifest.short_name, product.name);
      assert.deepEqual(manifest.icons, [
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
      ]);
      assert.equal(manifest.theme_color, '#3366ff');
      assert.equal(manifest.background_color, '#f7f7f8');
      assert.equal(manifest.display, 'standalone');
    });
  }
});

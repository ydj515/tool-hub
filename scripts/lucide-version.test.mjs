import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WEB_TOOLS } from '../packages/design-system/products.mjs';

describe('Lucide 버전', () => {
  for (const { id } of WEB_TOOLS) {
    test(`${id}가 1.14.0을 정확히 사용한다`, () => {
      const pkg = JSON.parse(readFileSync(`${id}/package.json`, 'utf8'));
      const lock = JSON.parse(readFileSync(`${id}/package-lock.json`, 'utf8'));

      assert.equal(pkg.dependencies['lucide-react'], '1.14.0');
      assert.equal(lock.packages['node_modules/lucide-react'].version, '1.14.0');
      assert.equal(lock.packages[''].dependencies['lucide-react'], '1.14.0');
    });
  }
});

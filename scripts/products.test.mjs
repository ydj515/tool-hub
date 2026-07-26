import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, WEB_TOOLS, validateProducts } from '../packages/design-system/products.mjs';

const EXPECTED = [
  ['home', 'Tool Hub', null, 4179, 'flat'],
  ['sign-maker', 'Sign Maker', 'PenLine', 4180, 'card'],
  ['json-yaml-converter', 'JSON/YAML Converter', 'Braces', 4173, 'card'],
  ['openapi-editor', 'OpenAPI Editor', 'FileCode2', 4174, 'card'],
  ['api-contract-test-generator', 'API Contract Test Generator', 'FlaskConical', 4175, 'card'],
  ['ddl-seed-generator', 'DDL Seed Generator', 'Database', 4177, 'card'],
  ['config-diff-viewer', 'Config Diff Viewer', 'GitCompareArrows', 4176, 'card'],
  ['dummy-file-generator', 'Dummy File Generator', 'FilePlus2', 4178, 'card'],
];

describe('제품 metadata', () => {
  test('제품명·아이콘·포트·헤더 형태가 승인값과 같다', () => {
    assert.deepEqual(PRODUCTS.map(({ id, name, icon, e2ePort, header }) =>
      [id, name, icon, e2ePort, header]), EXPECTED);
    assert.deepEqual(WEB_TOOLS.map(({ id }) => id), EXPECTED.slice(1).map(([id]) => id));
  });

  test('중복 ID와 앱 밖 생성 경로를 거부한다', () => {
    assert.throws(() => validateProducts([...PRODUCTS, PRODUCTS[1]]), /중복 제품 ID/);
    assert.throws(() => validateProducts([{ ...PRODUCTS[1], componentDir: '../escape' }]), /앱 밖/);
  });
});

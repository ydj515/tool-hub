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
    assert.doesNotThrow(() => validateProducts(PRODUCTS));
  });

  test('중복 ID·포트와 앱 밖 생성 경로를 제품과 field 값으로 거부한다', () => {
    assert.throws(() => validateProducts([...PRODUCTS, PRODUCTS[1]]), /중복 제품 ID/);
    assert.throws(
      () => validateProducts(PRODUCTS.map((product) =>
        product.id === 'dummy-file-generator'
          ? { ...product, e2ePort: PRODUCTS[1].e2ePort }
          : product)),
      /dummy-file-generator.*e2ePort.*4180/,
    );
    assert.throws(() => validateProducts([{ ...PRODUCTS[1], componentDir: '../escape' }]), /앱 밖/);
  });

  test('제품 ID와 필수 표시·대상 field를 엄격히 검증한다', () => {
    const card = PRODUCTS[1];
    const invalidCases = [
      [{ ...card, id: '' }, /field "id".*비어/],
      [{ ...card, id: 'nested/sign-maker' }, /field "id".*nested\/sign-maker/],
      [{ ...card, id: '..' }, /field "id".*\.\./],
      [{ ...card, name: '  ' }, /sign-maker.*field "name"/],
      [{ ...card, description: '' }, /sign-maker.*field "description"/],
      [{ ...card, icon: '' }, /sign-maker.*field "icon"/],
      [{ ...card, componentDir: '' }, /sign-maker.*field "componentDir"/],
      [{ ...card, stylesDir: '/tmp/styles' }, /sign-maker.*field "stylesDir"/],
      [{ ...card, publicDir: 'public/../escape' }, /sign-maker.*field "publicDir"/],
      [{ ...card, e2ePort: 0 }, /sign-maker.*field "e2ePort".*0/],
    ];

    for (const [product, pattern] of invalidCases) {
      assert.throws(() => validateProducts([product]), pattern);
    }
  });

  test('지원 stack·header와 flat Home 예외를 명시적으로 검증한다', () => {
    const card = PRODUCTS[1];
    const home = PRODUCTS[0];

    assert.throws(
      () => validateProducts([{ ...card, stack: 'remix' }]),
      /sign-maker.*field "stack".*remix/,
    );
    assert.throws(
      () => validateProducts([{ ...card, header: 'floating' }]),
      /sign-maker.*field "header".*floating/,
    );
    assert.throws(
      () => validateProducts([{ ...home, icon: 'House' }]),
      /home.*field "icon".*House/,
    );
    assert.throws(
      () => validateProducts([{ ...home, componentDir: 'src/components' }]),
      /home.*field "componentDir".*src\/components/,
    );
    assert.throws(
      () => validateProducts([{ ...card, header: 'flat', icon: null, componentDir: null }]),
      /sign-maker.*field "header".*flat.*home/,
    );
  });
});

const products = [
  { id: 'home', name: 'Tool Hub', description: '간단하고 유용한 웹 도구 모음입니다.', icon: null, header: 'flat', stack: 'vite', componentDir: null, stylesDir: 'src/styles', publicDir: 'public', e2ePort: 4179 },
  { id: 'sign-maker', name: 'Sign Maker', description: '손글씨 서명을 만들고 내보냅니다.', icon: 'PenLine', header: 'card', stack: 'vite', componentDir: 'src/components/design-system', stylesDir: 'src/styles', publicDir: 'public', e2ePort: 4180 },
  { id: 'json-yaml-converter', name: 'JSON/YAML Converter', description: 'JSON과 YAML을 변환하고 검증합니다.', icon: 'Braces', header: 'card', stack: 'vite', componentDir: 'src/components/design-system', stylesDir: 'src/styles', publicDir: 'public', e2ePort: 4173 },
  { id: 'openapi-editor', name: 'OpenAPI Editor', description: 'OpenAPI 문서를 작성하고 미리 봅니다.', icon: 'FileCode2', header: 'card', stack: 'vite', componentDir: 'src/components/design-system', stylesDir: 'src/styles', publicDir: 'public', e2ePort: 4174 },
  { id: 'api-contract-test-generator', name: 'API Contract Test Generator', description: 'OpenAPI 계약에서 테스트를 생성합니다.', icon: 'FlaskConical', header: 'card', stack: 'vite', componentDir: 'src/components/design-system', stylesDir: 'src/styles', publicDir: 'public', e2ePort: 4175 },
  { id: 'ddl-seed-generator', name: 'DDL Seed Generator', description: 'DDL을 분석해 시드 데이터를 생성합니다.', icon: 'Database', header: 'card', stack: 'next', componentDir: 'app/_components/design-system', stylesDir: 'app/styles', publicDir: 'public', e2ePort: 4177 },
  { id: 'config-diff-viewer', name: 'Config Diff Viewer', description: '설정 파일의 차이를 비교합니다.', icon: 'GitCompareArrows', header: 'card', stack: 'next', componentDir: 'app/_components/design-system', stylesDir: 'app/styles', publicDir: 'public', e2ePort: 4176 },
  { id: 'dummy-file-generator', name: 'Dummy File Generator', description: '원하는 형식과 크기의 더미 파일을 생성합니다.', icon: 'FilePlus2', header: 'card', stack: 'next', componentDir: 'app/_components/design-system', stylesDir: 'app/styles', publicDir: 'public', e2ePort: 4178 },
];

export function validateProducts(input = products) {
  const ids = new Set();
  const ports = new Set();
  for (const product of input) {
    if (ids.has(product.id)) throw new Error(`중복 제품 ID: ${product.id}`);
    if (ports.has(product.e2ePort)) throw new Error(`중복 E2E 포트: ${product.e2ePort}`);
    for (const path of [product.componentDir, product.stylesDir, product.publicDir].filter(Boolean)) {
      if (path.startsWith('/') || path.split('/').includes('..')) throw new Error(`${product.id} 생성 경로가 앱 밖이다: ${path}`);
    }
    if (product.header === 'card' && !product.icon) throw new Error(`${product.id} 아이콘이 없다`);
    ids.add(product.id);
    ports.add(product.e2ePort);
  }
}

validateProducts(products);
export const PRODUCTS = Object.freeze(products.map(Object.freeze));
export const WEB_TOOLS = Object.freeze(PRODUCTS.filter(({ header }) => header === 'card'));
export const PRODUCT_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));

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
  for (const [index, product] of input.entries()) {
    const label = typeof product?.id === 'string' && product.id.trim()
      ? product.id
      : `metadata[${index}]`;
    const invalid = (field, reason) => {
      const value = JSON.stringify(product?.[field]);
      throw new Error(`제품 "${label}" field "${field}" ${reason}: value=${value}`);
    };
    const requireText = (field) => {
      if (typeof product?.[field] !== 'string' || product[field].trim() === '') {
        invalid(field, '가 비어 있다');
      }
    };
    const requireSafePath = (field) => {
      requireText(field);
      const path = product[field];
      const segments = path.split('/');
      if (
        path.startsWith('/') ||
        path.includes('\\') ||
        segments.some((segment) => segment === '' || segment === '.' || segment === '..') ||
        !segments.every((segment) => /^[A-Za-z0-9._-]+$/.test(segment))
      ) {
        invalid(field, '생성 경로가 앱 밖이거나 안전한 상대 경로가 아니다');
      }
    };

    requireText('id');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.id)) {
      invalid('id', '가 안전한 단일 slug가 아니다');
    }
    requireText('name');
    requireText('description');

    if (!['vite', 'next'].includes(product.stack)) {
      invalid('stack', '가 지원값(vite, next)이 아니다');
    }
    if (!['flat', 'card'].includes(product.header)) {
      invalid('header', '가 지원값(flat, card)이 아니다');
    }
    if (!Number.isInteger(product.e2ePort) || product.e2ePort < 1 || product.e2ePort > 65535) {
      invalid('e2ePort', '가 유효한 TCP port가 아니다');
    }

    requireSafePath('stylesDir');
    requireSafePath('publicDir');

    if (product.header === 'flat') {
      if (product.id !== 'home') {
        invalid('header', 'flat header는 home 제품만 사용할 수 있다');
      }
      if (product.stack !== 'vite') {
        invalid('stack', 'flat home은 vite stack이어야 한다');
      }
      if (product.icon !== null) {
        invalid('icon', 'flat home에서는 null이어야 한다');
      }
      if (product.componentDir !== null) {
        invalid('componentDir', 'flat home에서는 null이어야 한다');
      }
    } else {
      requireText('icon');
      requireSafePath('componentDir');
      if (product.id === 'home') {
        invalid('header', 'home 제품은 flat header여야 한다');
      }
    }

    if (ids.has(product.id)) {
      throw new Error(`중복 제품 ID: 제품 "${label}" field "id" value=${JSON.stringify(product.id)}`);
    }
    if (ports.has(product.e2ePort)) {
      throw new Error(`제품 "${label}" field "e2ePort"가 중복이다: value=${product.e2ePort}`);
    }
    ids.add(product.id);
    ports.add(product.e2ePort);
  }
}

validateProducts(products);
export const PRODUCTS = Object.freeze(products.map(Object.freeze));
export const WEB_TOOLS = Object.freeze(PRODUCTS.filter(({ header }) => header === 'card'));
export const PRODUCT_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));

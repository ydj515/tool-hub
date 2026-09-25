import { tools } from './tools';

export const categories = ['전체', '변환·편집', '생성', '비교·검증', '기타'] as const;
export type Category = typeof categories[number];

/** 랜딩의 노출 순서와 설명. 배포 주소와 상태는 tools 정본을 사용한다. */
const presentation: Record<string, { category: Category; description: string }> = {
  'json-yaml-converter': { category: '변환·편집', description: 'JSON과 YAML을 서로 변환하고 정리합니다.' },
  'openapi-editor': { category: '변환·편집', description: 'OpenAPI 명세를 편집하고 검증합니다.' },
  'config-diff-viewer': { category: '비교·검증', description: '설정 파일의 차이와 누락된 키를 확인합니다.' },
  'ddl-seed-generator': { category: '생성', description: 'DDL을 바탕으로 seed SQL을 생성합니다.' },
  'sign-maker': { category: '생성', description: '직접 그린 서명을 투명한 PNG로 저장합니다.' },
  'dummy-file-generator': { category: '생성', description: '지정한 크기의 테스트용 파일을 생성합니다.' },
  'api-contract-test-generator': { category: '비교·검증', description: 'OpenAPI 명세로 API 테스트 계획을 만듭니다.' },
  'shortcut-cheatsheet': { category: '기타', description: '자주 사용하는 키보드 단축키를 찾아봅니다.' },
  'class-diagram-generator': { category: '생성', description: '클래스 구조를 UML 다이어그램으로 확인합니다.' },
  'webpage-capture-tool': { category: '기타', description: '웹페이지를 캡처하고 이미지로 저장합니다.' },
};

export const catalog = Object.entries(presentation).flatMap(([id, details]) => {
  const tool = tools.find((entry) => entry.id === id);
  return tool ? [{ ...tool, ...details }] : [];
});

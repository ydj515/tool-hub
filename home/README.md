# Tool Hub Home

Tool Hub에 포함된 유틸리티를 탐색하고 실행 경로를 안내하는 랜딩 페이지입니다.
도구별 설명과 태그 검색, 상태 표시, 라이트·다크 테마 전환을 제공합니다.

**기술 스택:** React 19 · TypeScript · Vite · Tailwind CSS · Vitest · Playwright

## 주요 기능

- **도구 카탈로그:** 각 도구의 핵심 기능, 태그, 배포 주소, GitHub 경로 안내
- **검색과 필터링:** 키워드 및 태그 기반 도구 탐색
- **공통 테마:** 시스템 설정 연동 및 라이트·다크 테마 전환

## 요구 사항

- [mise](https://mise.jdx.dev/) — Node.js 버전은 [`mise.toml`](./mise.toml)에 고정되어 있으며 `mise`가 설치합니다.

## 빠른 시작

```bash
mise trust          # 최초 1회, mise.toml 검토 후 신뢰
mise run bootstrap  # 고정된 Node.js 설치 + 의존성 설치
mise run dev        # 개발 서버 실행
```

## 주요 명령

| 명령 | 설명 |
| --- | --- |
| `mise run dev` | 개발 서버 실행 |
| `mise run test` | Vitest 단위·컴포넌트 테스트 실행 |
| `mise run lint` | ESLint 검사 |
| `mise run typecheck` | TypeScript 타입 검사 |
| `mise run build` | 프로덕션 빌드 |
| `mise run test-e2e` | Playwright E2E 테스트 실행 |
| `mise run check` | 테스트·린트·타입체크·빌드·E2E 통합 검증 |

전체 task 목록은 `mise tasks`로 확인할 수 있습니다.

## 문서

- [프로젝트 기여자 가이드](./docs/contributor-guide.md)
- [루트 문서 인덱스](../docs/README.md)

## 기여

변경 전 [기여자 가이드](./docs/contributor-guide.md)를 확인해 주세요.

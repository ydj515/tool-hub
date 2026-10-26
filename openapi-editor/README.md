# OpenAPI Editor

Swagger 2.0과 OpenAPI 3.0/3.1/3.2 단일 문서를 브라우저 안에서 편집·검증·변환하는 웹 도구입니다.
입력한 명세는 서버나 로컬 저장소에 전송·보관하지 않으며, 외부 `$ref` 해석과 Swagger UI의 `Try it out` 요청을 차단해 안전하게 미리 볼 수 있습니다.

**기술 스택:** React 19 · TypeScript · Vite · Tailwind CSS · Monaco Editor · Swagger UI · ReDoc · Vitest · Playwright

## 주요 기능

- **편집 및 검증:** YAML·JSON 입력 및 파일 업로드, Swagger 2.0·OpenAPI 3.0.x/3.1.x/3.2.x 구조 및 내부 `$ref` 검사
- **버전 변환 및 손실 보존:** 버전 간 양방향 변환 시 하위 버전에서 표현할 수 없는 필드를 `x-toolhub-original-*` 확장에 보존하고 JSON Pointer 경고 표시
- **미리보기 및 내보내기:** 읽기 전용 Swagger UI·ReDoc 전환, YAML·JSON 및 오프라인 단일 파일 ReDoc HTML 다운로드(ReDoc은 Swagger 2.0, OpenAPI 3.0/3.1 지원)

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
| `mise run test-e2e` | Playwright Chromium E2E 테스트 실행 |
| `mise run check` | 테스트·린트·타입체크·빌드·E2E 통합 검증 |

전체 task 목록은 `mise tasks`로 확인할 수 있습니다.

## 문서

- [문서 분석과 버전 변환](./docs/document-processing.md)
- [워크스페이스와 메뉴 구성](./docs/workspace.md)
- [프로젝트 기여자 가이드](./docs/contributor-guide.md)
- [루트 문서 인덱스](../docs/README.md)

## 기여

변경 전 [기여자 가이드](./docs/contributor-guide.md)를 확인해 주세요.

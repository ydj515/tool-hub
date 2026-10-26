# API Contract Test Generator

OpenAPI 3.0·3.1 명세에서 정상·경계값·검증 오류·인증 테스트 계획을 결정론적으로 생성하는 브라우저 전용 도구입니다.
모든 파싱과 테스트 생성은 Web Worker에서 수행하며, 실제 API를 호출하거나 입력 명세를 서버·영구 저장소에 저장하지 않습니다.

**기술 스택:** React 19 · TypeScript · Vite · Tailwind CSS · Web Worker · Vitest · Playwright

## 주요 기능

- **지원 명세:** OpenAPI 3.0.x 및 3.1.x 단일 문서(YAML·JSON), 내부 JSON Pointer `$ref`, JSON/`+json` 본문, HTTP Bearer·Basic 및 API Key 인증
- **결정론적 케이스 생성:** `required`, 타입, 문자열 길이·패턴·포맷, 숫자 범위·`multipleOf`, 배열 제약, `enum`·`const`, `allOf`·`oneOf`·`anyOf` 기반 단일 제약 위반 테스트 생성
- **검토 및 내보내기:** 엔드포인트별 포함 여부와 기대 상태 코드 검토 후 Markdown, JSON, Postman Collection 2.1 다운로드(인증값은 `{{API_TOKEN}}` 등 변수로 정화)
- **생성 상한:** 엔드포인트당 최대 200개·전체 최대 2,000개 테스트, 스키마 깊이 32, 입력 크기 5MB 경고·20MB 차단(Swagger 2.0, OpenAPI 3.2, 외부 `$ref` 미지원)

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
| `mise run test` | Vitest 테스트 실행 |
| `mise run lint` | ESLint 검사 |
| `mise run typecheck` | TypeScript 타입 검사 |
| `mise run build` | 프로덕션 빌드 |
| `mise run e2e` | Playwright E2E 테스트 실행 |
| `mise run check` | 테스트·린트·타입체크·빌드·E2E 통합 검증 |

전체 task 목록은 `mise tasks`로 확인할 수 있습니다.

## 문서

- [테스트 생성·검토·내보내기 설계](./docs/test-generation.md)
- [프로젝트 기여자 가이드](./docs/contributor-guide.md)
- [루트 문서 인덱스](../docs/README.md)

## 기여

변경 전 [기여자 가이드](./docs/contributor-guide.md)를 확인해 주세요.

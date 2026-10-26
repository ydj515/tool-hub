# Config Diff Viewer

환경별 설정 파일을 비교하고 누락 키, 위험 설정, 평문 민감정보 노출을 탐지하는 웹 도구입니다.
모든 파싱과 비교를 브라우저에서 수행해 설정 원문을 서버로 전송하지 않고 배포 전 설정 오류를 점검할 수 있습니다.

**기술 스택:** Next.js 16 · React 19 · TypeScript · Tailwind CSS · Monaco Editor · js-yaml · Vitest · Playwright

## 주요 기능

- **다중 포맷 및 구조 비교:** YAML, JSON, `.properties`, `.env` 설정을 평탄화(dot notation)해 키 추가·누락·값 변경·타입 불일치 비교 및 Monaco DiffEditor 시각화
- **위험 설정 및 민감정보 탐지:** 운영 환경 위험 규칙(Spring Boot, Kubernetes, Docker Compose 등) 평가 및 키 이름·값 패턴 기반 시크릿 자동 마스킹
- **리포트 내보내기:** 심각도(Critical/High/Medium/Low) 요약과 함께 JSON·Markdown 리포트 다운로드

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
| `mise run test-e2e` | Playwright E2E 테스트 실행 |
| `mise run check` | 테스트·린트·타입체크·빌드·E2E 통합 검증 |

전체 task 목록은 `mise tasks`로 확인할 수 있습니다.

## 문서

- [제품 요구사항 정의서 (PRD)](./docs/PRD-FINAL.md)
- [프로젝트 기여자 가이드](./docs/contributor-guide.md)
- [루트 문서 인덱스](../docs/README.md)

## 기여

변경 전 [기여자 가이드](./docs/contributor-guide.md)를 확인해 주세요.

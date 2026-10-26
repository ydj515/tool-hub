# DDL Seed Generator

`CREATE TABLE` DDL을 분석해 외래키(FK) 의존 순서에 맞는 seed SQL과 rollback SQL을 생성하는 웹 도구입니다.
테이블 관계와 컬럼 특성을 파악해 데이터베이스 방언별 실행 스크립트를 브라우저에서 바로 만듭니다.

**기술 스택:** Next.js 16 · React 19 · TypeScript · Tailwind CSS · Monaco Editor · Faker · Vitest · Playwright

## 주요 기능

- **방언별 SQL 생성:** PostgreSQL, MySQL, H2 대상 `INSERT` 및 역순 `DELETE` 구문 생성
- **의존성 및 순환 참조 처리:** FK 위상 정렬 기반 순서 보장 및 순환 FK 감지 시 DB별 제약 완화 구문 포함
- **데이터 합성 및 내보내기:** 컬럼명·타입 기반 현실적인 더미 데이터 및 경계값 생성, `insert.sql`·`rollback.sql`·`seed.zip` 다운로드

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

- [프로젝트 기여자 가이드](./docs/contributor-guide.md)
- [루트 문서 인덱스](../docs/README.md)

## 기여

변경 전 [기여자 가이드](./docs/contributor-guide.md)를 확인해 주세요.

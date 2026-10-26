# Tool Hub

[![Sync Development Standards](https://github.com/ydj515/tool-hub/actions/workflows/sync-dev-standards.yml/badge.svg)](https://github.com/ydj515/tool-hub/actions/workflows/sync-dev-standards.yml)
![Node.js](https://img.shields.io/badge/Node.js-24.19.0-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Java](https://img.shields.io/badge/Java-21.0.2-007396?logo=openjdk&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?logo=tailwindcss&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-2.0-7F52FF?logo=kotlin&logoColor=white)

일상적인 개발과 문서 작업에 쓰이는 유틸리티를 한곳에 모은 도구 모음입니다.
각 도구는 독립된 애플리케이션으로 구성되어 개별 디렉터리에서 바로 실행하고 배포할 수 있으며, 공통 디자인 토큰과 UI 프리미티브로 일관된 사용 경험을 제공합니다.

**기술 스택:** React 19 · Next.js · TypeScript · Vite · Tailwind CSS · Electron · Kotlin · Spring Boot

## 포함된 도구

- **API·데이터·설정:**
  - [`json-yaml-converter`](./json-yaml-converter): JSON·YAML 양방향 변환, 포맷팅, 문법 오류 위치 진단
  - [`openapi-editor`](./openapi-editor): Swagger 2.0 및 OpenAPI 3.0/3.1/3.2 편집·검증·버전 변환
  - [`api-contract-test-generator`](./api-contract-test-generator): OpenAPI 명세 기반 정상·경계값·오류·인증 테스트 계획 생성
  - [`ddl-seed-generator`](./ddl-seed-generator): DDL 분석 후 외래키(FK) 순서에 맞는 seed·rollback SQL 생성
  - [`config-diff-viewer`](./config-diff-viewer): YAML/JSON/properties/.env 비교 및 누락 키·위험 설정·민감정보 탐지
- **설계·문서·파일:**
  - [`class-diagram-generator`](./class-diagram-generator): 소스 코드 ZIP 업로드를 통한 클래스 설계서(다이어그램, XLSX, DOCX, MD) 생성
  - [`sign-maker`](./sign-maker): 캔버스 기반 손글씨 서명 작성 및 투명 배경 이미지 다운로드
  - [`dummy-file-generator`](./dummy-file-generator): 지정한 형식과 용량의 테스트용 더미 파일 생성
- **데스크톱·허브:**
  - [`webpage-capture-tool`](./webpage-capture-tool): 등록한 URL을 내장 브라우저로 촬영하는 Electron 캡처 도구
  - [`home`](./home): 전체 도구를 탐색하고 실행 경로를 안내하는 랜딩 페이지

## 요구 사항

- [mise](https://mise.jdx.dev/) — 프로젝트별 런타임(Node.js 24, Java 21) 버전은 각 디렉터리의 `mise.toml`에 고정되어 있으며 `mise`가 설치합니다.

## 빠른 시작

실행하려는 도구의 디렉터리로 이동해 초기 설정과 개발 서버를 실행합니다.

```bash
cd home             # 실행할 도구 디렉터리로 이동 (예: home, openapi-editor)
mise trust          # 최초 1회, mise.toml 검토 후 신뢰
mise run bootstrap  # 고정된 런타임 설치 + 의존성 설치
mise run dev        # 개발 서버 실행 (webpage-capture-tool은 mise run start)
```

루트 디렉터리는 공통 디자인 시스템의 동기화와 검증만 담당하며, 하위 앱 전체를 일괄 실행하지 않습니다.

## 주요 명령

각 도구 디렉터리에서 아래 명령을 사용할 수 있습니다.

| 명령 | 설명 |
| --- | --- |
| `mise run bootstrap` | 고정된 런타임 및 패키지 의존성 설치 |
| `mise run dev` | 개발 서버 실행 (`webpage-capture-tool`은 `mise run start`) |
| `mise run test` | 단위·컴포넌트 테스트 실행 |
| `mise run check` | 테스트·린트·타입체크·빌드·E2E 통합 검증 |
| `mise run verify` | 프로젝트 품질 게이트 실행 |

루트 디렉터리에서 공통 디자인 시스템을 수정한 경우에는 `npm run design-system:sync`와 `mise run verify`로 정본 동기화 상태를 검증합니다.
전체 작업 목록은 해당 디렉터리에서 `mise tasks`로 확인할 수 있습니다. dev/prod 환경 프로필과 개인 설정 방법은 [기여자 가이드의 Mise Environment Configuration](./docs/contributor-guide.md#mise-environment-configuration)을 참고하세요.

## 문서

- [전체 문서 인덱스](./docs/README.md)
- [기여자 가이드 및 프로젝트별 참조](./docs/contributor-guide.md)
- [프론트엔드 컨벤션](./docs/frontend-conventions.md)
- [디자인 시스템 구조와 유지보수](./docs/design-system.md)
- [UI 검증 기준](./docs/ui-verification.md)

## 기여

변경 전 [기여 가이드](./CONTRIBUTING.md)를 확인해 주세요.


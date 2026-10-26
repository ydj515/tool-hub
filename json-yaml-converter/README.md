# JSON/YAML Converter

브라우저 안에서 JSON과 YAML을 양방향으로 변환하고 포맷팅하는 웹 도구입니다.
문법 오류의 정확한 행·열 위치를 진단하며, 입력 데이터를 서버나 영구 저장소에 저장하지 않습니다.

**기술 스택:** React 19 · TypeScript · Vite · Tailwind CSS · Monaco Editor · Vitest · Playwright

## 주요 기능

- **양방향 변환과 포맷팅:** JSON ↔ YAML 실시간 변환 및 JSON·YAML Pretty 정리
- **문법 진단:** 첫 문법 오류의 범위와 행·열 위치 표시
- **편집 유틸리티:** 파일 열기, 예제 불러오기, 복사, 다운로드, 데스크톱 양면 편집기·모바일 탭 전환
- **지원 범위와 제한:**
  - YAML 1.2 단일 문서만 지원하며 주석·anchor·alias 및 원본 서식은 보존하지 않습니다.
  - YAML 출력은 2칸 들여쓰기 block 형식을 사용하며, 특수 문자열은 JSON 호환 escape 큰따옴표로 출력합니다.
  - 입력 500KB부터 성능 안내를 표시하고 1MB 초과 시 변환을 중단합니다(중첩 최대 100단계, 결과 최대 2MB).

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
| `mise run test` | Vitest 단위 테스트 실행 |
| `mise run lint` | ESLint 검사 |
| `mise run typecheck` | TypeScript 타입 검사 |
| `mise run build` | 프로덕션 빌드 |
| `mise run test-e2e` | Playwright Chromium E2E 테스트 실행 |
| `mise run check` | 테스트·린트·타입체크·빌드·E2E 통합 검증 |

전체 task 목록은 `mise tasks`로 확인할 수 있습니다.

## 문서

- [변환·진단·편집 상태 설계](./docs/conversion-design.md)
- [프로젝트 기여자 가이드](./docs/contributor-guide.md)
- [루트 문서 인덱스](../docs/README.md)

## 기여

변경 전 [기여자 가이드](./docs/contributor-guide.md)를 확인해 주세요.

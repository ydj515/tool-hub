# JSON YAML Converter

브라우저 안에서 JSON과 YAML을 양방향으로 변환하고 정리하는 Tool Hub 도구입니다.

## 기능

- JSON → YAML, YAML → JSON 실시간 자동 변환
- JSON Pretty와 YAML Pretty
- 첫 문법 오류의 범위, 행, 열 표시
- 파일 열기, 예제, 지우기, 복사, 다운로드
- 데스크톱 양쪽 편집기와 모바일 탭
- 입력 데이터 서버 전송 및 저장 없음

## 제한

- YAML 1.2 단일 문서만 지원합니다.
- YAML 주석, anchor 이름, alias 표현과 원래 서식은 보존하지 않습니다.
- YAML 출력은 2칸 들여쓰기의 block 형식을 사용하며, 모호하거나 특수한 문자열은 JSON 호환 escape를 적용한 큰따옴표 문자열로 출력합니다.
- 500KB부터 성능 안내를 표시하고 1MB를 초과하면 변환과 Pretty를 중단합니다.
- JSON/YAML collection 중첩은 100단계, 생성 결과는 UTF-8 기준 2MB까지 지원합니다.

## 실행

```bash
npm install
npm run dev
```

## mise 사용

```bash
mise run setup
mise run dev
mise run check
```

`mise run check`는 unit test, lint, typecheck, build, Chromium E2E를 실행합니다.

## 검증

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

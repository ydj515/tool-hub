# JSON YAML Converter 설계

- 작성일: 2026-07-21
- 상태: 사용자 승인 완료
- 구현 대상: `json-yaml-converter/`
- 배포 범위: 이번 작업에서 푸시 및 배포 제외

## 1. 목적

`json-yaml-converter`는 브라우저에서 JSON과 YAML을 양방향으로 변환하고, 각 형식을 정리하며, 문법 오류 위치를 편집기에서 정확하게 안내하는 독립 도구다.

핵심 목표는 다음과 같다.

- JSON에서 YAML로 실시간 자동 변환한다.
- YAML에서 JSON으로 실시간 자동 변환한다.
- `JSON Pretty`와 `YAML Pretty`를 각각 제공한다.
- 첫 번째 차단 오류의 범위, 행, 열, 원인을 표시한다.
- 입력을 서버나 영구 브라우저 저장소로 보내거나 저장하지 않는다.
- 데스크톱과 모바일에서 각 화면 크기에 적합한 편집 흐름을 제공한다.

## 2. 범위

### 2.1 포함 기능

- 독립 Vite + React + TypeScript SPA
- Monaco 기반 원본 편집기와 읽기 전용 결과 편집기
- JSON과 YAML 양방향 변환
- 300ms debounce 기반 자동 변환
- JSON Pretty와 YAML Pretty
- 정확한 오류 marker와 한국어 오류 메시지
- 파일 열기, 예제 불러오기, 지우기, 복사, 다운로드
- 라이트·다크 테마
- 데스크톱 양쪽 편집기와 모바일 원본·결과 탭
- 단위, 컴포넌트, 브라우저 E2E 테스트
- 루트 README와 Tool Hub 홈 메타데이터 동기화

### 2.2 제외 기능

- 서버 API
- 입력이나 변환 기록의 서버 저장
- `localStorage`를 이용한 입력 및 변환 기록 저장
- YAML 주석, anchor 이름, alias 표현, 원래 공백과 줄바꿈 보존
- YAML 다중 문서 변환
- 사용자 정의 YAML tag
- JSONC나 JSON5 지원
- 포맷 옵션 사용자 설정
- 실시간 자동 Pretty
- 공유 URL과 협업 기능
- 이번 작업의 원격 푸시와 배포

## 3. 기술 접근

새 도구는 `json-yaml-converter/` 독립 패키지로 만든다.

- 빌드와 UI: Vite, React, TypeScript, Tailwind CSS
- 편집기: `@monaco-editor/react`, Monaco Editor
- JSON 파싱과 진단: `jsonc-parser`
- YAML 파싱과 직렬화: `yaml`
- 단위와 컴포넌트 테스트: Vitest, React Testing Library
- 브라우저 E2E: Playwright

서버 렌더링이나 서버 API가 필요하지 않으므로 Next.js를 사용하지 않는다. 일반 textarea는 오류 marker, gutter, 행 번호, 실행 취소, 커서 이동을 직접 구현해야 하므로 사용하지 않는다.

## 4. 아키텍처

애플리케이션을 UI, 상태 오케스트레이션, 도메인 로직으로 분리한다.

```text
SourceEditorPanel
  -> useConverter
  -> size validation
  -> JSON/YAML parser
  -> ordered data model validation
  -> opposite serializer
  -> ResultEditorPanel or DiagnosticBanner
```

### 4.1 UI 계층

UI 컴포넌트는 사용자 이벤트와 렌더링만 담당한다. JSON과 YAML 파서의 구체적인 구현을 알지 않는다.

예상 구조는 다음과 같다.

```text
src/
├── App.tsx
├── main.tsx
├── components/
│   ├── layout/
│   │   ├── Layout.tsx
│   │   └── Header.tsx
│   ├── converter/
│   │   ├── ConverterToolbar.tsx
│   │   ├── ConverterWorkspace.tsx
│   │   ├── SourceEditorPanel.tsx
│   │   ├── ResultEditorPanel.tsx
│   │   ├── DiagnosticBanner.tsx
│   │   └── StatusBar.tsx
│   └── ui/
├── hooks/
│   ├── useConverter.ts
│   └── useTheme.ts
├── lib/
│   ├── data-node.ts
│   ├── json.ts
│   ├── yaml.ts
│   ├── converter.ts
│   ├── diagnostics.ts
│   ├── size.ts
│   └── file.ts
├── pages/
│   └── ConverterPage.tsx
├── styles/
└── test/
```

반복되는 UI만 컴포넌트로 분리하고 한 번만 사용하는 작은 마크업은 별도 컴포넌트로 추출하지 않는다.

### 4.2 상태 오케스트레이션

`useConverter`는 다음 상태를 소유한다.

- 현재 방향: `json-to-yaml` 또는 `yaml-to-json`
- 원본 문자열
- 마지막 성공 결과
- 마지막 성공 결과의 원본 revision
- 현재 진단
- 현재 UTF-8 바이트 크기
- debounce 예약 상태
- 결과가 현재 입력과 동기화됐는지 여부

원본이 바뀔 때 revision을 증가시킨다. 300ms 뒤 예약된 작업은 자신이 시작할 때 받은 revision이 현재 revision과 같은 경우에만 결과를 반영한다. 새 입력이 들어오면 이전 예약 작업을 취소한다.

상태는 다음처럼 전이한다.

```text
empty -> scheduled -> valid
                   -> invalid
                   -> oversized

valid -> scheduled
invalid -> scheduled
oversized -> scheduled, 입력이 제한 이하로 감소한 경우
```

공백만 있는 원본은 `empty`로 본다. `empty`로 전환하면 결과와 진단을 모두 지우고 결과 작업을 비활성화한다. 원본 revision이 마지막 성공 revision과 다른 `scheduled` 상태에서는 화면에 마지막 성공 결과가 남아 있더라도 오래된 결과로 취급하고 내보내기와 방향 전환을 비활성화한다.

파싱은 초기 버전에서 메인 스레드의 동기 순수 함수로 실행한다. 1MB 제한과 debounce로 작업량을 제한한다. Web Worker는 실제 측정에서 입력 지연이 확인될 때 도입하는 후속 최적화로 남긴다.

### 4.3 순서 보존 데이터 모델

파서 결과를 즉시 일반 JavaScript 객체로 평탄화하면 정수처럼 보이는 키의 열거 순서가 달라질 수 있다. 키 순서를 보존하기 위해 내부에서는 명시적인 순서형 데이터 모델을 사용한다.

```ts
type DataNode =
  | { kind: 'null' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'sequence'; items: DataNode[] }
  | { kind: 'mapping'; entries: Array<{ key: string; value: DataNode }> };
```

JSON은 `jsonc-parser`의 트리를 순회해 `DataNode`로 바꾼다. YAML은 순서가 유지되는 mapping 표현으로 읽은 뒤 `DataNode`로 정규화한다. 두 직렬화기는 `DataNode.mapping.entries` 순서를 그대로 사용한다.

다음 값은 JSON 호환 값이 아니므로 차단 오류로 처리한다.

- 비문자열 mapping 키
- 중복 mapping 키
- `NaN`, 양의 무한대, 음의 무한대
- 순환 참조
- 해석할 수 없는 tag 값

수치는 유한한 ECMAScript `number` 의미를 따른다. JavaScript의 정밀도 범위를 넘는 숫자를 정밀하게 보존하는 기능은 초기 범위에 포함하지 않는다.

## 5. 변환 규칙

### 5.1 JSON 입력

JSON은 엄격 모드로 처리한다.

- 주석 불가
- trailing comma 불가
- 빈 입력은 오류가 아닌 빈 상태
- 객체, 배열, 문자열, 숫자, 불리언, `null` 루트 허용
- 중복 객체 키는 값 손실을 막기 위해 차단 오류 처리

유효한 JSON은 YAML 1.2 값으로 직렬화한다. YAML 출력은 mapping 순서와 sequence 순서를 유지하고 2칸 들여쓰기를 사용한다. 자동 줄바꿈은 하지 않으며 출력 끝에는 줄바꿈 하나를 둔다.

### 5.2 YAML 입력

YAML은 YAML 1.2 단일 문서로 처리한다.

- 객체, 배열, 스칼라 루트 허용
- `---`로 시작하는 단일 문서 허용
- 두 개 이상의 문서는 차단 오류 처리
- mapping 키는 문자열만 허용
- 중복 mapping 키 거부
- anchor와 alias는 실제 값으로 해석
- alias 확장 수는 100으로 제한
- alias가 순환 구조를 만들면 차단 오류 처리
- YAML 1.2 기본 tag 외 사용자 정의 tag 거부

유효한 YAML은 2칸 들여쓰기 JSON으로 직렬화한다. 출력 끝에는 줄바꿈 하나를 둔다.

### 5.3 방향 전환

기본 방향은 JSON에서 YAML이다. 방향 전환 버튼은 현재 결과가 존재하고 최신 상태일 때만 활성화한다.

방향 전환 시 다음을 한 번의 상태 변경으로 처리한다.

1. 현재 결과를 새 원본으로 설정한다.
2. 원본과 결과 형식을 바꾼다.
3. 원본 편집기에 포커스를 둔다.
4. 결과를 새 방향으로 다시 계산한다.

오류나 크기 초과로 결과가 오래된 상태이면 방향 전환을 비활성화한다.

### 5.4 파일 열기

- `.json` 파일은 JSON에서 YAML 방향으로 연다.
- `.yaml`과 `.yml` 파일은 YAML에서 JSON 방향으로 연다.
- 파일 확장자와 내용이 맞지 않으면 해당 확장자의 문법 오류를 표시한다.
- 지원하지 않는 확장자는 현재 입력을 변경하지 않고 파일 오류를 표시한다.
- 1MB를 초과한 파일은 읽어 편집기에 넣지 않고 크기 오류를 표시한다.
- 파일 내용은 브라우저 메모리에서만 처리한다.

붙여넣기나 직접 입력은 현재 선택된 방향을 유지한다. 사용자가 붙여넣은 내용이 반대 형식처럼 보여도 자동 감지로 방향을 바꾸지 않는다.

## 6. Pretty 규칙

Pretty는 자동 변환과 별개의 명시적 편집 작업이다.

### 6.1 JSON Pretty

- 버튼 이름을 `JSON Pretty`로 표시한다.
- 엄격한 JSON 검사가 성공한 경우에만 실행한다.
- `jsonc-parser`의 formatting edit을 사용해 키 순서를 유지한다.
- 2칸 공백 들여쓰기를 적용한다.
- 결과 끝에 줄바꿈 하나를 둔다.
- Monaco 편집 작업으로 반영해 실행 취소가 가능해야 한다.

### 6.2 YAML Pretty

- 버튼 이름을 `YAML Pretty`로 표시한다.
- YAML 단일 문서 검사가 성공한 경우에만 실행한다.
- 파싱한 값을 새 YAML 문서로 직렬화한다.
- 2칸 공백 들여쓰기를 적용한다.
- mapping 키 순서를 유지한다.
- 자동 줄바꿈을 하지 않는다.
- 결과 끝에 줄바꿈 하나를 둔다.
- Monaco 편집 작업으로 반영해 실행 취소가 가능해야 한다.

YAML Pretty 과정에서는 주석, anchor 이름, alias 표현, 원래 공백과 줄바꿈을 보존하지 않는다.

문법 오류나 크기 초과 상태에서는 Pretty가 원문을 변경하지 않는다.

## 7. 크기와 성능

UTF-8 바이트 크기를 기준으로 한다.

- 500KB 미만: 정상 처리
- 500KB 이상 1MB 이하: 성능 안내와 함께 정상 처리
- 1MB 초과: 자동 변환과 Pretty 중단

직접 입력이나 붙여넣기로 1MB를 넘긴 경우 편집은 계속 허용한다. 사용자가 내용을 줄여 제한 안으로 돌아오면 자동 변환을 재개한다. 파일 열기에서는 `File.size`가 1MB를 넘으면 기존 입력을 유지하고 파일을 거부한다.

입력 크기를 `n`, 줄 수를 `m`이라고 할 때 복잡도는 다음과 같다.

- 파싱, 검증, 직렬화: 시간 `O(n)`
- 줄 시작 offset 계산: 시간 `O(n)`, 공간 `O(m)`
- offset에서 행·열 조회: `O(log m)`
- 전체 작업 공간: `O(n)`

Monaco와 파서 모듈은 lazy loading한다. JSON과 YAML 편집에 필요한 worker만 구성한다.

## 8. 오류 처리

파서별 오류를 공통 진단 모델로 바꾼다.

```ts
interface Diagnostic {
  format: 'json' | 'yaml';
  code: string;
  message: string;
  startOffset: number;
  endOffset: number;
  line: number;
  column: number;
}
```

규칙은 다음과 같다.

- 첫 번째 차단 오류만 표시한다.
- marker 범위에는 최소 한 문자를 보장한다.
- 오류 범위를 Monaco의 빨간 물결 밑줄과 gutter marker로 표시한다.
- `3행 13열: 속성 이름 뒤에 콜론이 필요합니다.` 형식으로 안내한다.
- 오류 메시지를 누르면 원본 편집기의 위치로 이동하고 포커스를 둔다.
- 파서 오류 코드는 내부 한국어 메시지로 매핑한다.
- 매핑되지 않은 오류는 위치 정보와 안전하게 정리한 파서 메시지를 표시한다.

오류가 발생하면 마지막 성공 결과를 지우지 않는다. 대신 `현재 입력과 동기화되지 않은 결과` 상태를 명확하게 표시하고 다음 작업을 비활성화한다.

- 결과 복사
- 결과 다운로드
- 방향 전환

입력이 다시 유효해지면 결과를 갱신하고 위 기능을 복구한다.

크기 초과와 파일 읽기 실패는 특정 문법 범위가 없으므로 Monaco marker를 만들지 않고 banner로만 표시한다.

## 9. 화면과 반응형 동작

### 9.1 공통 셸

상단에는 도구 이름, 브라우저 내부 처리 안내, 테마 전환을 둔다. 입력 데이터는 저장되지 않는다는 점을 짧고 명확하게 표시한다.

테마는 저장소 프론트엔드 규칙을 따른다.

- `data-theme` 속성
- 시스템 테마와 `localStorage`의 테마 선택 사용
- `localStorage`에는 테마만 저장하고 편집 내용은 저장하지 않음
- 페인트 전 초기 테마 스크립트로 FOUC 방지

### 9.2 데스크톱

768px 이상에서는 다음을 나란히 표시한다.

- 왼쪽: 편집 가능한 원본
- 가운데: 방향 전환 버튼
- 오른쪽: 읽기 전용 결과

원본 헤더에는 현재 형식에 따라 `JSON Pretty` 또는 `YAML Pretty`를 표시한다. 결과 헤더에는 복사와 다운로드를 표시한다.

### 9.3 모바일

768px 미만에서는 원본과 결과를 탭으로 표시한다.

- 자동 변환 성공 시 결과 탭에 성공 badge를 표시한다.
- 변환 성공만으로 결과 탭에 자동 이동하지 않는다.
- 원본 탭의 헤더에 현재 형식의 Pretty 버튼을 표시한다.
- 방향 전환 후에는 새 원본 탭을 활성화한다.

### 9.4 접근성

- 모든 아이콘 버튼에 보이는 라벨 또는 접근 가능한 이름을 제공한다.
- 탭과 버튼을 키보드로 이동하고 실행할 수 있어야 한다.
- 오류 메시지와 상태 변화는 화면 읽기 도구가 인식할 수 있어야 한다.
- 색상만으로 정상, 경고, 오류를 구분하지 않는다.
- 라이트와 다크 테마 모두에서 marker와 상태 문구의 대비를 확인한다.

## 10. 입출력 기능

- 예제 불러오기: 현재 방향에 맞는 짧은 예제를 원본에 넣는다.
- 지우기: 원본, 결과, 진단을 빈 상태로 되돌린다.
- 복사: 최신 결과만 클립보드에 복사한다.
- 다운로드: 최신 결과를 `converted.yaml` 또는 `converted.json`으로 저장한다.
- 다운로드 MIME type: YAML은 `application/yaml`, JSON은 `application/json`

클립보드 권한 거부와 다운로드 생성 실패는 비파괴적인 toast로 안내한다.

## 11. 테스트 전략

### 11.1 도메인 단위 테스트

- JSON 객체, 배열, 스칼라 루트
- YAML 객체, 배열, 스칼라 루트
- 양방향 값 동등성
- JSON 주석, trailing comma, 누락 토큰
- YAML 잘못된 들여쓰기, 다중 문서, 사용자 정의 tag
- anchor와 alias 해석, alias 제한, 순환 참조
- 비문자열 키, 중복 키, 비유한 숫자
- JSON Pretty와 YAML Pretty
- mapping 키 순서 유지
- UTF-8 크기 경계와 한글 입력
- 오류 offset, 범위, 행, 열과 한국어 메시지

### 11.2 상태와 컴포넌트 테스트

- 300ms debounce
- revision 변경 시 이전 예약 결과 폐기
- 성공, 오류, 오래된 결과, 크기 초과 상태 전이
- 오래된 결과 작업 비활성화
- 오류 수정 후 자동 복구
- 형식에 맞는 Pretty 버튼 표시
- Pretty 실패 시 원문 유지
- 방향 전환
- 파일 확장자별 방향 설정
- 테마 초기화와 전환

### 11.3 Playwright E2E

- 데스크톱 양쪽 편집기
- 모바일 원본·결과 탭
- 모바일 자동 탭 이동 방지
- Monaco 오류 marker와 gutter
- 오류 메시지 클릭 후 커서 이동
- 파일 열기
- 결과 복사와 다운로드
- 방향 전환
- 라이트·다크 테마
- 주요 키보드 흐름

외부 파서의 영문 오류 전체 문장을 테스트에 고정하지 않는다. 정규화한 코드, 범위, 행, 열과 내부 한국어 메시지를 검증한다.

## 12. 검증 명령

`json-yaml-converter/`에서 다음 명령을 모두 통과해야 한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

홈 메타데이터를 수정한 뒤 `home/`에서 다음 명령을 모두 통과해야 한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

저장소 루트에서는 `git diff --check`를 실행한다.

## 13. 문서와 Tool Hub 연동

다음 문서를 추가하거나 갱신한다.

- `json-yaml-converter/AGENTS.md`: 짧은 프로젝트 안내 색인
- `json-yaml-converter/docs/contributor-guide.md`: 구조, 명령, 수동 검증 안내
- `json-yaml-converter/README.md`: 사용자 기능과 로컬 실행 방법
- 루트 `README.md`: 도구 목록에 변환기 추가
- `home/src/data/tools.ts`: 변환기 카드 추가

배포 URL이 없으므로 홈 카드 상태는 `coming-soon`, URL은 `null`로 둔다. 배포 후 별도 변경에서 `live`와 실제 URL로 바꾼다.

## 14. 완료 기준

다음 조건을 모두 만족해야 구현 완료로 본다.

- JSON과 YAML 양방향 자동 변환이 동작한다.
- JSON Pretty와 YAML Pretty가 명시적으로 제공된다.
- 첫 번째 문법 오류의 범위, 행, 열과 한국어 원인이 표시된다.
- 오류 메시지로 해당 위치에 이동할 수 있다.
- 오래된 결과를 현재 결과로 내보낼 수 없다.
- 파일, 예제, 지우기, 복사, 다운로드가 동작한다.
- 500KB와 1MB 경계가 명세대로 동작한다.
- 데스크톱과 모바일 레이아웃이 명세대로 전환된다.
- 입력과 변환 결과가 서버나 영구 저장소에 저장되지 않는다.
- 프로젝트와 홈의 필수 검증 명령이 모두 통과한다.
- 구현, 테스트, README, 기여자 문서가 서로 일치한다.
- 로컬 커밋까지만 수행하며 원격 푸시는 하지 않는다.

# JSON/YAML Converter 편집 액션·예제·진단 배치 설계

## 상태

- 사용자 승인: 2026-07-23
- 적용 대상: `json-yaml-converter`
- 선행 설계: `2026-07-22-json-yaml-converter-reference-alignment-design.md`
- 대체 범위: 선행 설계의 편집기 ghost action 표현과 진단 배너 위치

## 목표

1. 편집기 헤더의 Pretty, 결과 복사, 결과 다운로드를 컴팩트한 아이콘 버튼으로 표시한다.
2. 예제 불러오기 데이터를 사용자가 제공한 AsyncAPI 2.6 Streetlights Kafka API 문서로 교체한다.
3. 문법 진단을 통합 편집 카드 내부에서 `converter-grid` 바로 아래의 전체 너비 footer로 표시한다.
4. 기존 변환 방향, 액션 동작, 진단 포커스와 접근성 이름을 보존한다.

## 제외 범위

- JSON/YAML 파서와 serializer 동작 변경
- 변환 debounce, 크기 제한, stale result와 파일·클립보드 race 처리 변경
- 상단바, 제어 카드, 데스크톱 2열과 모바일 탭 구조 변경
- 새로운 아이콘 또는 tooltip package 추가

## 선택한 접근

### 편집 액션

- JSON/YAML Pretty는 Lucide `AlignLeft` 아이콘을 사용한다.
- 결과 복사는 Lucide `Copy`, 결과 다운로드는 Lucide `Download` 아이콘을 사용한다.
- 세 액션 모두 기존 36×36px `btn-icon` 크기를 사용한다.
- 화면에는 아이콘만 표시하지만 `aria-label`과 `title`에는 기존 이름인 `JSON Pretty`, `YAML Pretty`, `결과 복사`, `결과 다운로드`를 유지한다.
- disabled 조건과 click handler는 변경하지 않는다.

텍스트와 아이콘을 함께 표시하는 대안은 의미가 가장 명확하지만 편집기 헤더 밀도를 줄이지 못한다. 아이콘만 표시하면서 접근성 이름과 tooltip을 유지하는 방식이 기준 앱의 컴팩트한 헤더와 가장 잘 맞는다.

### AsyncAPI 예제

- 사용자가 제공한 YAML 원문을 고정 fixture로 보관한다.
- YAML → JSON 방향에서는 해당 YAML 원문을 그대로 원본 편집기에 넣는다.
- JSON → YAML 방향에서는 같은 데이터를 JSON fixture로 넣는다.
- 두 fixture는 별도로 보관하되, 테스트에서 YAML과 JSON을 파싱한 결과가 같은지 확인해 의미적 drift를 막는다.
- 예제 버튼은 현재 선택한 변환 방향을 바꾸지 않는다.

항상 YAML을 넣고 방향을 강제로 YAML → JSON으로 전환하는 대안은 fixture 중복이 없지만 사용자가 선택한 상태를 예상하지 않게 바꾼다. 현재 방향을 유지하는 방향별 fixture를 권장안으로 채택한다.

### 진단 footer

- `ConverterPage`가 편집 카드 위에 별도로 렌더링하던 `DiagnosticBanner`를 제거한다.
- `ConverterWorkspace`가 이미 전달받는 `state.diagnostic`을 사용해 `converter-grid` 다음에 배너를 렌더링한다.
- `ConverterWorkspace`에 진단 위치로 이동시키는 callback만 추가한다.
- footer는 workspace 카드의 전체 너비를 사용하고 editor grid와 1px danger 계열 상단 선으로 구분한다.
- 모바일에서는 탭과 선택된 편집기 다음에 footer를 표시한다. workspace의 8px 내부 여백을 상쇄해 카드 좌우·하단 경계에 맞춘다.
- `role="alert"`, 진단 행·열·메시지, 클릭 시 원본 탭 선택과 Monaco 진단 위치 focus를 유지한다.

카드 바깥에 별도 경고 카드를 두는 대안은 상태를 강하게 분리하지만 오류가 어느 편집 영역에 속하는지 시각적 연결이 약하다. 편집 카드 내부 footer가 진단과 원본 편집기의 관계를 가장 명확하게 보여준다.

## 컴포넌트 변경

| 파일 | 변경 |
| --- | --- |
| `src/data/asyncapiSample.ts` | 방향별 AsyncAPI YAML/JSON fixture 제공 |
| `src/lib/converter.ts` | `sampleFor`가 방향별 AsyncAPI fixture를 반환 |
| `src/components/converter/EditorPanel.tsx` | 세 텍스트 액션을 Lucide 아이콘 버튼으로 변경 |
| `src/components/converter/ConverterWorkspace.tsx` | grid 아래에 진단 footer를 렌더링하고 focus callback 전달 |
| `src/pages/ConverterPage.tsx` | 페이지 레벨 진단 배너를 제거하고 callback을 workspace에 전달 |
| `src/styles/components.css` | editor action과 desktop/mobile 진단 footer 스타일 적용 |

## 데이터 흐름

1. 예제 버튼은 기존 `loadSample`을 호출한다.
2. `sampleFor(direction)`은 현재 방향에 맞는 AsyncAPI JSON 또는 YAML fixture를 반환한다.
3. 기존 `replaceSource`와 debounce 변환 흐름이 fixture를 처리한다.
4. 변환 실패 시 `state.diagnostic`은 기존과 같이 생성된다.
5. `ConverterWorkspace`는 diagnostic이 있을 때 grid 아래 footer를 표시한다.
6. footer 클릭은 기존 `handleDiagnosticFocus`를 호출해 모바일 원본 탭 선택 후 Monaco 위치로 이동한다.

따라서 fixture 크기에 비례한 변환 시간·공간 복잡도는 기존과 같은 O(n)이며 UI 배치 변경은 상수 크기의 렌더 요소만 추가한다.

## 오류 처리와 접근성

- 정적 fixture는 테스트에서 두 형식 모두 파싱·변환 가능한지 검증한다.
- 아이콘 버튼의 accessible name은 기존 E2E selector와 사용자 의미를 보존한다.
- native `title`을 제공해 포인터 사용자도 아이콘 의미를 확인할 수 있게 한다.
- 진단 footer는 alert live semantics와 keyboard focus-visible을 유지한다.
- 아이콘은 `aria-hidden` 상태로 렌더링하고 버튼 이름을 중복하지 않는다.

## 테스트

### 단위·컴포넌트

- `sampleFor`가 방향별 AsyncAPI fixture를 반환하고 두 fixture의 데이터가 같은지 확인한다.
- Pretty, 복사, 다운로드 버튼이 텍스트 노드 없이 아이콘을 표시하면서 기존 accessible name과 disabled 상태를 유지하는지 확인한다.
- diagnostic footer가 `converter-workspace`에는 포함되고 `converter-grid`에는 포함되지 않으며 grid의 다음 형제인지 확인한다.
- 기존 진단 클릭 후 원본 탭 선택과 editor focus 테스트를 유지한다.

### 브라우저

- 예제 불러오기 후 AsyncAPI title과 channel 데이터가 양방향으로 변환되는지 확인한다.
- 데스크톱과 모바일에서 세 아이콘 버튼의 36×36px 크기와 accessible name을 확인한다.
- 오류 입력 후 진단이 editor grid 바로 아래에 표시되고 클릭 시 기존 focus 동작을 수행하는지 확인한다.
- 기존 라이트·다크 진단 대비 검증을 유지한다.

## 완료 검증

`json-yaml-converter/`에서 다음 명령을 모두 통과해야 한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

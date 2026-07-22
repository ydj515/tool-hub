# JSON/YAML Converter UI 통일화 설계

## 목적

`json-yaml-converter`를 Tool Hub의 다른 React 도구와 같은 제품군으로 보이게 정리한다. `Config Diff Viewer`의 작업 공간 밀도와 `Sign Maker`의 카드·토큰 체계를 주 기준으로 하고, Home의 간결한 브랜드 표현을 보조로 사용한다.

이 작업은 시각적 구조와 스타일만 변경한다. JSON/YAML 변환, Pretty, 파일 입력, 복사·다운로드, 진단, 크기 제한, 모바일 탭, 방향 전환과 swap의 상태 전이는 유지한다.

## 참조와 선택

| 참조 프로젝트 | 채택 요소 | 채택하지 않는 요소 |
| --- | --- | --- |
| `config-diff-viewer` | 카드형 topbar, compact action hierarchy, 두 편집기를 하나의 workspace로 묶는 구조 | 비교 실행 버튼 중심의 단일 action 모델 |
| `sign-maker` | cool-neutral surface, 12~16px radius, primary/secondary/icon control 구분 | 세로 panel stack 중심의 데스크톱 구성 |
| `home` | Tool Hub 브랜드 마크, 간결한 타이포그래피, icon-first theme control | 콘텐츠보다 넓은 marketing 여백 |

선택한 방향은 **Converter Studio**다. 데스크톱에서 원본과 결과의 동시 비교가 핵심이므로, 두 편집기를 독립 카드로 분절하지 않고 공통 workspace surface 안에서 관계를 드러낸다.

## 레이아웃

### 앱 셸

- 페이지 배경은 cool-neutral `--bg`를 사용한다.
- 화면 바깥 여백은 desktop 18~24px, mobile 12px로 둔다.
- 상단 bar와 workspace의 최대 폭은 1440px로 맞춘다.
- app shell은 `Layout`이 유지하고, page가 converter 상태와 action을 소유한다.

### 상단 bar

- 왼쪽에는 primary blue 앱 마크, `JSON YAML Converter` 제목, 브라우저 로컬 처리 안내를 둔다.
- 오른쪽에는 아이콘형 테마 전환을 둔다. 현재 `aria-label="테마 전환"`은 유지한다.
- 테마 전환은 라벨형 버튼에서 아이콘형 버튼으로 바뀌어도 키보드 focus ring과 accessible name을 유지한다.

### 도구와 상태

- 변환 방향은 하나의 segmented control로 유지한다.
- 예제, 파일, 지우기는 compact secondary control로 묶는다.
- 입력 크기·valid/invalid·file pending 상태는 toolbar와 workspace 사이의 status row에서 짧게 표시한다.
- 진단과 action message는 status row 바로 아래에 full-width로 표시한다. 진단 banner의 행·열 텍스트와 focus 동작은 유지한다.

### 편집 workspace

- desktop에서 `converter-grid`는 원본, 중앙 swap, 결과의 3열 관계를 유지한다.
- 두 editor panel은 공통 workspace surface 안에 배치하고, panel header에서 format label과 action을 정렬한다.
- source의 Pretty와 result의 copy/download는 primary가 아닌 secondary/ghost action으로 둔다.
- swap은 중앙의 icon control이며 결과가 stale이거나 pending일 때 기존처럼 disabled 상태를 유지한다.

### mobile

- 767px 이하에서는 하나의 editor tabpanel만 보인다.
- 원본/결과 탭, completion badge, 결과 탭의 read-only state를 유지한다.
- swap은 mobile에서도 숨기지 않으며, swap과 방향 전환 뒤 source tab을 선택하는 현재 상태 전이를 유지한다.

## 시각 토큰과 상호작용

```text
canvas:       #f7f7f8 / dark #1b1c1e
surface:      #ffffff / dark #212225
primary:      #3366ff / dark #5b84ff
radius:       10px control, 14~16px card
border:       cool-neutral translucent hairline
focus:        2px primary outline + 2px offset
```

- `theme.css`는 의미 토큰을 단일 위치에 유지한다.
- `components.css`는 topbar, workspace, panel, segmented control, button variant를 담당한다.
- disabled 상태는 opacity만으로 구분하지 않고 contrast가 유지되는 border/text 토큰을 사용한다.
- hover, active, focus-visible, selected, stale, diagnostic 상태는 light/dark 모두 유지한다.

## 컴포넌트 경계

| 컴포넌트 | 책임 | 변경 범위 |
| --- | --- | --- |
| `Header` | 앱 마크, 제목, 테마 전환 | 카드형 topbar와 icon toggle 표현 |
| `ConverterToolbar` | 방향, 예제, 파일, 지우기 | segmented/action group 표현 |
| `StatusBar` / `DiagnosticBanner` | 상태와 오류 피드백 | workspace 상단 배치와 token 적용 |
| `ConverterWorkspace` / `EditorPanel` | 편집기·swap·mobile tabs | 공통 workspace surface와 panel hierarchy |
| `Button` | 공통 버튼 primitive | primary/secondary/ghost/icon variant 일관화 |

`ConverterPage`의 converter state, file/clipboard race 방지, diagnostic focus, source tab 복귀 로직은 변경하지 않는다.

## 접근성 및 회귀 방지

- 기존 role, accessible name, radio/tab selected state, disabled 상태를 보존한다.
- light/dark에서 진단 텍스트 4.5:1 이상, non-text control border/focus/gutter 3:1 이상을 유지한다.
- Monaco editor의 marker, squiggle, glyph margin과 diagnostic banner 행·열 연결을 변경하지 않는다.
- 768px desktop과 767px mobile 전환 및 390px mobile keyboard 흐름을 회귀 대상으로 둔다.

## 검증

1. `npm run test`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. `npm run test:e2e`
6. 실제 Chromium에서 1280px desktop과 390px mobile의 toolbar, editor hierarchy, swap, diagnostic, light/dark contrast를 확인한다.

## 제외 범위

- converter parser, YAML writer, worker protocol, input/output limit 변경
- 새 API, 서버 저장, 인증, analytics 추가
- Home 또는 다른 도구의 코드를 공유 컴포넌트로 추출하는 리팩터링

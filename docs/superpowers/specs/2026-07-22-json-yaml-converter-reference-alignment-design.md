# JSON/YAML Converter 기준 앱 UI 정렬 설계

## 상태

- 사용자 승인: 2026-07-22
- 선택안: `sign-maker`와 `config-diff-viewer`의 혼합형
- 적용 범위: 레이아웃, 카드 구조, 시각 토큰, 컴포넌트 크기, 반응형 배치

## 배경

현재 `json-yaml-converter`는 카드형 Studio 구조를 도입했지만 `sign-maker`, `config-diff-viewer`와 비교하면 셸 폭, 상단 바 구성, 카드 비례, 편집기 사이 간격과 액션 배치가 다르다. 특히 1440px 셸, 별도 56px swap 열, 360px 편집기 높이는 기준 앱과 다른 밀도를 만든다.

이 설계는 기존 `2026-07-22-json-yaml-converter-ui-unification-design.md`의 기능 보존 원칙을 유지하되, 시각 구조를 이번에 승인된 기준으로 대체한다.

## 목표

1. `sign-maker`의 앱 셸, 상단 바 비례, 카드·버튼·토큰 체계를 따른다.
2. `config-diff-viewer`처럼 원본과 결과를 하나의 2열 편집 카드로 묶는다.
3. 기존 변환, Pretty, 파일 입력, 복사, 다운로드, 진단, stale 결과, 방향 전환과 swap 동작을 그대로 유지한다.
4. 모바일에서는 승인된 원본/결과 탭 전환 방식을 유지한다.

## 제외 범위

- JSON/YAML 파서, serializer, 크기 제한과 변환 상태 머신 변경
- 서버 저장, 네트워크 전송, analytics 추가
- 다른 앱과 런타임 공통 컴포넌트를 공유하는 모노레포 리팩터링
- 사용자 문구나 지원 포맷 변경

## 승인된 방향과 대안

### 선택: 혼합형

- `sign-maker`: 최대 1400px 셸, 16px 카드 반경, 40px 앱 마크, cool-neutral 토큰, 카드형 상단 바
- `config-diff-viewer`: 두 편집기를 직접 맞댄 단일 2열 카드, 컴팩트한 편집기 헤더와 액션 밀도
- `json-yaml-converter`: 자동 변환 상태와 모바일 탭, 중앙 swap 동작을 유지

이 조합은 Tool Hub 제품군의 인상을 가장 강하게 만들면서도 변환기의 원본·결과 동시 비교 흐름을 보존한다.

### 선택하지 않은 대안

1. `sign-maker` 우선형: 큰 작업 카드와 우측 도구 카드 구성은 서명 도구에는 적합하지만 동일 비중의 원본·결과 편집기에는 맞지 않는다.
2. `config-diff-viewer` 우선형: 모든 액션을 상단 바에 모으면 자동 변환 도구치고 상단 바가 복잡해지고 작은 화면에서 줄바꿈이 많아진다.
3. 기존 Studio 미세 조정형: 변경 범위는 작지만 56px 중앙 열과 별도 카드 비례가 남아 사용자가 지적한 제품군 차이를 해소하지 못한다.

## 레이아웃

### 앱 셸

- `sign-maker`와 동일하게 화면 패딩은 모바일 16px, `md` 이상 24px를 사용한다.
- 상단 바와 모든 콘텐츠의 최대 폭은 1400px로 통일한다.
- 상단 바, 제어 카드, 편집 카드 사이의 세로 간격은 20px를 기본으로 하고 모바일에서는 12px로 줄인다.
- 페이지 배경은 `--bg`, 모든 카드는 `--surface`를 사용한다.

### 상단 바

- 왼쪽에 40×40px primary 앱 마크, 제목, 브라우저 로컬 처리 안내를 둔다.
- 오른쪽에는 변환 방향 segmented control과 36×36px 테마 버튼을 둔다.
- segmented control은 `sign-maker`의 `SegmentedTabs`와 같은 4px 내부 패딩, 8px 선택 항목 반경, surface 선택 배경과 primary 텍스트를 사용한다.
- 좁은 화면에서는 브랜드와 테마 버튼을 첫 줄에 두고 변환 방향은 다음 줄의 전체 너비를 사용한다.

변환 방향 상태는 `ConverterPage`가 소유하므로 `Header`를 `ConverterPage` 내부에서 렌더링한다. `App`은 theme과 toggle만 페이지에 전달하고, `Layout`은 화면 패딩 셸만 담당한다.

### 제어 카드

- 두 번째 카드는 예제 불러오기, 파일 열기, 원본 지우기, 변환 상태와 입력 크기를 담는다.
- 액션은 왼쪽, 상태는 오른쪽에 배치하고 하단에 브라우저 로컬 처리 안내를 짧게 표시한다.
- 버튼 높이는 36px, 수평 패딩은 12px, 반경은 12px를 사용한다.
- 모바일에서는 액션이 자연스럽게 줄바꿈되고 상태는 별도 한 줄을 차지한다.

### 통합 편집 카드

- 원본과 결과는 하나의 카드 안에서 `1fr 1fr` 두 열로 배치한다.
- 기존 56px 중앙 swap 열과 패널 사이 gap을 제거하고 1px 세로 구분선만 둔다.
- 두 편집기 헤더는 높이 50px, 수평 패딩 14px를 사용한다.
- 원본의 Pretty와 결과의 복사·다운로드는 transparent ghost action으로 표시한다.
- 편집기 본문은 데스크톱에서 최소 400px 높이를 사용한다.
- 36×36px swap 버튼은 데스크톱에서 중앙 구분선의 헤더·본문 경계 위에 겹쳐 배치한다. disabled 조건과 accessible name은 현재와 동일하다.

### 모바일 편집 카드

- 767px 이하에서는 승인된 원본/결과 탭 전환 방식을 사용한다.
- 선택된 tabpanel 하나만 렌더 영역에 표시하고 편집기 높이는 `52vh`, 최소 320px를 유지한다.
- swap 버튼은 탭 아래의 우측 정렬 액션으로 이동하며 숨기지 않는다.
- 방향 전환이나 swap 후 원본 탭을 선택하는 현재 상태 전이를 유지한다.

## 시각 토큰

기본 토큰은 `sign-maker/src/styles/theme.css`의 값을 기준으로 맞춘다.

| 역할 | Light | Dark |
| --- | --- | --- |
| 페이지 배경 | `#f7f7f8` | `rgb(15,15,16)` |
| 카드 배경 | `#ffffff` | `rgb(27,28,30)` |
| 보조 배경 | `#f7f7f8` | `rgb(33,34,37)` |
| 기본 텍스트 | `rgb(23,23,23)` | `rgb(247,247,247)` |
| Primary | `rgb(51,102,255)` | `rgb(91,132,255)` |
| 카드 선 | `rgba(112,115,124,0.22)` | `rgba(112,115,124,0.32)` |
| 카드 반경 | 16px | 16px |
| 컨트롤 반경 | 12px | 12px |
| 카드 그림자 | `--shadow-sm` | `--shadow-sm` |

converter 전용 success, warning, danger, editor background 토큰은 제거하지 않고 같은 명암 체계 안에서 유지한다. focus는 2px primary outline과 2px offset을 사용한다.

## 컴포넌트 책임

| 컴포넌트 | 책임과 변경 |
| --- | --- |
| `App` | theme 상태를 유지하고 `Layout` 안에 `ConverterPage`를 렌더링한다. |
| `Layout` | `sign-maker`와 같은 화면 패딩 셸만 담당한다. |
| `Header` | 브랜드, 변환 방향 segmented control, 테마 버튼을 담당한다. |
| `ConverterToolbar` | 예제, 파일, 지우기 액션만 담당한다. 방향 radio의 키보드 로직은 `Header`로 이동한다. |
| `StatusBar` | 변환 상태와 입력 크기를 제어 카드 오른쪽 또는 다음 줄에 표시한다. |
| `ConverterWorkspace` | 모바일 탭과 통합 2열 카드, swap 위치를 관리한다. |
| `EditorPanel` | 편집기 헤더, format label, panel별 ghost action과 Monaco frame을 렌더링한다. |
| `Button` | secondary, primary, ghost, icon variant와 공통 36px 높이를 제공한다. |

새로운 공통 추상화는 반복 사용이 확인되는 경우에만 추가한다. 제어 카드처럼 한 번만 사용하는 구조는 별도 범용 컴포넌트로 만들지 않는다.

## 상태와 데이터 흐름

1. `ConverterPage`의 `useConverter`가 source, result, direction, status, diagnostic을 계속 소유한다.
2. `Header`의 방향 선택은 기존 `handleDirectionChange`를 호출한다.
3. `ConverterToolbar`의 예제, 파일, 지우기 액션은 현재 handler를 그대로 호출한다.
4. `ConverterWorkspace`의 Pretty, 복사, 다운로드, swap은 기존 handler와 disabled 조건을 유지한다.
5. UI 재배치 과정에서 conversion debounce, stale result 방지, clipboard/file race 방지 로직은 변경하지 않는다.

따라서 데이터 처리 시간·공간 복잡도는 현재와 동일하며 이번 변경은 렌더 트리와 CSS 배치에만 영향을 준다.

## 오류와 상태 표시

- 진단 배너는 제어 카드와 편집 카드 사이에 전체 너비 경고 카드로 표시한다.
- 행·열 메시지와 진단 위치로 포커스를 이동하는 동작을 유지한다.
- action message는 StatusBar와 충돌하지 않도록 제어 카드 아래의 별도 status 영역에 표시한다.
- stale 결과 문구는 결과 패널 내부에 유지한다.
- file pending, invalid, oversized 상태의 버튼 비활성화 조건과 색상 의미를 유지한다.
- light/dark에서 진단 텍스트는 4.5:1 이상, 컨트롤 경계와 focus ring은 3:1 이상을 목표로 한다.

## 접근성

- 변환 방향은 `radiogroup`과 roving `tabIndex`를 유지한다.
- 모바일 원본/결과는 `tablist`, `tab`, `tabpanel` 관계를 유지한다.
- `aria-label="테마 전환"`, `aria-label="변환 방향 전환"`, 편집기 accessible name을 변경하지 않는다.
- hover뿐 아니라 keyboard focus-visible 상태를 모든 interactive control에 제공한다.
- 모션 감소 설정에서는 불필요한 transition을 제거한다.

## 테스트와 검증

### 컴포넌트 테스트

- `Header`가 방향 selector, 브랜드, 테마 버튼을 렌더링하고 기존 방향 키보드 탐색을 보존하는지 확인한다.
- `ConverterToolbar`가 세 source action을 렌더링하고 파일 input 동작을 보존하는지 확인한다.
- 통합 편집 카드 안에 원본과 결과가 함께 존재하고 swap이 동일한 disabled 조건을 쓰는지 확인한다.
- 진단 포커스, stale 결과, Pretty, 복사, 다운로드 회귀 테스트를 유지한다.

### 브라우저 테스트

- 1280px에서 최대 폭, 세 카드 구조, 직접 맞닿은 2열 편집기, 중앙 swap을 확인한다.
- 768px에서 두 편집기가 계속 함께 보이는지 확인한다.
- 767px과 390px에서 모바일 탭 한 패널만 보이고 swap이 노출되는지 확인한다.
- 라이트·다크 테마의 핵심 배경, 텍스트, 진단과 focus 대비를 확인한다.
- 기능 흐름으로 방향 전환, 예제 로드, Pretty, 복사, 다운로드와 모바일 탭을 실행한다.

### 완료 명령

`json-yaml-converter/`에서 다음 명령을 모두 통과해야 한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

## 완료 기준

1. `json-yaml-converter`가 `sign-maker`와 동일한 셸·토큰·카드·컨트롤 비례를 사용한다.
2. 데스크톱 편집 영역이 `config-diff-viewer`처럼 하나의 직접 맞닿은 2열 카드로 보인다.
3. 모바일 원본/결과 탭과 기존 변환 기능에 회귀가 없다.
4. 모든 필수 검증 명령이 통과한다.

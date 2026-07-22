# JSON/YAML Converter 복사 성공 피드백 설계

## 상태

- 사용자 승인: 2026-07-23
- 적용 대상: `json-yaml-converter`
- 선행 설계: `2026-07-23-json-yaml-converter-editor-actions-sample-diagnostic-design.md`

## 목표

1. 결과 복사가 성공하면 복사 아이콘을 체크 아이콘으로 일시 교체한다.
2. `결과를 클립보드에 복사했습니다.` 문구를 작업 흐름을 밀지 않는 일시 알림으로 표시한다.
3. 2초 후 체크 아이콘과 알림을 모두 기본 상태로 되돌린다.
4. 이전 입력 또는 비동기 클립보드 요청이 최신 화면 상태를 되살리지 않도록 기존 revision 보호를 유지한다.

## 제외 범위

- 클립보드 API, 다운로드, 변환, debounce, 파일 읽기 동작 변경
- 실패·파일 오류 메시지의 기존 인라인 표시 방식 변경
- 새 알림 라이브러리 또는 package 추가
- 헤더, 편집기 카드, 진단 footer 레이아웃 변경

## 디자인 시스템 확인

- `sign-maker`의 아이콘 버튼은 `surface`, `line`, `radius-md`, `fill` hover와 `--dur`/`--ease` 전환을 공통으로 사용한다.
- `json-yaml-converter`도 같은 버튼 크기(36×36px), 카드 토큰, `--success` 상태 색상과 `--shadow-md`를 이미 제공한다.
- `config-diff-viewer`는 fixed overlay와 진입 모션을 사용하지만, 복사 성공 같은 피드백 토스트는 제공하지 않는다.

따라서 별도의 시각 언어를 추가하지 않고, converter의 기존 surface 카드와 success 상태 토큰으로 작은 fixed 알림을 만든다.

## 선택한 접근

### 성공 상태

- `ConverterPage`가 `copySucceeded` boolean과 `copyFeedbackTimerRef`를 소유한다.
- `navigator.clipboard.writeText`가 성공하고 request/revision이 최신일 때만 `copySucceeded`를 `true`로 바꾼다.
- 성공 상태를 설정할 때 기존 timer를 취소하고, 2,000ms timer가 `copySucceeded`를 `false`로 되돌린다.
- `beginMutation`과 unmount cleanup은 timer를 취소하고 성공 상태를 초기화한다.
- 실패 시에는 성공 상태를 만들지 않고 기존 `action-message`의 오류 문구만 유지한다.

현재 성공도 `action-message`에 넣는 방식은 페이지 레이아웃을 이동시키고 성공과 실패 피드백의 역할이 섞인다. 성공을 별도 transient state로 분리하면 버튼과 알림을 같은 수명으로 제어할 수 있다.

### 결과 복사 버튼

- `copySucceeded`는 `ConverterWorkspace`를 거쳐 결과 `EditorPanel`에 전달한다.
- 결과 복사 버튼은 success 동안 Lucide `Check`, 기본 상태에서는 `Copy`를 렌더링한다.
- 버튼의 accessible name과 title은 기존과 동일한 `결과 복사`로 유지한다. 성공 알림은 live region이 별도로 전달하므로 action 이름을 바꾸지 않는다.
- `data-copied="true"`를 style hook과 회귀 테스트 대상으로 제공한다.
- success 상태는 `success`/`success-surface` 토큰으로 아이콘·border·배경을 강조하고, 기존 160ms transition을 사용한다.

### 일시 알림

- `CopySuccessToast`는 성공 상태일 때만 렌더링한다.
- `role="status"`와 `aria-live="polite"`를 사용하며, 체크 아이콘과 성공 문구를 함께 표시한다.
- desktop에서는 우하단 24px, mobile에서는 좌우 12px·하단 12px의 fixed 위치를 사용한다.
- 알림 표면은 `surface`, `line`, `radius-md`, `shadow-md`로 구성하고 success indicator에 `success-surface`를 사용한다.
- 160ms fade/translate 진입 모션을 제공하고, timer 종료 시 DOM에서 제거한다.

## 컴포넌트와 데이터 흐름

| 파일 | 변경 |
| --- | --- |
| `src/pages/ConverterPage.tsx` | 성공 상태·timer lifecycle, 성공 토스트 렌더링, workspace prop 전달 |
| `src/components/converter/ConverterWorkspace.tsx` | `copySucceeded` prop을 결과 panel에 전달 |
| `src/components/converter/EditorPanel.tsx` | Copy/Check 전환과 `data-copied` hook 제공 |
| `src/components/feedback/CopySuccessToast.tsx` | 성공 알림의 접근 가능한 markup 제공 |
| `src/styles/theme.css` | light/dark `--success-surface` 토큰 제공 |
| `src/styles/components.css` | 체크 버튼과 fixed toast 스타일·진입 모션 제공 |
| `src/pages/ConverterPage.test.tsx` | 성공, 2초 복귀, 새 mutation 초기화 회귀 |
| `e2e/converter.spec.ts` | 실제 브라우저의 체크/알림/자동 소멸 흐름 회귀 |

1. 사용자가 결과 복사를 누른다.
2. 최신 clipboard request가 성공하면 page가 `copySucceeded=true`를 설정한다.
3. 결과 버튼은 체크 아이콘으로 교체되고 toast가 live status로 나타난다.
4. 2초 후 같은 state가 false로 돌아가 Copy 아이콘과 toast 제거가 함께 일어난다.
5. 그 전에 새 source mutation 또는 unmount가 일어나면 pending timer와 success UI를 즉시 제거한다.

상태 전환은 상수 시간·공간 O(1)이며, 기존 clipboard write 비용은 결과 문자열 길이 O(n)을 유지한다.

## 접근성과 오류 처리

- 시각 아이콘은 `aria-hidden`이며 버튼은 기존 accessible name을 계속 제공한다.
- 성공 문구는 polite live region으로 한 번만 읽힌다.
- 성공 timer는 unmount 시 취소해 state update warning을 막는다.
- 이전 request의 성공/실패는 기존 revision/request guard가 최신 mutation 뒤 UI를 바꾸지 못하게 한다.
- 복사 실패는 성공 toast를 표시하지 않고 기존 오류 메시지를 그대로 보인다.

## 테스트와 완료 검증

- component test: 성공 시 버튼 `data-copied=true`와 toast를 확인하고 2초 뒤 기본 state와 toast 제거를 확인한다.
- component test: 표시 중 새 원본 입력이 즉시 success UI를 제거하는지 확인한다.
- browser test: 실제 clipboard permission 환경에서 체크, 성공 알림, 자동 소멸을 확인한다.

`json-yaml-converter/`에서 다음 명령을 모두 통과해야 한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

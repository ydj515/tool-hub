# JSON/YAML Converter

## 처리 구조

브라우저 전용 Vite/React 도구다. UI는 Monaco 편집·파일·클립보드 조작을 제공하고, [useConverter](../src/hooks/useConverter.ts)는 방향·입력 revision·진단·마지막 성공 결과와 300ms debounce를 관리한다. 파싱과 직렬화는 [lib](../src/lib/)의 순수 함수가 담당한다. 입력이나 결과를 서버 또는 브라우저 영구 저장소에 보관하지 않는다.

```text
ConverterPage → useConverter → 크기 검사 → JSON/YAML 파서
  → 순서형 DataNode → 반대 형식 직렬화 → Workspace/진단
```

일반 JavaScript 객체는 정수 모양 키의 열거 순서를 바꿀 수 있으므로 `mapping.entries` 배열을 가진 `DataNode`로 순서를 보존한다. 값은 null/boolean/number/string/sequence/mapping으로 표현한다. 메인 스레드의 동기 파싱과 크기 제한을 사용하며 Worker 전환은 성능 측정이 필요할 때 별도로 판단한다.

## 입력과 출력 규칙

| 항목 | 동작 |
|---|---|
| JSON | 엄격한 JSON; 주석·trailing comma·중복 키 거부; 스칼라 루트 허용 |
| YAML | YAML 1.2 단일 문서; 문자열 mapping 키; 중복 키·사용자 정의 tag·다중 문서 거부 |
| anchor/alias | 실제 값으로 해석; 확장 수 100 제한; 순환 거부 |
| 숫자 | 유한한 ECMAScript number; NaN/Infinity 거부; 임의 정밀도 보존 대상 아님 |
| 출력 | 키 순서 유지, 2칸 들여쓰기, 마지막 개행 |
| YAML 표현 | block 형식; 모호하거나 특수한 문자열은 JSON 호환 escape를 쓰는 큰따옴표 표현 |

YAML의 주석, anchor 이름, alias 표현, 원래 공백과 줄바꿈은 보존하지 않는다. Pretty는 명시적인 편집 액션이며 자동 변환과 별개다. 검증 실패나 크기 초과 시 원문을 바꾸지 않고, 성공한 편집은 Monaco undo로 되돌릴 수 있게 한다.

## 크기와 결과 최신성

크기는 문자 수가 아닌 UTF-8 바이트로 계산한다. [size.ts](../src/lib/size.ts)와 [safety.ts](../src/lib/safety.ts)가 기준이다.

- 500KiB 이상부터 성능 안내
- 1MiB 초과 시 변환과 Pretty 중단
- collection 중첩 최대 100단계
- 출력 최대 2MiB

직접 입력이 커져도 편집은 허용하며 제한 이하가 되면 변환을 재개한다. 파일은 읽기 전에 크기를 검사하고 거부 시 기존 입력을 유지한다. 생성 출력은 직렬화 중 예산을 검사한다.

공백 입력은 빈 상태로 처리해 결과와 진단을 지운다. 입력 변경 시 revision을 증가시키고 이전 timer를 취소한다. 현재 입력과 마지막 성공 revision이 다르면 화면에 결과가 남아 있어도 복사·다운로드·결과를 원본으로 사용하는 방향 전환을 막는다. 파서/직렬화 예외는 진단으로 바꾸고 timer 밖으로 전파하지 않는다.

## 사용자 조작과 경쟁 상태

방향 선택은 현재 문자열을 유지하고 선택 형식으로 다시 해석한다. 결과를 새 원본으로 쓰는 swap은 최신 결과가 있을 때만 가능하다. 파일 확장자 `.json`은 JSON 방향, `.yaml`/`.yml`은 YAML 방향을 선택한다. 붙여넣기는 현재 방향을 유지한다.

파일 읽기와 클립보드 요청은 비동기이므로 완료 시점에 입력·방향·요청이 여전히 유효한지 확인한다. 이전 요청이 늦게 끝나 새 입력이나 알림을 덮지 않게 한다.

예제는 [AsyncAPI fixture](../src/data/asyncapiSample.ts)의 Streetlights Kafka API다. 방향별 YAML/JSON을 제공하고 현재 방향은 유지한다. 두 fixture는 파싱한 데이터가 같은지 검사한다.

## 화면과 피드백

공통 카드형 헤더와 생성 프리미티브를 사용한다. 데스크톱은 직접 맞닿은 두 편집 영역, 모바일은 원본/결과 탭이다. 초기의 별도 swap 열과 고정 1440/1400px 제안보다 [공통 셸 규칙](../../docs/design-system.md)을 우선한다.

Pretty·복사·다운로드는 36px 아이콘 버튼이며 접근성 이름과 title을 유지한다. 진단은 편집 grid 다음, 카드 내부 전체 폭 footer에 표시한다. 첫 차단 오류의 범위·행·열을 Monaco marker와 `role="alert"`로 알리고, 진단 선택 시 모바일 원본 탭을 연 뒤 해당 위치로 이동한다.

최신 클립보드 요청이 성공하면 Copy를 Check 아이콘으로 바꾸고 접근 가능한 성공 알림을 2초간 보여준다. 연속 복사는 timer를 다시 시작한다. 실패·입력 변경·언마운트 시 성공 상태와 timer를 정리한다. 실패를 성공으로 표시하지 않는다.

## 유지보수와 검증

- 파서: 정수형 키 순서, 스칼라 루트, 중복 키, YAML alias/순환/tag, Unicode 위치, 깊이·출력 예산
- 상태: debounce, stale result, 파일 읽기 순서, Pretty undo, swap
- UI: 아이콘 접근성 이름, 진단 footer와 focus, 방향별 예제, 성공 알림 수명
- 브라우저: 실제 Monaco worker, 테마, 모바일 탭, 파일·클립보드·다운로드

실행 명령은 [기여자 가이드](contributor-guide.md)와 [README](../README.md)를 따른다. 파싱은 입력 크기에, 직렬화는 입력과 출력 크기에 비례하며 위치 탐색은 줄 시작 offset 인덱스를 사용한다. 실제 편집 지연은 브라우저에서 측정한다.

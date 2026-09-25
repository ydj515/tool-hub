# UI 검증

공통 UI는 생성물 일치, 토큰 대비, 실제 요소 대비, 셸 계산값, 스크린샷을 나누어 검증한다. 각 검사는 다른 회귀를 찾으므로 하나의 통과로 나머지를 대신하지 않는다.

## 정본과 생성물

루트에서 `npm run design-system:check`와 `npm run design-system:test`를 실행한다. 앱의 `ds-sync.test.ts`는 정본과 복사본의 drift를 검사한다. 루트 테스트는 제품 metadata, 파비콘, Lucide 버전, 동기화 실패 처리, breakpoint/UI 정책, 허브 URL과 문서 계약도 검사한다.

관련 구현은 [scripts](../scripts/), [ds-sync.test.ts](../packages/design-system/ds-sync.test.ts)에 있다. 생성물을 직접 고쳐 실패를 숨기지 않고 정본 수정 후 동기화한다.

## 색상 대비

[ds-contrast.test.ts](../packages/design-system/ds-contrast.test.ts)는 토큰 CSS의 리터럴을 읽어 라이트·다크의 배경/표면 조합을 검사한다.

- 본문·보조·강조 텍스트, 역할색과 역할 표면, primary 위 텍스트는 4.5:1 기준이다.
- 입력 경계와 주요 제어 식별에는 3:1 기준을 적용한다. 장식선에는 같은 기준을 강제하지 않는다.
- disabled는 비활성 상태용이며 활성 텍스트에 재사용하지 않는다.
- 반전 표면과 텍스트도 별도로 검사한다.

실제 화면의 알파 합성, 부모 틴트, `background-image`, `color-mix()`는 토큰 검사만으로 알 수 없다. [ds-contrast-e2e.ts](../packages/design-system/ds-contrast-e2e.ts)는 브라우저 캔버스로 계산 색을 읽고 요소와 배경을 비교한다. 앱의 `contrast.spec.ts`가 대상 selector를 지정한다. 테마 전환이 끝난 뒤 측정하며 단일 배경으로 환원할 수 없는 다중 gradient는 측정 불가로 구분한다.

틴트 안 배지가 역할색 표면을 겹치는 경우에는 불투명한 기준 표면 위에 틴트를 그려 합성 기준을 고정한다. 실패 시 글자색만 진하게 만드는 것으로 끝내지 말고 실제 합성 경로를 확인한다.

## 셸 계약과 시각 회귀

[shell-contract-e2e.ts](../packages/design-system/shell-contract-e2e.ts)를 7개 도구에 동기화한다. 각 앱은 제품 metadata와 앱 고유 마스크를 전달한다.

| 화면 | 크기 | 테마 |
|---|---|---|
| mobile | 375×812 | light, dark |
| tablet-boundary | 768×900 | light, dark |
| desktop | 1440×900 | light, dark |

검사 대상은 가로 overflow, 브랜드 40px, 제어 높이 36px, SVG 16px/stroke 2, disabled opacity 1, 테마 토글 순서, 제품명, 카드 배경·반경, 반응형 행 배치다. 애니메이션과 동적 영역을 안정화한 뒤 측정한다.

각 조합에서 헤더와 첫 화면을 캡처해 앱당 12장, 7개 도구 총 84장의 기준 이미지를 관리한다. [primitives.html](../packages/design-system/fixtures/primitives.html)은 앱과 분리한 프리미티브 확인용 fixture다. 기준 이미지 갱신은 의도한 시각 변경을 확인한 뒤 수행한다. 시간·랜덤 값·커서만 좁게 마스킹하고 고정 UI 전체를 가리지 않는다.

## 앱별 검증과 회귀 항목

프로젝트 디렉터리의 `mise.toml`, `package.json`, 기여자 가이드를 기준으로 test/lint/typecheck/build/E2E를 실행한다. 루트 검사는 개별 앱의 검증을 대체하지 않는다. 앱마다 지정된 포트를 사용해 다른 dev server에 연결되는 일을 막는다.

- JSON/YAML: 변환·Pretty·진단 이동·모바일 원본/결과 탭·오래된 결과·복사 완료 알림
- OpenAPI: 변환 후보 적용/취소/복원·외부 요청 차단·메뉴·패널 리사이즈
- API Contract: 명세 입력부터 검토·내보내기, 미지원 항목과 오래된 결과
- Sign Maker: 캔버스 크기·서명 내보내기와 모바일 액션
- DDL/Config/Dummy: 도메인 패널과 다운로드를 유지하면서 공통 셸 적용
- Electron: 실제 렌더러의 계산 스타일·폰트·모달·키보드 동작
- Kotlin: Gradle 검증과 업로드/진행/결과 화면 확인; React E2E 복사본을 추가하지 않음

문서만 변경하면 상대 링크, 이관 누락, 삭제 경로 참조, `git diff --check`와 관련 문서 계약 테스트를 확인한다. 이번 문서 정리가 앱 전체 E2E를 다시 통과했다는 의미는 아니다.

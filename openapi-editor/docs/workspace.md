# OpenAPI Editor 워크스페이스

## 헤더와 메뉴 책임

헤더는 [공통 ToolHeader](../../docs/design-system.md)를 사용한다. 브랜드·핵심 변환 액션·유틸리티를 데스크톱 한 줄로 배치하고 테마 토글을 마지막에 둔다. 초기의 상시 2행 헤더는 폐기된 설계다.

`Topbar`는 내보내기와 샘플을, `DocumentEditor`는 형식 메뉴를 제공한다. 형식 콜백은 App → Workspace → DocumentEditor로 전달한다. 상태와 변환 정책은 메뉴가 아니라 `useWorkspace`가 소유한다.

| 메뉴 | 동작 |
|---|---|
| 내보내기 | YAML/JSON 항목 선택 즉시 다운로드 |
| HTML 명세서 다운로드 | 현재 검증된 명세를 오프라인 ReDoc HTML로 다운로드; 분석 중·오류·후보 검토 중 비활성화 |
| 샘플 | Swagger 2.0, OpenAPI 3.0.4/3.1.2/3.2.0 YAML 샘플 직접 다운로드 |
| 형식 변환 | YAML/JSON으로 원문을 실제 직렬화; 같은 대상 형식 비활성화 |
| 형식 읽기 | 원문은 유지하고 파서의 입력 형식만 지정 |
| 다시 감지 | 확정 형식을 다시 감지 |

샘플 선택 상자와 별도 다운로드 버튼은 사용하지 않는다. 샘플 다운로드는 현재 문서 교체와 구분된다. 후보 검토 중에는 형식 변경을 제한한다.

## 포인터·키보드·터치

[UtilityMenu](../src/components/common/UtilityMenu.tsx)는 트리거와 패널을 하나의 영역으로 다룬다. hover/focus로 열고, 터치에서는 트리거 탭 후 항목을 선택한다. 트리거와 팝오버 사이 이동 중 닫히지 않도록 지연 닫기를 사용한다. 다른 메뉴가 열리면 기존 메뉴를 닫는다.

트리거의 `aria-haspopup`/`aria-expanded`, menu/menuitem 역할과 버튼 이름을 유지한다. 메뉴 안 focus 이동, 영역 밖 focus, Escape, 외부 클릭, 항목 실행 후 닫힘은 메뉴와 소비 컴포넌트를 함께 검증한다. focus가 사라지거나 다운로드 한 번에 여러 작업이 실행되지 않아야 한다.

## 패널 배치와 리사이즈

오른쪽 미리보기의 `Swagger UI`/`ReDoc` 버튼은 렌더러만 바꾸며 원문과 버전을 변경하지 않는다. 기본값은 Swagger UI다. ReDoc은 `sandbox="allow-scripts"` iframe에서 실행하고 마지막 유효 문서 또는 검토 중인 변환 후보를 표시한다. 후보가 OpenAPI 3.2라면 ReDoc 미지원 안내를 표시한다. ReDoc 내부에 파일을 놓아도 부모의 기존 파일 업로드 경로로 전달하며, 후보 검토 중에는 교체하지 않는다.

데스크톱은 탐색기·편집기·미리보기 3열, 태블릿은 탐색기를 접은 작업 영역, 모바일은 구조·편집기·미리보기·진단을 전환한다. 공통 breakpoint는 768/1024/1280px이다.

[usePanelLayout](../src/hooks/usePanelLayout.ts)의 기본 비율은 22/39/39다. 세 비율을 CSS Grid의 fr track에 모두 반영한다. 두 번째 divider 위치는 전체 영역의 좌표이므로 편집기 폭을 계산할 때 탐색기 폭을 뺀다. 이를 빼지 않으면 divider를 움직여도 미리보기 폭이 의도대로 변하지 않는다.

최소 폭을 clamp하고 세 비율 합을 유지한다. 접힌 패널은 44px track을 사용한다. pointerup뿐 아니라 pointercancel에서도 drag listener를 정리한다. 패널 설정만 저장하며 잘못된 저장값은 기본값으로 복구한다.

## 회귀 확인

- 형식 메뉴가 소스 편집기 헤더에 있는지 확인한다.
- hover/focus/터치로 열고 Escape/외부 클릭/작업 실행으로 닫히는지 확인한다.
- 네 샘플의 파일명과 OpenAPI 버전, YAML/JSON 내보내기를 확인한다.
- 읽기 명령은 원문을 보존하고 변환 명령은 직렬화하는지 구분한다.
- 양쪽 divider의 실제 bounding box 변화, 접기/펼치기, 저장값 복구를 확인한다.
- 공통 셸 E2E와 도메인 E2E를 함께 유지한다. 과거의 2행 좌표 assertion을 되살리지 않는다.

구현과 테스트는 [components](../src/components/), [패널 테스트](../src/hooks/usePanelLayout.test.tsx), [E2E](../e2e/)에서 찾는다.

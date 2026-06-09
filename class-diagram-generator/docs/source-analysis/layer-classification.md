# ADR-SRC-005: 레이어 분류 방식

## 현재 선택

`LayerClassifier`는 공통 base package를 제거한 뒤 첫 번째 package segment를 규칙 map에 매칭해 `CONTROLLER`, `SERVICE`, `MAPPER`, `UTIL`, `MODEL`, `ETC`로 분류한다.

관련 코드: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/LayerClassifier.kt`

## 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| 패키지명 규칙 기반 | 빠르고 설명 가능하며 프레임워크 의존성이 없음 | 프로젝트별 네이밍 관습이 다르면 오분류 가능 |
| 어노테이션 기반 | Spring 계층 구분에 더 정확할 수 있음 | 소스 파서가 annotation 정보를 더 많이 추출해야 함 |
| 사용자 설정 mapping | 팀별 패키지 규칙을 반영 가능 | 설정 UX와 검증 로직이 필요 |
| ML/LLM 기반 분류 | 이름, 설명, 의존성을 종합 가능 | 비용, 재현성, 운영 복잡도가 큼 |

## 결정 이유

- 클래스 설계서의 레이어는 엄밀한 컴파일 정보보다 일관된 문서 분류가 중요하다.
- 일반적인 Spring/Java/Kotlin 패키지 관습을 빠르게 반영할 수 있다.
- 공통 base package를 제거하므로 `com.example.foo.service` 같은 구조를 자연스럽게 처리한다.
- 분류 실패는 `ETC`로 귀결되어 파이프라인을 중단하지 않는다.
- annotation 기반 분류는 정확도를 높일 수 있지만, 현재 파서 모델과 설정 UX를 더 복잡하게 만든다.

## 재검토 조건

- 실제 사용자 프로젝트에서 오분류가 반복된다.
- 패키지명 대신 annotation을 기준으로 분류해야 한다.
- 사용자별/조직별 layer mapping 설정 요구가 생긴다.
- hexagonal, clean architecture 등 더 다양한 아키텍처 레이어가 필요하다.
- 레이어별 관계 검증이나 의존성 방향 검증 기능을 추가한다.

## 복잡도

- `classify()` 시간 복잡도: `O(P)`
- `commonBasePackage()` 시간 복잡도: `O(C * L)`
- 공간 복잡도: `O(C * L)`
- `P`: package path 길이
- `C`: 클래스 수
- `L`: package segment 수

## 주의사항

> - 패키지 규칙 기반 분류는 예측 가능하지만, 프로젝트 관습이 다르면 정확도가 떨어진다.
> - 설정 기반 분류를 도입하면 정확도는 올라가지만, 사용자 입력과 문서화 부담도 함께 증가한다.
> - `ETC` 비율이 높아지는 프로젝트가 많아지면 규칙 확장이나 사용자 설정을 검토해야 한다.

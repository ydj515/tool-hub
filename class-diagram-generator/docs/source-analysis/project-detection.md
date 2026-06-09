# ADR-SRC-002: 프로젝트 감지 방식

## 현재 선택

`ProjectDetector`는 압축 해제 루트에서 빌드 메타데이터를 찾는다. Maven은 `pom.xml`의 `<modules>`, Gradle은 `settings.gradle(.kts)`의 `include` 구문을 정규식으로 파싱한다. 빌드 파일이 없으면 fallback module로 처리한다.

관련 코드: `src/main/kotlin/com/toolhub/classdiagramgenerator/input/ProjectDetector.kt`

## 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| 텍스트/정규식 기반 감지 | 빠르고 외부 빌드 실행이 필요 없으며 샘플 프로젝트에 충분함 | 복잡한 Gradle Kotlin DSL, profile, property 치환에는 약함 |
| Gradle Tooling API | 실제 Gradle 모델에 가까운 결과를 얻을 수 있음 | 빌드 실행 비용, 네트워크 의존성, 보안 위험이 증가 |
| Maven Model Parser | Maven 모듈과 parent 정보를 더 정확히 읽을 수 있음 | Maven 전용 의존성과 모델 해석 복잡도가 추가됨 |
| 사용자가 모듈 구조를 직접 지정 | 모호성이 줄어듦 | 사용자 입력 부담이 커지고 UX가 나빠짐 |

## 결정 이유

- 이 도구는 임의 ZIP을 분석하므로 빌드 스크립트를 실행하지 않는 편이 안전하다.
- 필요한 정보는 전체 빌드 모델이 아니라 소스 루트와 모듈 경계다.
- Gradle/Maven의 일반적인 멀티모듈 선언은 텍스트 파싱만으로 처리할 수 있다.
- 잘못 선언된 모듈은 warning으로 남기고 나머지 분석을 계속할 수 있다.
- 빌드 도구 실행 없이 빠르게 결과를 반환하는 것이 MVP 사용자 경험에 맞다.

## 재검토 조건

- property, version catalog, convention plugin으로 모듈이 동적으로 구성되는 프로젝트를 지원해야 한다.
- Maven parent/module 관계를 더 정확히 해석해야 한다.
- 사용자가 빌드 실행을 허용하는 신뢰된 환경에서만 분석한다.
- Gradle/Maven 외 빌드 도구를 지원한다.
- 혼합 언어 프로젝트나 커스텀 source set을 정식 지원해야 한다.

## 복잡도

- 시간 복잡도: `O(F + S)`
- 공간 복잡도: `O(M + P)`
- `F`: 빌드 파일 크기
- `S`: 소스 파일 탐색 비용
- `M`: 모듈 수
- `P`: 발견한 source path 수

## 주의사항

> - 정규식 기반 Gradle 파싱은 의도적으로 보수적이다. 모든 Gradle DSL을 해석하는 목적이 아니다.
> - 빌드 스크립트 실행은 정확도를 높일 수 있지만, 임의 ZIP 분석에서는 보안/성능 비용이 크다.
> - 커스텀 source set이나 동적 include는 누락될 수 있으므로 warning과 fallback 정책이 중요하다.

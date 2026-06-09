# ADR-SRC-003: Kotlin 파서 생명주기

## 현재 선택

`KotlinSourceAnalyzer`는 `KotlinCoreEnvironment`와 `KtPsiFactory`를 bean 생명주기 동안 재사용한다. `parseFile()`과 `destroy()`는 같은 lock으로 보호한다.

관련 코드: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/KotlinSourceAnalyzer.kt`

## 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| 환경 재사용 + lock | 생성 비용을 줄이고 생명주기를 관리하기 쉬움 | Kotlin 파일 파싱이 analyzer 내부에서 직렬화됨 |
| 파일마다 환경 생성 | 동시성 격리가 쉽고 상태 공유 위험이 작음 | 생성 비용과 메모리 비용이 큼 |
| thread-local 환경 | 병렬 파싱과 재사용을 모두 노릴 수 있음 | thread 수와 환경 수 관리가 복잡함 |
| Kotlin compiler analysis API | 심볼과 타입 정보를 더 정확히 얻을 수 있음 | 설정, classpath, 버전 호환성 비용이 커짐 |

## 결정 이유

- Kotlin compiler 환경 생성은 가볍지 않으므로 파일마다 생성하면 오버헤드가 크다.
- 현재 파이프라인은 파일 파싱을 모듈별로 순차 수행하므로 lock으로 인한 손실이 제한적이다.
- `@PreDestroy`에서 `Disposer.dispose()`를 호출해 환경 생명주기를 명확히 닫을 수 있다.
- 이 도구는 완전한 타입 체크보다 선언 구조와 KDoc 추출이 핵심이다.
- Java/Kotlin 공통 `ParsedType` 모델에 맞춰 필요한 정보만 추출하는 구조가 현재 렌더링 파이프라인과 잘 맞는다.

## 재검토 조건

- Kotlin 파일 파싱이 전체 잡 시간의 주요 병목이 된다.
- 모듈/파일 단위 병렬 파싱을 도입한다.
- 정확한 타입, 확장 함수, expect/actual, typealias, classpath 기반 심볼 해석이 필요하다.
- Kotlin compiler embeddable 버전 업그레이드 후 환경 재사용 문제가 발생한다.
- 멀티모듈 Kotlin 프로젝트에서 모듈 간 symbol resolution 요구가 커진다.

## 복잡도

- 시간 복잡도: `O(K * B + P)`
- 공간 복잡도: `O(E + B + T)`
- `K`: 시도한 charset 수
- `B`: 파일 byte 수
- `P`: PSI 순회 비용
- `E`: 재사용 Kotlin environment 비용
- `T`: 추출한 타입 수

## 주의사항

> - lock은 thread-safety를 단순화하지만, 향후 병렬 파싱에서는 처리량 제한이 될 수 있다.
> - Kotlin PSI 기반 분석은 컴파일러 심볼 분석이 아니므로 타입 추론 정확도에는 한계가 있다.
> - Kotlin compiler embeddable은 버전 호환성 이슈가 생길 수 있어 업그레이드 시 회귀 테스트가 중요하다.

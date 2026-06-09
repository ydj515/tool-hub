# ADR-SRC-004: 관계 해석 방식

## 현재 선택

`RelationExtractor`는 `ParsedType.extendsNames`, `implementsNames`, package, import 목록을 기반으로 내부/외부 타입 참조를 휴리스틱으로 해석한다. 동명이인이 있으면 같은 package 또는 명시 import를 우선하고, 그래도 모호하면 warning을 남긴 뒤 external reference로 처리한다.

관련 코드: `src/main/kotlin/com/toolhub/classdiagramgenerator/analyzer/RelationExtractor.kt`

## 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| 이름/패키지/import 휴리스틱 | 빠르고 classpath 없이 동작함 | wildcard import, nested type, typealias, classpath 심볼에는 약함 |
| JavaParser symbol solver | Java 심볼 정확도가 올라감 | classpath 구성과 성능 비용이 증가하고 Kotlin에는 별도 처리가 필요 |
| Kotlin compiler analysis | Kotlin 심볼 정확도가 올라감 | 설정, classpath, 버전 호환성 비용이 큼 |
| 빌드 실행 기반 분석 | 실제 프로젝트 해석에 가장 가까움 | 임의 ZIP 실행 보안 위험과 네트워크/빌드 시간 비용이 큼 |

## 결정 이유

- 이 도구는 임의 소스 ZIP을 빠르게 분석하는 문서 생성 도구다.
- classpath 없이도 내부 클래스 간 상속/구현 관계의 대부분을 추출할 수 있다.
- 모호한 경우 warning을 남겨 사용자가 품질 저하를 인지할 수 있다.
- Java/Kotlin 공통 `ParsedType` 모델을 유지할 수 있어 렌더링 파이프라인이 단순하다.
- 완전한 심볼 해석보다 빠른 구조 추출과 실패 내성이 현재 제품 범위에 더 중요하다.

## 재검토 조건

- 관계 누락/오탐이 주요 품질 이슈로 보고된다.
- wildcard import, nested class, typealias, sealed hierarchy 등을 정확히 표현해야 한다.
- 사용자가 build file 또는 dependency resolution을 허용하는 신뢰된 환경을 제공한다.
- 언어별 분석기를 분리하더라도 정확도 향상이 더 중요해진다.
- 외부 라이브러리 타입과 내부 타입을 더 엄밀히 구분해야 한다.

## 복잡도

- 시간 복잡도: `O(C + E * K)`
- 공간 복잡도: `O(C + E + W)`
- `C`: 클래스 수
- `E`: extends/implements 참조 수
- `K`: 동명이인 후보 수
- `W`: warning 수

## 주의사항

> - 현재 방식은 컴파일러 수준 정확도보다 빠른 구조 추출을 선택한 것이다.
> - 모호한 내부 후보를 external로 처리하면 다이어그램에서 실제 내부 관계가 빠질 수 있다.
> - symbol solver를 도입하면 정확도는 올라가지만, classpath 구성 실패 자체가 새로운 장애 원인이 될 수 있다.

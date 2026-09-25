# 다이어그램과 문서 출력

## 표현 범위

계층별 다이어그램과 클래스별 직접 부모 다이어그램을 문서 본문에 넣는다. 표시 관계는 extends/implements이며 필드·파라미터·메서드 의존선은 노이즈를 줄이기 위해 제외한다. java.lang.Object도 제외한다.

| 산출물 | 표현 |
|---|---|
| DOCX | PlantUML PNG를 본문에 삽입 |
| XLSX | 계층 다이어그램 시트와 클래스 블록에 PNG 삽입 |
| Markdown | Mermaid classDiagram 코드 블록 |

API의 `includeDiagrams` 기본값은 true다. false이면 DiagramRenderer가 빈 인덱스를 반환하고 산출물에 다이어그램을 넣지 않는다. 현재 오케스트레이터는 관계 추출 단계까지 생략하지는 않는다.

## 모델과 렌더링

1. 언어별 분석기가 상속/구현 이름과 import를 추출한다.
2. RelationExtractor가 sourceClassId·TypeRef·RelationKind 관계를 만든다.
3. DiagramSpecBuilder가 엔진 중립적인 노드·엣지·scope·key를 만든다.
4. DiagramRenderer가 PNG를 생성하고 DiagramArtifactIndex에 경로와 spec을 보관한다.
5. 각 DocumentGenerator가 같은 인덱스를 소비한다. Markdown은 spec을 Mermaid로 직렬화한다.

구현은 [diagram](../src/main/kotlin/com/toolhub/classdiagramgenerator/render/diagram/)과 [문서 생성기](../src/main/kotlin/com/toolhub/classdiagramgenerator/render/)에 있다. 관계 해석 우선순위와 모호성 처리는 [관계 ADR](source-analysis/relation-resolution.md)을 따른다.

계층 spec은 해당 계층의 클래스와 직접 부모를 포함한다. 빈 계층은 생략하지만 클래스 하나만 있는 계층은 표시할 수 있다. 클래스 spec은 자신의 관계가 없으면 생략한다. 내부 노드는 CLS ID의 하이픈을 언더스코어로 바꾸고 외부 노드는 FQN 또는 단순 이름의 SHA-1 앞 6자리로 식별한다. 외부 노드는 별도 스타일로 구분한다.

PlantUML은 Smetana 레이아웃으로 PNG를 만들어 외부 Graphviz 설치 의존을 피한다. 모듈은 순서대로 처리하고 모듈 안 spec은 work-stealing pool로 렌더링한다. parallelism이 0이면 사용 가능한 CPU 수를 사용한다. 이 설정이 동시에 실행되는 job 전체의 CPU/메모리 상한을 뜻하지는 않는다.

## 문서 안의 배치

- DOCX: 클래스 목록 앞에 계층 다이어그램을, 클래스 상세에는 해당 클래스 다이어그램을 넣는다. 이미지 비율을 유지하며 문서 가용 폭에 맞춘다.
- XLSX: 표지·클래스 목록·클래스 설계서에 더해 계층 다이어그램 영역을 제공한다. 이미지는 셀 anchor와 행 배치를 함께 계산한다.
- Markdown: 계층·클래스 위치에 Mermaid fenced block을 넣는다. PNG 링크를 필수로 하지 않는다.

다국어 문서 라벨은 OutputLabels에서 관리한다. diagram index에 경로나 spec이 없으면 해당 삽입을 건너뛰며 빈 이미지 자리를 강제로 만들지 않는다.

## 실패 처리와 설정의 실제 범위

현재 DiagramRenderer는 개별 PNG 렌더 예외를 `DIAGRAM_RENDER_FAILED` 경고로 기록하고 null 경로를 반환한다. spec은 남으므로 PNG 실패와 Mermaid 텍스트 생성 가능 여부를 구분한다. 작업 전체의 실패 처리는 오케스트레이터가 담당한다.

초기 설계의 다음 항목은 구현 보장으로 옮기지 않는다.

- `DIAGRAM_ENGINE_UNAVAILABLE` 단일 경고로 모든 엔진 초기화 실패를 처리한다는 제안
- 외부 노드 짧은 해시 충돌에 `_2`, `_3`을 붙인다는 제안
- `maxBytesPerPng` 설정값이 존재하므로 실제 PNG 크기 차단도 수행된다는 가정
- PNG 한 장의 고정 처리 시간이나 5,000장 처리 성능 추정

현재 DiagramRenderer에는 PNG 크기 상한 검사와 해시 충돌 카운터 처리가 없다. 이 문서 이관에서는 기능을 추가하지 않는다. 렌더 비용과 병렬화 판단은 [잡 처리 설계](job-processing-design.md)에 두고 실제 fixture로 측정한다.

## 검증

- RelationExtractor: 상속·구현, Object 제외, import/동명 타입과 외부 처리
- DiagramSpecBuilder: 빈 계층, 부모 없는 클래스, 내부/외부 부모와 안정된 ID
- PlantUML/Mermaid: PNG signature와 관계 표현, 외부 노드 스타일
- 문서 생성기: DOCX picture relationship, XLSX picture, Markdown Mermaid block
- EndToEndTest: 옵션 true/false, 단일/멀티모듈과 세 포맷
- ko/en 라벨 일치와 큰 이미지의 문서 배치

변경 후 프로젝트에서 `./gradlew check build`를 실행한다. 실제 문서 레이아웃은 생성 파일을 열어 확인하며 unit test의 이미지 개수만으로 가독성을 판정하지 않는다.

# ADR-SRC-001: ZIP 처리 방식

## 현재 선택

`ZipExtractor`는 `ZipArchiveInputStream`으로 업로드 ZIP을 스트리밍 해제한다. 각 entry는 `target.toAbsolutePath().normalize()` 기준으로 resolve한 뒤 `startsWith(normalizedTarget)` 검사를 통과해야 파일로 쓴다.

관련 코드: `src/main/kotlin/com/toolhub/classdiagramgenerator/input/ZipExtractor.kt`

## 대안

| 대안 | 장점 | 단점 |
|---|---|---|
| streaming extract | 메모리 사용량이 낮고 대용량 ZIP에 유리함 | 전체 압축 내용 사전 검증이 어렵고 entry 순서대로 처리해야 함 |
| `ZipFile` 기반 처리 | entry 목록을 먼저 훑고 검증하기 쉬움 | 파일 기반 접근이 필요하고 업로드 스트림을 바로 처리하기 어려움 |
| Java `ZipInputStream` | 표준 라이브러리만 사용 가능 | 인코딩/호환성/추가 ZIP 기능 대응이 제한적일 수 있음 |
| 전체 사전 검증 후 추출 | 보안 정책을 먼저 확정하기 쉬움 | ZIP을 임시 저장하거나 두 번 순회해야 해서 비용이 증가 |

## 결정 이유

- 업로드는 이미 job 디렉터리에 저장되며, 이후 입력 스트림으로 바로 처리할 수 있다.
- ZIP entry를 하나씩 처리하므로 메모리 피크가 낮다.
- Zip Slip 방어가 파일 쓰기 직전에 적용되어 경로 탈출을 차단한다.
- Apache Commons Compress는 ZIP 인코딩과 호환성 면에서 표준 `ZipInputStream`보다 유연하다.
- 임의 ZIP을 다루는 도구이므로 빌드 실행이나 압축 내용 로딩보다 보수적인 파일 쓰기 정책이 중요하다.

## 재검토 조건

- 압축 폭탄 방어를 위해 압축 전/후 크기, entry 수, 중첩 디렉터리 깊이를 사전 제한해야 한다.
- ZIP 전체 manifest를 먼저 분석해야 하는 기능이 생긴다.
- 암호화 ZIP, 특수 인코딩 ZIP, 심볼릭 링크 정책을 더 엄격히 다뤄야 한다.
- 업로드 파일 크기뿐 아니라 압축 해제 후 총 크기 제한이 필요해진다.

## 복잡도

- 시간 복잡도: `O(B + N)`
- 공간 복잡도: 스트리밍 기준 `O(1)`에 가깝고, 디스크 사용량은 `O(U)`
- `B`: 압축 해제되는 총 byte 수
- `N`: ZIP entry 수
- `U`: 압축 해제 후 파일 크기

## 주의사항

> - 현재 Zip Slip 방어는 경로 탈출을 막지만, 압축 폭탄 자체를 완전히 제한하지는 않는다.
> - ZIP entry 수와 총 압축 해제 크기 제한은 별도 운영 정책으로 추가할 수 있다.
> - streaming extract는 메모리 효율이 좋지만, 전체 압축 내용을 먼저 보고 정책을 결정하기는 어렵다.

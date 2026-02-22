# 테스트 플랜

## 1) 바이트 변환
- 입력: `1 MiB`
- 기대: `1048576`

- 입력: `1 MB`
- 기대: `1000000`

## 2) seed 재현성
- 동일 요청(`type`, `targetSize`, `mode`, `seed` 동일) 2회 실행
- 기대:
  - `actualBytes` 동일
  - `checksumSha256` 동일

## 3) 포맷 유효성
- `pdf`, `docx`, `xlsx` 각각 1MiB 생성
- 기대:
  - 생성 응답 성공
  - 다운로드 파일이 해당 애플리케이션에서 열림

## 4) exact/at_least 정책
- `exact` 요청:
  - 목표: 1MiB, 5MiB, 10MiB
  - 기대: 가능 케이스에서 `actualBytes === targetBytes`
  - 불가 케이스: `modeApplied === at_least` + `fallbackReason` 존재

- `at_least` 요청:
  - 기대: `actualBytes >= targetBytes`

## 5) 보안/운영 정책
- 과도한 요청(분당 20회 초과)
- 기대: HTTP 429 + `retry-after` 헤더

- 최대 크기 초과 요청
- 기대: HTTP 400 + `maxTargetBytes` 반환

## 6) Blob 시나리오
- 50MiB 초과 요청
- 기대: 응답 `delivery.blobRecommended === true`

- `/api/blob/sign` 호출
- 기대:
  - 토큰 미설정: HTTP 501
  - 토큰 설정: 임시 서명 정보 응답

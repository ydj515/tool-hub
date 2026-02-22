# API 문서

## POST /api/generate

요청 본문(JSON)
- `type`: `pdf | docx | xlsx | zip | txt | csv | json | bin`
- `targetSize`: number (양수)
- `sizeUnit`: `MiB | MB`
- `mode`: `exact | at_least`
- `seed?`: string
- `zipStructure?`: `flat | hierarchy` (`type=zip`일 때 의미 있음)
- `zipExtensionProfile?`: `mixed | text | binary` (`type=zip` 이고 `zipStructure=hierarchy`일 때 의미 있음)
  - `hierarchy` 선택 시 ZIP 내부 예시:
    - `mixed`: `README.txt`, `level1/info.json`, `level1/data.bin`, `level1/level2/fixed.bin`, `level1/level2/padding.bin`
    - `text`: `README.txt`, `level1/info.txt`, `level1/notes.md`, `level1/level2/fixed.txt`, `level1/level2/padding.txt`
    - `binary`: `README.bin`, `level1/info.dat`, `level1/data.bin`, `level1/level2/fixed.bin`, `level1/level2/padding.bin`

응답(JSON)
- `id`, `fileName`, `downloadUrl`
- `targetBytes`, `actualBytes`
- `checksumSha256`
- `modeRequested`, `modeApplied`, `fallbackReason?`
- `policy.maxTargetBytes`, `policy.blobRecommendThresholdBytes`
- `delivery.strategy`, `delivery.blobRecommended`

## GET /api/download/:id

- 성공 시 파일 스트림 반환
- 파일 만료/미존재 시 404

## POST /api/blob/sign

요청 본문(JSON)
- `fileName`: string
- `contentType`: string
- `sizeBytes`: number

응답
- 토큰 미설정: 501
- 토큰 설정: 임시 서명 응답(현재 스텁)

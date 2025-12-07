# Webpage Capture CLI

Playwright로 URL 목록을 순회하며 전체 페이지 스크린샷을 저장하는 CLI입니다.

## 실행
```bash
# 워크스페이스에서
npm run cli --workspace @webpage-capture/cli -- --file datalist.xlsx
# 혹은 bin 노출 후
npx webpage-capture --file sample.xlsx --headless false
```

## 주요 옵션
- `--file` / `--files`: 콤마로 구분한 파일 목록 (필수, xlsx/xls/csv/txt).
- `--sheet`: 시트명 (기본 `page-list`).
- `--id` / `--subject` / `--url`: 컬럼 헤더 이름 (대소문자/언더스코어 차이 허용).
- `--out`: 출력 폴더 (기본: 실행 디렉토리의 `./screenshots`).
- `--dedupe false`: URL 중복 제거 끄기 (기본 켜짐).
- `--wait 3000`: 페이지 진입 후 대기 시간(ms), 기본 2000.
- `--headless false`: 브라우저 UI 보기.
- `--csvEncoding`: CSV 인코딩(`utf8`, `cp949`, `euc-kr`). 잘못된 값 입력 시 경고 후 기본값 사용.

## 입력/샘플
- xlsx/csv: 기본 시트 `page-list`, 헤더 `id / subject / detailPage`를 기준으로 자동 매핑.
- txt: 한 줄 한 URL, `#`로 시작하는 라인은 무시.
- 샘플: `sample-files/` 및 `datalist.xlsx` (간단한 목록), 결과 예시 `sample-screenshots/`.

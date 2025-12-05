# Webpage Capture Tool

간단한 CLI로 엑셀/CSV/TXT에 적힌 URL을 순회하며 스크린샷을 저장합니다. Playwright를 사용하며 기본 출력 폴더는 `./screenshots` 입니다.

## 빠른 실행

```bash
node screenshot.js --file datalist.xlsx
```

## 샘플 데이터
- `sample-files/sample.xlsx`: 기본 시트 `page-list`, 헤더 `id / subject / detailPage`로 구성된 엑셀.
- `sample-files/sample.csv`: UTF-8 CSV, 네이버/다음 2건 포함.
- `sample-files/sample.txt`: 한 줄 한 URL, `#` 주석 허용, 중복 URL 예시 포함.
- 빠르게 체험하려면 `node screenshot.js --file sample-files/sample.xlsx` 혹은 `--files sample-files/sample.csv,sample-files/sample.txt` 로 여러 개를 한번에 읽을 수 있습니다.

## 입력 형식
- xlsx/xls: 기본 시트명 `page-list` (또는 `--sheet` 지정).
- csv: 기본 인코딩 `utf8` (`--csvEncoding cp949` 등으로 오버라이드).
- txt: 줄마다 URL, `#`로 시작하는 라인은 무시.

## 주요 옵션
- `--file` / `--files`: 콤마로 구분한 파일 목록 (필수).
- `--sheet`: 엑셀/CSV에서 읽을 시트명 (기본 `page-list`).
- `--id` / `--subject` / `--url`: 컬럼 헤더 이름 (기본 `id`, `subject`, `detailPage`).
- `--out`: 스크린샷 저장 경로 (기본 `./screenshots`).
- `--dedupe false`: URL 중복 제거 끄기 (기본 켜짐).
- `--wait 3000`: 페이지 진입 후 대기 시간(ms).
- `--headless false`: 브라우저 UI 보기.

예시:

```bash
node screenshot.js --file datalist.xlsx --subject title --url link --out ./screenshots --wait 2500
node screenshot.js --file sample.csv --csvEncoding cp949 --headless false
```

## 출력 예시
- 기본 저장 경로는 `./screenshots` 이며, `[{번호}]_[subject 또는 id].png` 형태로 저장됩니다.
- `sample-screenshots/001_네이버.png`, `sample-screenshots/002_다음.png` 에서 결과 샘플을 확인할 수 있습니다.

## 미리보기
![네이버 샘플](sample-screenshots/001_네이버.png)

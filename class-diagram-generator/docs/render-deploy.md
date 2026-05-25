# Render 배포 가이드

`class-diagram-generator`를 Docker 기반 Render Web Service로 배포하는 절차를 정리한다.

## 전제 조건

- Render에서 이 저장소에 접근할 수 있어야 한다.
- 배포 대상은 모노레포 안의 `class-diagram-generator` 하나만이다.
- 한글 DOCX 품질을 위해 컨테이너에 `Noto Sans CJK KR` 폰트를 포함한다.
- 결과 파일은 영속 저장하지 않는다.

## 로컬 검증

이미지 빌드:

```bash
docker build -t class-diagram-generator ./class-diagram-generator
```

기본 포트(8080)로 실행:

```bash
docker run --rm -p 8080:8080 class-diagram-generator
```

Render와 같은 방식으로 `PORT=10000`으로 실행:

```bash
docker run --rm -e PORT=10000 -p 10000:10000 class-diagram-generator
```

헬스체크:

```bash
curl http://127.0.0.1:10000/actuator/health
```

예상 응답:

```json
{"status":"UP"}
```

## Render 설정

루트 `render.yaml` 이 아래 항목을 관리한다.

- `rootDir: class-diagram-generator`
- `runtime: docker`
- `plan: free`
- `buildFilter.paths: class-diagram-generator/**`
- `healthCheckPath: /actuator/health`

이 설정 덕분에 Render는 모노레포 전체가 아니라 `class-diagram-generator`만 빌드/배포한다.
`buildFilter.paths` 는 저장소 루트 기준 경로라서 `class-diagram-generator/**` 로 적어야 한다.

단, 루트의 `render.yaml` 자체가 바뀌면 Render는 build filter 와 무관하게 Blueprint 변경으로 처리한다.

## Render Dashboard 배포 절차

1. Render Dashboard에서 `New +` → `Blueprint`를 선택한다.
2. 이 저장소를 연결한다.
3. 루트 `render.yaml` 을 인식시키고 배포를 진행한다.
4. 첫 배포가 끝나면 서비스 URL에 접속한다.
5. `Health Checks` 에서 `/actuator/health` 가 성공하는지 확인한다.

## 운영 시 참고

- 애플리케이션 포트는 `server.port: ${PORT:8080}` 이다.
- Render에서는 `PORT` 환경변수를 주입하므로 별도 포트 하드코딩이 필요 없다.
- 기본 문서 폰트는 `DOCX_FONT_FAMILY=Noto Sans CJK KR` 이다.
- 다른 폰트를 쓰고 싶으면 Render 환경변수에서 `DOCX_FONT_FAMILY` 를 덮어쓴다.

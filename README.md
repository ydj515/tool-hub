## tool hub

간단한 기능 도구 모음집입니다.

- webpage-capture-tool : 웹페이지의 url을 등록하면 내장 브라우저가 사진을 캡처하는 도구입니다.
- sign-maker : canvas에 서명을 그리면 배경없는 이미지로 다운로드 할 수 있는 도구입니다.
- dummy-file-generator : 원하는 용량의 더미 파일을 생성하는 도구입니다.
- ddl-seed-generator : DDL을 입력하면 FK 순서에 맞는 seed SQL과 rollback SQL을 생성하는 도구입니다.
- config-diff-viewer : YAML/JSON/properties/.env 설정 파일을 비교하고, 누락 키·위험 설정·민감정보를 탐지하는 도구입니다.
- class-diagram-generator : zip 파일을 업로드 하여 class 설계서(diagram 포함, xlsx, docx, md)를 받는 도구입니다.
- json-yaml-converter : JSON과 YAML을 양방향으로 변환하고 Pretty formatting과 문법 오류 위치를 제공하는 도구입니다.
- openapi-editor : Swagger 2.0과 OpenAPI 3.0/3.1/3.2 문서를 편집·검증하고 손실 경고와 함께 버전을 변환하는 도구입니다.

## 문서

공통 가이드와 도구별 설계는 [문서 인덱스](docs/README.md)에서 확인할 수 있습니다.

## mise 환경과 초기 설정

`mise.toml`은 도구·공통 task, `mise.dev.toml`/`mise.prod.toml`은 공유 환경 선택을 담당한다.

```bash
mise trust ./mise.toml   # task와 overlay를 검토한 뒤 신뢰
mise run bootstrap     # 프로젝트 도구를 명시해 locked 설치 후 의존성 준비
mise run config:check  # task 참조·순환 검사, 앱 실행 없음
mise run verify        # 프로젝트 검증 (Docker 등 기존 검증 전제는 유지)
mise -E dev run verify
```

- 기본 실행은 `APP_ENV=local`, `-E dev`는 개발 overlay, `-E prod`는 운영 설정 선택이다. 환경 선택 자체가 배포나 서비스 시작을 수행하지 않는다.
- 개인 개발 설정은 `mise.dev.local.toml.example`을 검토해 `mise.dev.local.toml`로 복사한다. `.env.dev.local`을 만든 뒤 `env._.file`을 활성화하면 dev에서만 읽는다. 기존 개인 파일을 덮어쓰지 않는다.
- `mise.local.toml`은 **모든 환경**에서 로드된다. prod checkout에 개인 override나 개발 dotenv를 두지 않는다. `-E local`은 사용하지 않는다.
- `APP_ENV`는 공통 식별자다. Spring 실행 task의 프로파일은 해당 task에서 매핑하며, 존재하지 않는 운영 설정을 자동 생성하지 않는다. prod 선택만으로 기존 개발용 앱이 운영 준비를 마친 것은 아니다.
- Vite 앱의 `build`는 기본/ prod에서 `production`, dev에서 `development` mode를 사용한다. Next.js는 자체 dev/build 모드를 유지한다. `NODE_ENV`를 전역 production으로 설정하지 않아 개발 의존성 설치가 누락되지 않는다.
- `mise.lock`은 도구 잠금이며 npm/pnpm/Gradle 의존성 잠금과 별개다. 버전 변경 시 `mise lock`을 실행하고 diff를 검토한다. CI에서는 동일한 `-E` 선택으로 `mise install --locked` 후 검증한다. 기본 대상은 macOS ARM64와 Linux x64다.
- `mise run bootstrap`은 프로젝트 초기 설정이다. OS package·dotfile·서비스를 관리하는 `mise bootstrap`은 개인 머신 설정에서 별도로 채택한다.

하위 설정: `home`, `sign-maker`, `ddl-seed-generator`, `config-diff-viewer`, `api-contract-test-generator`, `dummy-file-generator`, `json-yaml-converter`, `class-diagram-generator`, `webpage-capture-tool`, `openapi-editor`. 각 앱 디렉터리에서 같은 명령을 실행한다. 루트 bootstrap/verify가 하위 앱 전체를 자동 실행하지는 않는다.

`webpage-capture-tool` 잠금 파일은 Windows x64도 포함한다. 각 하위 앱의 bootstrap은 해당 앱의 package-lock만 설치한다.

# PRD: config-diff-viewer

| 항목 | 내용 |
|---|---|
| 프로젝트명 | config-diff-viewer |
| 위치 | tool-hub/config-diff-viewer |
| 작성일 | 2026-05-03 |
| 상태 | 검토용 최종안 |

---

## 1. 제품 개요

### 한 줄 설명

여러 환경의 설정 파일을 비교하고, 누락된 값·위험한 설정·민감정보·환경 간 불일치를 탐지하여 배포 전 설정 사고를 줄이는 개발자용 검증 도구입니다.

### 배경

배포 환경(dev / stage / prod)이 늘어날수록 설정 파일 간의 미묘한 차이가 장애 원인이 됩니다. 현재는 텍스트 에디터나 `diff` 명령어로 수작업 비교하는 경우가 많아, 누락 키·민감정보 노출·위험 설정·중복 키 같은 문제를 배포 직전까지 발견하지 못하는 사례가 빈번합니다.

`config-diff-viewer`는 이런 문제를 배포 전에 자동으로 찾아주는 도구입니다. 두 파일을 붙여 넣으면 Monaco DiffEditor에서 라인 단위 시각 비교와 구조화된 요약 리포트를 즉시 제공합니다. 모든 처리는 브라우저에서 수행하므로 민감정보가 서버로 전송되지 않습니다.

---

## 2. 문제 정의

### 현재 문제

개발자는 보통 환경별 설정을 다음처럼 관리합니다.

```
application.yml / application-dev.yml / application-stage.yml / application-prod.yml
.env / docker-compose.yml / values-dev.yaml / values-prod.yaml
```

환경이 많아질수록 다음 문제가 발생합니다.

| 문제 | 설명 |
|---|---|
| 설정 누락 | dev에는 있는 key가 prod에는 없음 |
| 위험 설정 방치 | prod에 `debug=true`, `ddl-auto=create` 등이 남아 있음 |
| 민감정보 노출 | password, secret, token 값이 평문으로 저장됨 |
| 환경 간 오타 | `redis.host`, `datasource.url` 등이 잘못 입력됨 |
| 중복 key | YAML/properties에서 동일 key 중복 정의 |
| 설정 구조 불일치 | 같은 서비스인데 환경별 설정 depth가 다름 |
| 리뷰 어려움 | PR에서 설정 변경 내용을 사람이 직접 비교하기 어려움 |

### 대표 장애 시나리오

**시나리오 1: 운영 DB 설정 누락**

`prod` 환경에 `spring.datasource.password`만 누락되어 배포 후 애플리케이션 기동 실패.

**시나리오 2: 운영 환경에 개발 설정 반영**

`spring.jpa.hibernate.ddl-auto: create`가 prod에 남아 있어 치명적인 데이터 손상 위험 발생.

**시나리오 3: 환경 간 timeout 불일치**

stage에서는 정상이나 prod에서는 `external-api.timeout` 값이 너무 짧아 외부 API 호출 실패 증가.

---

## 3. 목표

### 제품 목표

| 목표 | 설명 |
|---|---|
| 환경별 설정 diff 제공 | dev/stage/prod 설정 차이를 Monaco DiffEditor로 시각화 |
| 설정 key 누락 탐지 | 기준 환경 대비 누락 key 확인 |
| 위험 설정 탐지 | prod에서 위험한 설정값을 rule 기반으로 탐지 |
| 민감정보 탐지 | secret, password, token 등 평문 노출 감지 및 마스킹 |
| 리포트 생성 | Markdown / JSON 리포트 제공 및 다운로드 |
| CLI 제공 | CI/CD 파이프라인에서 exit code로 배포 차단 가능 |

### 비목표 (초기 버전 제외)

| 비목표 | 이유 |
|---|---|
| 모든 설정 포맷 완벽 지원 | MVP에서는 YAML / properties / env / JSON 중심 |
| 클라우드 설정 자동 수정 | 탐지와 리포트가 우선 |
| Secret Manager 직접 연동 | 후속 phase에서 지원 |
| Kubernetes 전체 정책 엔진 대체 | OPA, Kyverno와 목적이 다름 |
| AI 기반 수정 제안 | 규칙 기반 탐지가 우선 |
| SaaS 팀 관리 기능 | 개인/소규모 팀 중심으로 시작 |

---

## 4. 주요 사용자

### 4.1 Backend Developer

Spring Boot, Node.js, Kotlin 서비스를 개발하며 환경별 설정을 관리합니다.

- dev/stage/prod 설정 차이를 한눈에 보고 싶다.
- PR 올리기 전에 누락된 key를 알고 싶다.
- prod 설정에 실수가 없는지 확인하고 싶다.

### 4.2 DevOps / Platform Engineer

CI/CD, Kubernetes, Helm, Docker Compose 설정을 관리합니다.

- 배포 전에 위험 설정을 자동으로 차단하고 싶다.
- 운영 values.yaml에 민감정보가 들어갔는지 확인하고 싶다.

### 4.3 QA Engineer

테스트 환경과 운영 환경의 설정 차이로 인한 재현 불가 문제를 줄이고 싶어합니다.

- stage와 prod의 설정 차이를 확인하고 싶다.
- 테스트 실패가 설정 차이 때문인지 확인하고 싶다.

### 4.4 Tech Lead / Reviewer

PR에서 설정 변경을 리뷰합니다.

- 설정 변경 리뷰를 빠르게 하고 싶다.
- 운영 위험 설정이 들어왔는지 자동으로 확인하고 싶다.

---

## 5. 핵심 유스케이스

### Use Case 1: dev/prod yml 비교

1. 개발자가 `application-dev.yml`과 `application-prod.yml`을 각각 왼쪽·오른쪽 에디터에 붙여 넣는다.
2. 비교 버튼을 클릭한다.
3. Monaco DiffEditor에서 차이 라인이 인라인 하이라이트로 강조된다.
4. 하단 리포트에 요약이 출력된다.

```
[누락 키]
- prod에는 spring.datasource.hikari.maximum-pool-size 없음

[값 불일치]
- dev/prod의 redis.host 다름
  dev  → localhost
  prod → redis.internal.svc

[민감정보 의심]
- prod의 spring.datasource.password 값이 평문 노출

[위험 설정]
- prod에 debug=true 존재
- prod에 spring.jpa.hibernate.ddl-auto=create 존재
```

### Use Case 2: prod 위험 설정 탐지

prod 파일에서 다음 설정을 탐지합니다.

```yaml
debug: true
spring:
  jpa:
    hibernate:
      ddl-auto: create-drop
logging:
  level:
    root: DEBUG
```

결과:

```
[CRITICAL] spring.jpa.hibernate.ddl-auto=create-drop
  운영 환경에서 데이터 손실 위험이 있습니다.

[HIGH] debug=true
  운영 환경에서 debug 모드가 활성화되어 있습니다.

[MEDIUM] logging.level.root=DEBUG
  운영 환경에서 과도한 로그가 발생할 수 있습니다.
```

### Use Case 3: 민감정보 노출 탐지

```yaml
aws:
  access-key: AKIA...
  secret-key: abcdefg123456
jwt:
  secret: my-real-secret-key
```

결과:

```
[CRITICAL] aws.access-key — AWS Access Key 패턴 탐지 (값: AKIA****)
[CRITICAL] aws.secret-key — Secret Key 평문 노출 의심 (값: abcd****)
[HIGH]     jwt.secret    — JWT secret 평문 노출 의심 (값: my-r****)
```

### Use Case 4: Kubernetes manifest 비교

`deployment-staging.yaml`과 `deployment-prod.yaml`을 붙여 넣어 `replicas`, `image`, `env` 블록 차이를 확인합니다. `resources.limits` 미설정, `image: latest` 사용 등을 경고합니다.

### Use Case 5: Docker Compose 비교

`docker-compose.dev.yml`과 `docker-compose.prod.yml`을 붙여 넣어 서비스별 환경변수 및 포트 차이를 확인합니다. `privileged: true`, 포트 전체 노출(`0.0.0.0`) 등을 경고합니다.

### Use Case 6: CI/CD에서 설정 검증 (CLI)

```yaml
# GitHub Actions 예시
name: Config Guard
on:
  pull_request:
    paths: ["**/*.yml", "**/*.yaml", "**/*.properties", ".env*"]
jobs:
  config-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run config validator
        run: |
          npx config-guard validate \
            --base application-dev.yml \
            --target application-prod.yml \
            --profile prod \
            --fail-on critical
```

Critical 이슈 발견 시 exit code 1 반환 → PR merge 차단.

---

## 6. 기능 요구사항

### 6.1 파일 입력

| 방식 | 설명 | 우선순위 |
|---|---|---|
| 직접 붙여 넣기 | Monaco Editor에 텍스트 직접 입력 | P0 |
| 파일 업로드 | 파일 선택 다이얼로그 | P0 |
| 드래그 앤 드롭 | 에디터 영역에 파일 드롭 | P1 |
| 파일 형식 자동 감지 | 확장자 및 내용 패턴으로 형식 구분 | P0 |
| 수동 형식 선택 | 드롭다운으로 형식 강제 지정 | P1 |
| 환경 라벨 지정 | dev / stage / prod 라벨 수동 지정 | P1 |

MVP 지원 포맷: YAML, YML, properties, .env, JSON

후속 포맷: TOML, Docker Compose, Helm values.yaml, Kubernetes manifest, Terraform tfvars

### 6.2 파싱 엔진

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-001 | YAML 파일을 파싱할 수 있어야 한다 (앵커/별칭 포함) | P0 |
| FR-002 | `.properties` 파일을 파싱할 수 있어야 한다 (멀티라인 지원) | P0 |
| FR-003 | `.env` 파일을 파싱할 수 있어야 한다 (주석 제거) | P0 |
| FR-004 | JSON / JSONC 파일을 파싱할 수 있어야 한다 | P1 |
| FR-005 | 파싱 실패 시 라인 번호와 원인을 표시해야 한다 | P0 |
| FR-006 | 중복 key를 탐지해야 한다 | P1 |

### 6.3 설정 구조 평탄화

중첩된 YAML 구조를 dot notation으로 변환합니다.

```yaml
# 입력
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
```

```
# 출력
spring.datasource.hikari.maximum-pool-size = 20
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-010 | YAML 중첩 구조를 dot notation으로 변환해야 한다 | P0 |
| FR-011 | properties key와 YAML key를 동일한 방식으로 비교해야 한다 | P0 |
| FR-012 | 배열/리스트 값 비교를 지원해야 한다 (인덱스 기반) | P1 |
| FR-013 | `${placeholder}` 값을 별도 타입으로 인식해야 한다 | P1 |

### 6.4 환경별 Diff

| Diff 유형 | 설명 |
|---|---|
| Added | 특정 환경에만 추가된 key |
| Removed | 특정 환경에 없는 key |
| Changed | 값이 다른 key |
| Type Changed | 값 타입이 다른 key |
| Placeholder Changed | `${}` 구조가 다른 key |
| Sensitive Changed | 민감정보 값이 변경된 key |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-020 | 두 설정 파일의 key 차이를 비교해야 한다 | P0 |
| FR-021 | 세 개 이상의 환경 파일을 비교할 수 있어야 한다 | P1 |
| FR-022 | 특정 key를 ignore 처리할 수 있어야 한다 | P1 |
| FR-023 | 값 변경 여부를 표시해야 한다 | P0 |
| FR-024 | 민감정보 값은 기본적으로 마스킹해야 한다 | P0 |

### 6.5 누락 key 탐지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-030 | 기준 파일 대비 target 파일의 누락 key를 탐지해야 한다 | P0 |
| FR-031 | 누락 key의 severity를 설정할 수 있어야 한다 | P1 |
| FR-032 | optional key를 설정할 수 있어야 한다 | P1 |

### 6.6 위험 설정 탐지 (Rule Engine)

| Rule | 조건 | Severity |
|---|---|---|
| PROD_DEBUG_TRUE | prod에서 `debug=true` | HIGH |
| PROD_DDL_CREATE | prod에서 `ddl-auto=create/create-drop` | CRITICAL |
| PROD_SHOW_SQL | prod에서 `spring.jpa.show-sql=true` | MEDIUM |
| ROOT_LOG_DEBUG | prod에서 `logging.level.root=DEBUG` | MEDIUM |
| INCLUDE_STACKTRACE_ALWAYS | `include-stacktrace=always` | HIGH |
| ACTUATOR_EXPOSE_ALL | `management.endpoints.web.exposure.include=*` | HIGH |
| CORS_ALLOW_ALL | `allowed-origins=*` | HIGH |
| LOCALHOST_IN_PROD | prod에서 `localhost` 사용 | HIGH |
| EMPTY_PASSWORD | `password` 값이 빈 문자열 | CRITICAL |
| WEAK_JWT_SECRET | jwt secret 길이가 너무 짧음 (32자 미만) | HIGH |
| DEVTOOLS_ENABLED | prod에서 `devtools` 활성화 | MEDIUM |
| K8S_NO_RESOURCE_LIMITS | `resources.limits` 미설정 | HIGH |
| K8S_IMAGE_LATEST | `image: latest` 사용 | MEDIUM |
| COMPOSE_PRIVILEGED | `privileged: true` | HIGH |
| COMPOSE_PORT_ALL_OPEN | 포트 `0.0.0.0` 전체 노출 | HIGH |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-040 | 기본 위험 설정 rule을 제공해야 한다 | P0 |
| FR-041 | profile별 rule 적용이 가능해야 한다 | P0 |
| FR-042 | severity를 CRITICAL/HIGH/MEDIUM/LOW로 구분해야 한다 | P0 |
| FR-043 | 사용자가 custom rule을 추가할 수 있어야 한다 | P1 |
| FR-044 | 특정 rule을 disable할 수 있어야 한다 | P1 |

### 6.7 민감정보 탐지

**키 이름 패턴 (대소문자 무관)**

```
password, passwd, pwd, secret, client-secret, token,
access-token, refresh-token, api-key, apikey,
private-key, access-key, aws-secret, database-url,
auth-token, bearer, credential, jwt-secret
```

**값 패턴**

| 패턴 | 정규식 |
|---|---|
| AWS Access Key | `AKIA[0-9A-Z]{16}` |
| JWT | `eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+` |
| Private Key 헤더 | `-----BEGIN (RSA )?PRIVATE KEY-----` |
| 긴 Base64 문자열 | 32자 이상의 무작위 문자열 |
| DB URL with credential | `jdbc:[a-z]+://[^:]+:[^@]+@` |

**예외 처리**: `${...}` 형태의 placeholder 값은 안전한 값으로 분류합니다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-050 | key 이름 기반 민감정보 후보를 탐지해야 한다 | P0 |
| FR-051 | value 패턴 기반 민감정보 후보를 탐지해야 한다 | P0 |
| FR-052 | placeholder 값은 안전한 값으로 분류해야 한다 | P0 |
| FR-053 | 민감정보 값은 UI와 리포트에서 마스킹해야 한다 | P0 |
| FR-054 | false positive를 ignore할 수 있어야 한다 | P1 |
| FR-055 | entropy 기반 secret 탐지를 지원해야 한다 | P2 |

### 6.8 리포트 생성

MVP 지원: JSON, Markdown

후속 지원: HTML, JUnit XML, SARIF, GitHub PR Comment

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-060 | JSON 리포트를 생성해야 한다 | P0 |
| FR-061 | Markdown 리포트를 생성해야 한다 | P0 |
| FR-062 | HTML 리포트를 생성해야 한다 | P1 |
| FR-063 | severity별 summary를 제공해야 한다 | P0 |
| FR-064 | 수정 제안을 제공해야 한다 | P1 |

### 6.9 CLI 제공

```bash
# 기본 검증
config-guard validate \
  --base application-dev.yml \
  --target application-prod.yml \
  --profile prod \
  --fail-on critical

# Diff
config-guard diff \
  --base application-dev.yml \
  --target application-prod.yml

# 민감정보 스캔
config-guard scan-secret \
  --files "src/main/resources/**/*.yml"

# 리포트 생성
config-guard validate \
  --target application-prod.yml \
  --profile prod \
  --report markdown \
  --output ./config-report.md
```

Exit Code:

| Exit Code | 의미 |
|---|---|
| 0 | 통과 |
| 1 | 검증 실패 (fail-on 조건 충족) |
| 2 | 파싱 실패 |
| 3 | 잘못된 CLI 인자 |
| 4 | 내부 오류 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-070 | CLI로 설정 검증을 실행할 수 있어야 한다 | P0 |
| FR-071 | CLI exit code를 제공해야 한다 | P0 |
| FR-072 | fail-on severity를 설정할 수 있어야 한다 | P0 |
| FR-073 | report output 경로를 지정할 수 있어야 한다 | P0 |
| FR-074 | `.config-guard.yml` 설정 파일 기반 실행을 지원해야 한다 | P1 |

---

## 7. Rule 설정 파일

사용자는 `.config-guard.yml` 파일로 검증 정책을 관리할 수 있습니다.

```yaml
profiles:
  prod:
    failOn: HIGH
    requiredKeys:
      - spring.datasource.url
      - spring.datasource.username
      - spring.datasource.password
      - redis.host
      - redis.port
    optionalKeys:
      - spring.devtools.restart.enabled
    ignoredKeys:
      - build.version
      - info.git.commit
    disabledRules:
      - ROOT_LOG_DEBUG
    customRules:
      - id: PROD_REDIS_LOCALHOST
        severity: CRITICAL
        message: 운영 redis.host가 localhost이면 안 됩니다.
        when:
          key: redis.host
          equals: localhost
      - id: PROD_EXTERNAL_API_TIMEOUT_TOO_LOW
        severity: HIGH
        message: 운영 외부 API timeout이 1000ms 미만입니다.
        when:
          key: external-api.timeout
          lessThan: 1000
```

---

## 8. 데이터 모델

```typescript
type ConfigFile = {
  id: string;
  filename: string;
  format: "yaml" | "properties" | "env" | "json";
  environment?: "local" | "dev" | "stage" | "prod" | string;
  rawContent: string;
  parsed: Record<string, unknown>;
  flattened: Record<string, ConfigValue>;
  parseErrors: ParseError[];
};

type ConfigValue = {
  key: string;
  value: unknown;
  valueType: "string" | "number" | "boolean" | "array" | "object" | "null";
  rawValue: string;
  maskedValue?: string;
  line?: number;
  isPlaceholder: boolean;
  isSensitiveCandidate: boolean;
};

type ValidationIssue = {
  id: string;
  ruleId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: "MISSING_KEY" | "DANGEROUS_CONFIG" | "SECRET" | "DIFF" | "PARSE";
  file: string;
  environment?: string;
  key?: string;
  actualValue?: string;
  expectedValue?: string;
  message: string;
  suggestion?: string;
  line?: number;
  ignored: boolean;
};

type DiffResult = {
  key: string;
  status: "ADDED" | "REMOVED" | "CHANGED" | "UNCHANGED" | "TYPE_CHANGED";
  valuesByEnvironment: Record<string, ConfigValue | null>;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
};

type ValidationReport = {
  id: string;
  createdAt: string;
  files: ConfigFile[];
  summary: {
    totalKeys: number;
    matchedKeys: number;
    diffKeys: number;
    missingKeys: number;
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    status: "PASSED" | "FAILED";
  };
  diffResults: DiffResult[];
  issues: ValidationIssue[];
};
```

---

## 9. Rule Engine 설계

### 처리 파이프라인

```
Config Parser
  → Config Normalizer (flatten, placeholder 인식)
    → Diff Engine (key 비교, 값 비교)
      → Rule Engine (위험 설정 rule 평가)
        → Secret Scanner (키 이름 + 값 패턴)
          → Report Generator (JSON / Markdown / HTML)
```

### Rule 평가 조건

| 조건 | 설명 |
|---|---|
| `key equals` | 특정 key와 일치 |
| `key pattern` | regex 기반 key 매칭 |
| `value equals` | 특정 값과 일치 |
| `value in` | 열거된 값 중 하나 |
| `value contains` | 특정 문자열 포함 |
| `value regex` | regex 기반 값 매칭 |
| `value lessThan / greaterThan` | 숫자 비교 |
| `profile` | dev/stage/prod 환경 조건 |
| `missing key` | key 존재 여부 |
| `type check` | value 타입 검증 |

---

## 10. 기술 스택

### Web UI (tool-hub/config-diff-viewer)

| 분류 | 기술 | 선택 이유 |
|---|---|---|
| 프레임워크 | Next.js 15 (App Router) | tool-hub 전체 통일 |
| 언어 | TypeScript 5 | 타입 안전성, 기존 프로젝트 통일 |
| UI | React 19 | Next.js 15 기본 |
| 코드 에디터 | @monaco-editor/react | DiffEditor 내장, ddl-seed-generator와 동일 |
| YAML 파싱 | js-yaml | 경량, 앵커/별칭 지원 |
| JSON/JSONC 파싱 | jsonc-parser | JSON with Comments 대응 |
| 아이콘 | lucide-react | 기존 프로젝트 통일 |
| 스타일 | 커스텀 CSS (CSS 변수) | 기존 tool-hub 디자인 시스템 유지 |
| 빌드 | Next.js 내장 (Turbopack) | 별도 설정 불필요 |
| 패키지 관리 | npm | 기존 프로젝트 통일 |

### CLI (별도 npm 패키지, Phase 2)

| 분류 | 기술 | 선택 이유 |
|---|---|---|
| 언어 | TypeScript (Node.js) | Web UI 코어 로직 재사용 |
| CLI 프레임워크 | commander.js | 경량, 타입 친화적 |
| 배포 형태 | npm package (`config-guard`) | `npx config-guard` 형태로 즉시 사용 |

Web UI의 `lib/` 모듈(parser, differ, detector, validator, exporter)을 CLI와 공유합니다.

### 의존성 목록

```json
{
  "dependencies": {
    "js-yaml": "^4.1.0",
    "jsonc-parser": "^3.3.1",
    "@monaco-editor/react": "^4.7.0",
    "lucide-react": "^1.11.0",
    "next": "15.2.8",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "typescript": "^5.7.2"
  }
}
```

---

## 11. 아키텍처 & 디렉토리 구조

```
config-diff-viewer/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── _components/
│       ├── config-diff-client.tsx   # 메인 클라이언트 컴포넌트 (진입점)
│       ├── monaco-diff-editor.tsx   # Monaco DiffEditor 래퍼
│       ├── stats-bar.tsx            # 통계 요약 바
│       ├── result-panel.tsx         # 요약 리포트 패널 (탭 컨테이너)
│       ├── result-table.tsx         # 항목별 이슈 테이블
│       └── issue-badge.tsx          # Severity 배지 컴포넌트
├── lib/
│   ├── types.ts                     # ConfigFile, ValidationIssue 등 공통 타입
│   ├── parser.ts                    # YAML / JSON / properties / env 파싱
│   ├── differ.ts                    # 키 평탄화 및 diff 계산
│   ├── detector.ts                  # 민감정보 탐지
│   ├── validator.ts                 # Rule Engine (Spring Boot / K8s / Compose)
│   ├── exporter.ts                  # JSON / Markdown 내보내기
│   └── rules/
│       ├── spring-boot.ts           # Spring Boot 위험 설정 규칙
│       ├── kubernetes.ts            # Kubernetes manifest 규칙
│       └── docker-compose.ts        # Docker Compose 규칙
├── package.json
├── tsconfig.json
├── next.config.mjs
└── PRD-FINAL.md
```

---

## 12. 화면 구성 (UX/UI)

### 전체 레이아웃

```
┌────────────────────────────────────────────────────────────────────┐
│  config-diff-viewer                               [비교] [초기화]  │
├────────────────────────────┬───────────────────────────────────────┤
│  Source A                  │  Source B                             │
│  [파일 업로드] [형식 v]    │  [파일 업로드] [형식 v]              │
│  [환경: dev  v]            │  [환경: prod v]                       │
│  ┌──────────────────────┐  │  ┌─────────────────────────────────┐  │
│  │                      │  │  │                                 │  │
│  │   Monaco DiffEditor  │  │  │   Monaco DiffEditor             │  │
│  │   (좌측 기준)        │  │  │   (우측 비교)                   │  │
│  │                      │  │  │                                 │  │
│  └──────────────────────┘  │  └─────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│  총 키: 142  |  일치: 118  |  불일치: 12  |  누락: 8  |  경고: 4  │
├────────────────────────────────────────────────────────────────────┤
│  [누락 키(8)] [값 불일치(12)] [민감정보(3)] [중복 키(0)] [경고(4)] │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  키 경로                           A값          B값   심각도 │  │
│  │  spring.datasource.password        ****         ****  CRIT  │  │
│  │  redis.host                        localhost    redis  HIGH  │  │
│  │  spring.jpa.hibernate.ddl-auto     update       create CRIT │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                  [텍스트 복사]  [JSON]  [Markdown]  │
└────────────────────────────────────────────────────────────────────┘
```

### Monaco DiffEditor 동작

- 왼쪽: Source A (기준 파일), 오른쪽: Source B (비교 대상)
- 변경 라인: 인라인 하이라이트 (삭제/변경: 빨간색, 추가: 초록색)
- 라인 번호 표시
- 읽기 전용 모드 (결과 뷰)

### 이슈 상세 표시 예시

```
Severity: CRITICAL
Rule:     PROD_DDL_CREATE
File:     application-prod.yml (Line 14)
Key:      spring.jpa.hibernate.ddl-auto
Value:    create
Message:  운영 환경에서 ddl-auto=create는 사용할 수 없습니다.
제안:     validate 또는 none을 사용하세요.
```

---

## 13. 사용자 플로우

### Web UI 플로우

```
tool-hub 접속
→ config-diff-viewer 선택
→ Source A / Source B 파일 입력 (붙여 넣기 또는 업로드)
→ 환경 라벨 지정 (dev / prod 등)
→ 파일 형식 확인 (자동 감지 또는 수동 선택)
→ 비교 버튼 클릭
→ Monaco DiffEditor에서 라인별 차이 확인
→ 통계 요약 바 확인
→ 탭별 이슈 상세 확인 (누락 키 / 값 불일치 / 민감정보 / 경고)
→ 특정 이슈 ignore 처리 (P1)
→ 리포트 다운로드 (JSON / Markdown)
```

### CLI 플로우

```
config-guard init        → .config-guard.yml 생성
config-guard validate    → 검증 실행
config-guard diff        → diff 결과 출력
config-guard scan-secret → 민감정보 스캔
CI/CD에 연결             → exit code로 배포 차단
```

### PR 리뷰 플로우

```
개발자가 설정 파일 변경
→ PR 생성
→ GitHub Actions에서 config-guard 실행
→ 실패 시 Markdown 리포트 자동 생성
→ PR comment로 이슈 표시 (Phase 3)
→ 개발자가 수정 후 재검증 통과
```

---

## 14. 보안 요구사항

| ID | 요구사항 |
|---|---|
| SEC-001 | Web UI에서 모든 파싱·비교는 브라우저(클라이언트 사이드)에서만 수행한다 |
| SEC-002 | 업로드된 설정 파일 원문을 서버에 저장하지 않는다 |
| SEC-003 | 리포트에 민감정보 원문을 노출하지 않는다 (마스킹 필수) |
| SEC-004 | 파일 업로드 크기를 제한한다 (단일 파일 최대 1 MB) |
| SEC-005 | 허용 확장자만 업로드 가능하게 한다 |
| SEC-006 | 악성 YAML payload(billion laughs 등)를 방지한다 |
| SEC-007 | YAML 파싱 시 외부 리소스 참조를 차단한다 |

---

## 15. 비기능 요구사항

### 성능

| 항목 | 목표 |
|---|---|
| 1 MB 설정 파일 2개 비교 | 1초 이내 |
| key 10,000개 flatten | 2초 이내 |
| Web UI 결과 렌더링 | 2초 이내 |

### 안정성

| 항목 | 목표 |
|---|---|
| 파싱 실패 처리 | 전체 실패 대신 파일별 오류 제공 |
| Rule 실패 처리 | 특정 rule 오류가 전체 실행을 중단하지 않음 |

### 사용성

| 항목 | 목표 |
|---|---|
| Web UI 첫 검증까지 | 파일 붙여 넣기 후 클릭 1회 |
| CLI 첫 실행까지 | 3분 이내 |

### 브라우저 지원

Chrome 120+, Firefox 120+, Safari 17+, Edge 120+

최소 너비 1024px (모바일 미지원)

---

## 16. Phase 계획

### Phase 1 — MVP: Web UI 핵심 기능

**목표**: YAML/JSON/properties/env 파일을 브라우저에서 비교하고 기본 위험 설정을 탐지합니다.

| 기능 | 포함 |
|---|---|
| Next.js 15 + TypeScript 프로젝트 초기화 | O |
| YAML / JSON 파서 (`lib/parser.ts`) | O |
| 키 평탄화 및 diff 엔진 (`lib/differ.ts`) | O |
| Monaco DiffEditor 통합 (라인 하이라이트) | O |
| 통계 요약 바 | O |
| 누락 key / 값 불일치 리포트 | O |
| prod 위험 설정 탐지 (기본 rule 10개+) | O |
| 민감정보 key 이름 탐지 | O |
| JSON / Markdown 내보내기 | O |
| 파일 업로드 (선택 다이얼로그) | O |

**성공 기준**: `application-dev.yml`과 `application-prod.yml` 비교 가능, prod 위험 설정 10개 이상 탐지 가능

---

### Phase 2 — 탐지 강화 & CLI

**목표**: `.properties`/`.env` 지원 추가, 민감정보 탐지 강화, CLI 제공

| 기능 | 포함 |
|---|---|
| `.properties` / `.env` 파서 추가 | O |
| 중복 key 탐지 | O |
| 타입 불일치 탐지 | O |
| 민감정보 값 패턴 탐지 (AWS key, JWT 등) | O |
| Spring Boot 경고 규칙 완성 | O |
| 드래그 앤 드롭 업로드 | O |
| config-guard CLI (Node.js, commander.js) | O |
| CLI exit code 지원 | O |
| `.config-guard.yml` 설정 파일 지원 | O |

---

### Phase 3 — 고급 형식 & CI/CD 연동

**목표**: Kubernetes/Docker Compose 검증, GitHub Actions 연동

| 기능 | 포함 |
|---|---|
| Kubernetes manifest 경고 규칙 | O |
| Docker Compose 경고 규칙 | O |
| HTML 리포트 생성 | O |
| GitHub Actions 예시 제공 | O |
| GitLab CI 예시 제공 | O |
| Custom rule 추가 (UI) | O |
| Ignore rule (UI) | O |
| 배열 비교 개선 (순서 무관 옵션) | O |

---

### Phase 4 — 3-way Diff & 고급 기능

**목표**: 3개 환경 동시 비교, Helm values.yaml, 리포트 고도화

| 기능 | 포함 |
|---|---|
| 3-way diff (dev / stage / prod 동시 비교) | O |
| Helm values.yaml 비교 | O |
| Table View / Tree View 전환 | O |
| severity filter | O |
| SARIF 리포트 | O |
| entropy 기반 secret 탐지 | O |
| JUnit XML 리포트 | O |

---

### Phase 5 — PR 자동 코멘트 & 팀 정책

**목표**: GitHub PR에 자동으로 검증 리포트를 코멘트로 달고, 팀 단위 정책 관리

| 기능 | 포함 |
|---|---|
| GitHub PR comment 자동 생성 | O |
| 프로젝트별 rule set 저장 | O |
| 검증 이력 저장 | O |
| Slack 알림 | O |

---

## 17. 구현 우선순위 요약

### P0 (MVP 필수)

- YAML / JSON 파서
- flatten (dot notation 변환)
- diff 엔진 (누락 key, 값 불일치)
- prod 위험 설정 기본 rule
- 민감정보 key 이름 탐지
- Monaco DiffEditor 통합
- JSON / Markdown 리포트
- 파일 업로드

### P1 (Phase 2)

- properties / env 파서
- 민감정보 값 패턴 탐지
- 중복 key 탐지
- CLI (config-guard)
- custom rule / ignore rule
- HTML 리포트

### P2 (Phase 3+)

- Kubernetes / Helm 검증
- GitHub Actions 연동
- SARIF
- PR comment 자동화
- entropy 기반 secret 탐지
- 팀 정책 템플릿

---

## 18. 성공 지표

### 기능 품질

| 지표 | 목표 |
|---|---|
| 파싱 실패율 | 5% 이하 |
| 1 MB 파일 검증 시간 | 1초 이하 |
| critical 탐지 정확도 | 95% 이상 |
| secret 마스킹 누락 | 0건 |

### 사용자 가치

| 지표 | 목표 |
|---|---|
| 설정 리뷰 시간 감소 | 50% 이상 |
| false positive 비율 | 20% 이하 |
| 리포트 다운로드율 | 50% 이상 |
| CLI 재사용률 | 40% 이상 |

---

## 19. 예시 결과 리포트 (Markdown)

```markdown
# Config Validation Report

## Summary
**Status: FAILED**

| Severity | Count |
|---|---:|
| CRITICAL | 1 |
| HIGH | 2 |
| MEDIUM | 3 |
| LOW | 1 |

## Files
- application-dev.yml (Source A)
- application-prod.yml (Source B)

## Critical Issues
### PROD_DDL_CREATE
- **File**: application-prod.yml (Line 14)
- **Key**: spring.jpa.hibernate.ddl-auto
- **Value**: create
- **Message**: 운영 환경에서 ddl-auto=create는 사용할 수 없습니다.
- **Suggestion**: validate 또는 none을 사용하세요.

## Missing Keys (prod 누락)
| Key |
|---|
| spring.datasource.hikari.maximum-pool-size |
| external.payment.retry.max-attempts |

## Dangerous Configs
| Severity | Key | Value | Message |
|---|---|---|---|
| HIGH | debug | true | prod에서 debug=true가 활성화되어 있습니다. |
| MEDIUM | logging.level.root | DEBUG | 운영 로그 레벨이 너무 낮습니다. |

## Secret Candidates
| Severity | Key | Masked Value |
|---|---|---|
| HIGH | jwt.secret | my-r******* |
```

---

## 20. 주의사항 & 미결 사항

### 주의사항

**Placeholder 처리**

`${JWT_SECRET}` 형태의 값은 실제 secret이 아니므로 안전한 값으로 분류해야 합니다. key 이름만으로 판단하지 말고 value 형태를 함께 검사해야 합니다.

**Diff와 Validation Issue 분리**

모든 환경의 값이 같아야 하는 것은 아닙니다. DB URL, Redis host, 외부 API endpoint는 환경마다 다른 것이 정상입니다.

- Diff: 값이 다름 (사실 기술)
- Issue: 정책상 위험함 (rule 평가)

두 가지를 UI에서 명확히 구분해야 합니다.

**prod 판단 기준**

파일명 기반 추론은 보조로만 사용하고, 환경 라벨을 명시적으로 지정받는 것이 안전합니다.

**YAML import / anchor 처리**

Spring Boot의 `spring.config.import` 처리는 Phase 1에서 제외합니다. 단일 파일 기준으로 처리하고 후속에서 import resolution을 지원합니다.

### 미결 사항 (Open Questions)

| # | 질문 | 영향 범위 |
|---|---|---|
| 1 | 배열 비교를 인덱스 기반으로 할지, 내용 기반(순서 무관)으로 할지? | differ.ts 설계 |
| 2 | 민감정보 탐지 규칙을 사용자가 커스터마이징할 수 있게 할지? (Phase 1 포함 여부) | detector.ts, UI |
| 3 | 3-way diff UI 레이아웃을 어떻게 구성할지? (2-way와 다른 구조 필요) | 전체 아키텍처 |
| 4 | 비교 결과를 URL 쿼리로 공유할 수 있게 할지? (민감정보 보안 이슈) | 보안 검토 필요 |

---

## 21. 대안 접근

### 대안 A: Web UI 중심 (현재 선택)

- 장점: 즉시 사용 가능, tool-hub 생태계에 자연스럽게 통합, 민감정보 서버 전송 없음
- 단점: CI/CD 자동화가 Phase 2로 밀림
- 추천 상황: ToolHub 사용성 검증이 우선일 때

### 대안 B: CLI 중심

- 장점: CI/CD 연동 즉시 가능, 개발자 친화적
- 단점: Web UI 가치 후순위
- 추천 상황: 팀 내부 도입이 목표일 때

### 대안 C: Core Library + Web + CLI 동시 설계 (최종 목표)

```
lib/ (core: parser / differ / detector / validator / exporter)
  ↑ 공유
  ├── Web UI (Next.js, 시각화)
  └── CLI (Node.js, CI/CD)
```

- 장점: 로직 재사용, 장기 구조가 깔끔
- 단점: 초기 설계 비용 증가
- 추천 상황: Phase 2부터 CLI를 추가할 때 이 구조를 목표로 설계

Phase 1부터 `lib/` 모듈을 독립적으로 설계해 CLI 재사용이 가능하도록 준비합니다.

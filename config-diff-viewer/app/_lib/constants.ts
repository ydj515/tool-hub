import type { AnalysisOptions, ConfigFormat } from "@/lib/types";

const SAMPLE_A = `spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp_dev
    username: dev_user
    password: dev_password
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
  devtools:
    restart:
      enabled: true

debug: true
server:
  port: 8080

logging:
  level:
    root: DEBUG
    com.example: DEBUG

management:
  endpoints:
    web:
      exposure:
        include: health,info

jwt:
  secret: my-dev-jwt-secret

external-api:
  url: http://localhost:9090
  timeout: 5000
  retry:
    max-attempts: 3
`;

const SAMPLE_B = `spring:
  datasource:
    url: jdbc:postgresql://prod-db.internal:5432/myapp
    username: \${DB_USERNAME}
    password: my-real-prod-password
  jpa:
    hibernate:
      ddl-auto: create
    show-sql: false

debug: true
server:
  port: 8080
  error:
    include-stacktrace: always

logging:
  level:
    root: INFO
    com.example: WARN

management:
  endpoints:
    web:
      exposure:
        include: "*"

jwt:
  secret: short

external-api:
  url: https://api.prod.internal
  timeout: 500
`;

const ENV_OPTIONS = ["dev", "stage", "prod", "local", "test"];
const FORMAT_OPTIONS: ConfigFormat[] = ["yaml", "json", "properties", "env"];
const FORMAT_LABELS: Record<ConfigFormat, string> = {
  yaml: "YAML",
  json: "JSON",
  properties: ".properties",
  env: ".env",
};

const DEFAULT_OPTIONS: AnalysisOptions = {
  enableSecretDetection: true,
  enableDangerousConfigDetection: true,
  enableDuplicateKeyDetection: true,
};

export { SAMPLE_A, SAMPLE_B, ENV_OPTIONS, FORMAT_OPTIONS, FORMAT_LABELS, DEFAULT_OPTIONS };

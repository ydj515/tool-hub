import type { Severity, ValidationIssue } from "./types";

export type RuleCategory = "spring-boot" | "kubernetes" | "docker-compose";

export interface RuleDefinition {
  id: string;
  severity: Severity;
  category: RuleCategory;
  message: string;
  conditionDesc: string;
  suggestion?: string;
}

interface Rule extends RuleDefinition {
  check: (flat: Record<string, string>) => boolean;
  affectedKey?: (flat: Record<string, string>) => string | undefined;
}

// ── Spring Boot rules ────────────────────────────────────────────────────────

const SPRING_BOOT_RULES: Rule[] = [
  {
    id: "PROD_DEBUG_TRUE",
    severity: "HIGH",
    category: "spring-boot",
    message: "운영 환경에서 debug=true가 활성화되어 있습니다.",
    conditionDesc: "debug = true (prod 환경)",
    suggestion: "debug: false 로 변경하거나 해당 설정을 제거하세요.",
    check: (f) => f["debug"] === "true",
    affectedKey: () => "debug",
  },
  {
    id: "PROD_DDL_CREATE",
    severity: "CRITICAL",
    category: "spring-boot",
    message: "운영 환경에서 ddl-auto=create/create-drop은 데이터 손실 위험이 있습니다.",
    conditionDesc: "spring.jpa.hibernate.ddl-auto in [create, create-drop] (prod 환경)",
    suggestion: "spring.jpa.hibernate.ddl-auto: validate 또는 none을 사용하세요.",
    check: (f) => ["create", "create-drop"].includes(f["spring.jpa.hibernate.ddl-auto"] ?? ""),
    affectedKey: () => "spring.jpa.hibernate.ddl-auto",
  },
  {
    id: "PROD_SHOW_SQL",
    severity: "MEDIUM",
    category: "spring-boot",
    message: "운영 환경에서 spring.jpa.show-sql=true는 성능 저하 및 로그 과다를 유발합니다.",
    conditionDesc: "spring.jpa.show-sql = true (prod 환경)",
    suggestion: "spring.jpa.show-sql: false 로 변경하세요.",
    check: (f) => f["spring.jpa.show-sql"] === "true",
    affectedKey: () => "spring.jpa.show-sql",
  },
  {
    id: "ROOT_LOG_DEBUG",
    severity: "MEDIUM",
    category: "spring-boot",
    message: "운영 환경에서 logging.level.root=DEBUG는 과도한 로그를 발생시킵니다.",
    conditionDesc: "logging.level.root = DEBUG (prod 환경)",
    suggestion: "logging.level.root: WARN 또는 ERROR를 권장합니다.",
    check: (f) => f["logging.level.root"] === "DEBUG",
    affectedKey: () => "logging.level.root",
  },
  {
    id: "INCLUDE_STACKTRACE_ALWAYS",
    severity: "HIGH",
    category: "spring-boot",
    message: "server.error.include-stacktrace=always는 내부 정보를 외부에 노출합니다.",
    conditionDesc: "server.error.include-stacktrace = always",
    suggestion: "never 또는 on-param으로 변경하세요.",
    check: (f) => f["server.error.include-stacktrace"] === "always",
    affectedKey: () => "server.error.include-stacktrace",
  },
  {
    id: "ACTUATOR_EXPOSE_ALL",
    severity: "HIGH",
    category: "spring-boot",
    message: "actuator 전체 엔드포인트가 노출되어 있습니다 (include=*).",
    conditionDesc: "management.endpoints.web.exposure.include contains \"*\"",
    suggestion: "필요한 엔드포인트만 명시적으로 허용하세요. 예: health,info",
    check: (f) => (f["management.endpoints.web.exposure.include"] ?? "").includes("*"),
    affectedKey: () => "management.endpoints.web.exposure.include",
  },
  {
    id: "CORS_ALLOW_ALL",
    severity: "HIGH",
    category: "spring-boot",
    message: "CORS allowed-origins=*는 모든 출처를 허용합니다.",
    conditionDesc: "*.allowed-origins = \"*\"",
    suggestion: "허용할 도메인을 명시적으로 지정하세요.",
    check: (f) =>
      Object.entries(f).some(([k, v]) => k.includes("allowed-origins") && v === "*"),
    affectedKey: (f) => Object.keys(f).find((k) => k.includes("allowed-origins")),
  },
  {
    id: "LOCALHOST_IN_PROD",
    severity: "HIGH",
    category: "spring-boot",
    message: "운영 환경에서 localhost를 참조하는 설정이 있습니다.",
    conditionDesc: "임의 값에 \"localhost\" 포함 (prod 환경)",
    suggestion: "운영 서버 주소로 변경하세요.",
    check: (f) =>
      Object.values(f).some((v) => typeof v === "string" && v.includes("localhost")),
    affectedKey: (f) =>
      Object.entries(f).find(([, v]) => typeof v === "string" && v.includes("localhost"))?.[0],
  },
  {
    id: "EMPTY_PASSWORD",
    severity: "CRITICAL",
    category: "spring-boot",
    message: "password 값이 빈 문자열로 설정되어 있습니다.",
    conditionDesc: "password/passwd/pwd 키의 값이 빈 문자열",
    suggestion: "비밀번호를 설정하거나 환경 변수로 주입하세요.",
    check: (f) =>
      Object.entries(f).some(
        ([k, v]) => /password|passwd|pwd/i.test(k.split(".").pop() ?? k) && v === "",
      ),
    affectedKey: (f) =>
      Object.keys(f).find(
        (k) => /password|passwd|pwd/i.test(k.split(".").pop() ?? k) && f[k] === "",
      ),
  },
  {
    id: "DEVTOOLS_ENABLED",
    severity: "MEDIUM",
    category: "spring-boot",
    message: "운영 환경에서 spring devtools가 활성화되어 있습니다.",
    conditionDesc: "spring.devtools.restart.enabled = true (prod 환경)",
    suggestion: "spring.devtools.restart.enabled: false 또는 해당 의존성을 제거하세요.",
    check: (f) => f["spring.devtools.restart.enabled"] === "true",
    affectedKey: () => "spring.devtools.restart.enabled",
  },
  {
    id: "WEAK_JWT_SECRET",
    severity: "HIGH",
    category: "spring-boot",
    message: "JWT secret이 너무 짧습니다 (32자 미만).",
    conditionDesc: "jwt.secret 값 길이 < 32자 (placeholder 제외)",
    suggestion: "최소 32자 이상의 랜덤 문자열을 사용하세요.",
    check: (f) => {
      const key = Object.keys(f).find((k) =>
        /jwt[_-]?secret/i.test(k.split(".").pop() ?? k),
      );
      if (!key) return false;
      const val = f[key] ?? "";
      return val.length > 0 && val.length < 32 && !val.startsWith("${");
    },
    affectedKey: (f) =>
      Object.keys(f).find((k) => /jwt[_-]?secret/i.test(k.split(".").pop() ?? k)),
  },
];

// ── Kubernetes rules ──────────────────────────────────────────────────────────

const K8S_RULES: Rule[] = [
  {
    id: "K8S_IMAGE_LATEST",
    severity: "MEDIUM",
    category: "kubernetes",
    message: "image: latest 태그 사용은 재현 불가능한 배포를 유발합니다.",
    conditionDesc: "*.image 값이 \":latest\"로 끝남",
    suggestion: "구체적인 이미지 버전 태그를 사용하세요.",
    check: (f) =>
      Object.entries(f).some(
        ([k, v]) => k.includes("image") && typeof v === "string" && v.endsWith(":latest"),
      ),
    affectedKey: (f) =>
      Object.keys(f).find((k) => k.includes("image") && (f[k] ?? "").endsWith(":latest")),
  },
  {
    id: "K8S_NO_RESOURCE_LIMITS",
    severity: "HIGH",
    category: "kubernetes",
    message: "resources.limits가 설정되지 않아 컨테이너가 무제한 리소스를 사용할 수 있습니다.",
    conditionDesc: "resources.limits 키가 존재하지 않음",
    suggestion: "resources.limits.cpu 및 resources.limits.memory를 명시하세요.",
    check: (f) => !Object.keys(f).some((k) => k.includes("resources.limits")),
    affectedKey: () => undefined,
  },
];

// ── Docker Compose rules ──────────────────────────────────────────────────────

const COMPOSE_RULES: Rule[] = [
  {
    id: "COMPOSE_PRIVILEGED",
    severity: "HIGH",
    category: "docker-compose",
    message: "privileged: true는 컨테이너에 호스트 루트 권한을 부여합니다.",
    conditionDesc: "*.privileged = true",
    suggestion: "필요한 최소 권한만 cap_add로 지정하세요.",
    check: (f) =>
      Object.entries(f).some(([k, v]) => k.includes("privileged") && v === "true"),
    affectedKey: (f) =>
      Object.keys(f).find((k) => k.includes("privileged") && f[k] === "true"),
  },
  {
    id: "COMPOSE_PORT_ALL_OPEN",
    severity: "MEDIUM",
    category: "docker-compose",
    message: "포트를 0.0.0.0 전체에 바인딩하면 외부에서 직접 접근이 가능합니다.",
    conditionDesc: "*.ports 값에 \"0.0.0.0\" 또는 단순 포트 노출",
    suggestion: "127.0.0.1 또는 내부 네트워크 인터페이스로 바인딩하세요.",
    check: (f) =>
      Object.entries(f).some(([k, v]) => k.includes("ports") && String(v).includes("0.0.0.0")),
    affectedKey: (f) =>
      Object.keys(f).find((k) => k.includes("ports") && String(f[k]).includes("0.0.0.0")),
  },
];

// ── Public exports ────────────────────────────────────────────────────────────

export const ALL_RULE_DEFINITIONS: RuleDefinition[] = [
  ...SPRING_BOOT_RULES,
  ...K8S_RULES,
  ...COMPOSE_RULES,
].map(({ id, severity, category, message, conditionDesc, suggestion }) => ({
  id,
  severity,
  category,
  message,
  conditionDesc,
  suggestion,
}));

export function validateConfig(
  file: { filename: string; environment?: string; flattened: Record<string, { rawValue: string }> },
  environment?: string,
): ValidationIssue[] {
  const flat: Record<string, string> = {};
  for (const [k, cv] of Object.entries(file.flattened)) {
    flat[k] = cv.rawValue;
  }

  const isProd = environment === "prod" || environment === "production";
  const rules = [...(isProd ? SPRING_BOOT_RULES : []), ...K8S_RULES, ...COMPOSE_RULES];

  return rules
    .filter((rule) => rule.check(flat))
    .map((rule) => ({
      id: crypto.randomUUID(),
      ruleId: rule.id,
      severity: rule.severity,
      category: "DANGEROUS_CONFIG" as const,
      file: file.filename,
      environment,
      key: rule.affectedKey?.(flat),
      message: rule.message,
      suggestion: rule.suggestion,
      ignored: false,
    }));
}

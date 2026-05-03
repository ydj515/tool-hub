import type { ConfigFile, Severity, ValidationIssue } from "./types";

// ── Metadata (for UI display) ─────────────────────────────────────────────────

export interface SecretKeyPatternMeta {
  pattern: string;
  severity: Severity;
  example: string;
}

export interface SecretValuePatternMeta {
  name: string;
  pattern: string;
  severity: Severity;
  example: string;
}

export const SECRET_KEY_PATTERNS_META: SecretKeyPatternMeta[] = [
  { pattern: "password, passwd, pwd",     severity: "HIGH",     example: "spring.datasource.password" },
  { pattern: "secret",                    severity: "HIGH",     example: "jwt.secret" },
  { pattern: "token",                     severity: "HIGH",     example: "auth.access-token" },
  { pattern: "api-key, apikey",           severity: "HIGH",     example: "external.api-key" },
  { pattern: "private-key",               severity: "CRITICAL", example: "ssl.private-key" },
  { pattern: "access-key",               severity: "CRITICAL", example: "aws.access-key" },
  { pattern: "aws-secret",               severity: "CRITICAL", example: "aws.secret-access-key" },
  { pattern: "credential",               severity: "HIGH",     example: "oauth.credential" },
  { pattern: "jwt-secret",               severity: "HIGH",     example: "jwt.jwt-secret" },
  { pattern: "client-secret",            severity: "HIGH",     example: "oauth2.client-secret" },
  { pattern: "auth-token",               severity: "HIGH",     example: "github.auth-token" },
];

export const SECRET_VALUE_PATTERNS_META: SecretValuePatternMeta[] = [
  {
    name: "AWS Access Key",
    pattern: "AKIA[0-9A-Z]{16}",
    severity: "CRITICAL",
    example: "AKIAIOSFODNN7EXAMPLE",
  },
  {
    name: "JWT 토큰",
    pattern: "eyJ…[header].[payload].[signature]",
    severity: "HIGH",
    example: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.abc",
  },
  {
    name: "Private Key 헤더",
    pattern: "-----BEGIN (RSA )?PRIVATE KEY-----",
    severity: "CRITICAL",
    example: "-----BEGIN RSA PRIVATE KEY-----",
  },
  {
    name: "DB URL with credential",
    pattern: "jdbc:[scheme]://[user]:[pass]@[host]",
    severity: "CRITICAL",
    example: "jdbc:mysql://user:pass@prod-db:3306/myapp",
  },
  {
    name: "긴 Base64 문자열 (32자+)",
    pattern: "[A-Za-z0-9+/]{40,}={0,2}",
    severity: "MEDIUM",
    example: "c2VjcmV0LWtleS12YWx1ZS10b2tlbg==",
  },
];

// ── Internal runtime patterns ─────────────────────────────────────────────────

interface KeyRule { pattern: RegExp; severity: Severity }
interface ValueRule { pattern: RegExp; name: string; severity: Severity }

const KEY_RULES: KeyRule[] = [
  { pattern: /password|passwd|pwd/i,   severity: "HIGH" },
  { pattern: /^secret$|[_-]secret$|^secret[_-]/i, severity: "HIGH" },
  { pattern: /token/i,                 severity: "HIGH" },
  { pattern: /api[_-]?key|apikey/i,   severity: "HIGH" },
  { pattern: /private[_-]?key/i,      severity: "CRITICAL" },
  { pattern: /access[_-]?key/i,       severity: "CRITICAL" },
  { pattern: /aws[_-]?secret/i,       severity: "CRITICAL" },
  { pattern: /credential/i,           severity: "HIGH" },
  { pattern: /jwt[_-]?secret/i,       severity: "HIGH" },
  { pattern: /client[_-]?secret/i,    severity: "HIGH" },
  { pattern: /auth[_-]?token/i,       severity: "HIGH" },
];

const VALUE_RULES: ValueRule[] = [
  {
    pattern: /AKIA[0-9A-Z]{16}/,
    name: "AWS Access Key",
    severity: "CRITICAL",
  },
  {
    pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
    name: "JWT 토큰",
    severity: "HIGH",
  },
  {
    pattern: /-----BEGIN (RSA )?PRIVATE KEY-----/,
    name: "Private Key 헤더",
    severity: "CRITICAL",
  },
  {
    pattern: /jdbc:[a-z]+:\/\/[^:@\s]+:[^@\s]+@/,
    name: "DB URL with credential",
    severity: "CRITICAL",
  },
  {
    pattern: /[A-Za-z0-9+/]{40,}={0,2}/,
    name: "긴 Base64 문자열",
    severity: "MEDIUM",
  },
];

// ── Detection ─────────────────────────────────────────────────────────────────

export function detectSecrets(file: ConfigFile, environment?: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [key, cv] of Object.entries(file.flattened)) {
    if (cv.isPlaceholder) continue;
    if (cv.rawValue === "null" || cv.rawValue === "") continue;

    const leaf = key.split(".").pop() ?? key;

    for (const { pattern, severity } of KEY_RULES) {
      if (pattern.test(leaf)) {
        issues.push({
          id: crypto.randomUUID(),
          ruleId: "SECRET_KEY_PATTERN",
          severity,
          category: "SECRET",
          file: file.filename,
          environment,
          key,
          actualValue: cv.maskedValue ?? cv.rawValue.slice(0, 4) + "****",
          message: `민감정보 키(${leaf})에 평문 값 탐지`,
          suggestion: `환경 변수로 분리하세요. 예: \${${key.toUpperCase().replace(/\./g, "_")}}`,
          ignored: false,
        });
        break;
      }
    }

    for (const { pattern, name, severity } of VALUE_RULES) {
      if (pattern.test(cv.rawValue)) {
        issues.push({
          id: crypto.randomUUID(),
          ruleId: "SECRET_VALUE_PATTERN",
          severity,
          category: "SECRET",
          file: file.filename,
          environment,
          key,
          actualValue: cv.rawValue.slice(0, 6) + "****",
          message: `${name} 패턴 탐지`,
          suggestion: "민감한 값을 설정 파일에 직접 포함하지 마세요.",
          ignored: false,
        });
        break;
      }
    }
  }

  const seen = new Set<string>();
  return issues.filter((issue) => {
    const dedup = `${issue.key}-${issue.category}`;
    if (seen.has(dedup)) return false;
    seen.add(dedup);
    return true;
  });
}

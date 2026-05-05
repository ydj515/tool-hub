/**
 * 설정 파일을 포맷별로 파싱하고 평탄화된 키-값 구조로 변환한다.
 */
import * as yaml from "js-yaml";
import type { ConfigFile, ConfigFormat, ConfigValue, ParseError } from "./types";

/**
 * 파일 이름과 내용을 바탕으로 설정 파일 포맷을 자동 감지한다.
 * 확장자 → 내용 시작 문자 → 줄 단위 KEY=VALUE 패턴 순으로 판별한다.
 * @param filename - 확장자를 포함한 파일 이름
 * @param content - 설정 파일의 원본 텍스트
 * @returns 감지된 ConfigFormat ("yaml" | "json" | "properties" | "env")
 */
export function detectFormat(filename: string, content: string): ConfigFormat {
  const lower = filename.toLowerCase();
  const ext = lower.split(".").pop() ?? "";
  if (ext === "yaml" || ext === "yml") return "yaml";
  if (ext === "json") return "json";
  if (ext === "properties") return "properties";
  if (lower.startsWith(".env") || ext === "env") return "env";
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  // 전체 문자열로 ":" 포함 여부를 판단하면 URL 값(postgres://host:5432) 때문에
  // false negative가 발생하므로 줄 단위로 KEY=VALUE 패턴을 확인한다
  const meaningfulLines = trimmed.split("\n").filter((l) => {
    const t = l.trim();
    return t && !t.startsWith("#");
  });
  const looksLikeEnv = meaningfulLines.length > 0 &&
    meaningfulLines.every((l) => /^[A-Z_][A-Z0-9_]*\s*=/.test(l.trim()));
  if (looksLikeEnv) return "env";
  return "yaml";
}

function getValueType(value: unknown): ConfigValue["valueType"] {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

function isPlaceholder(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return /^\$\{[^}]+\}$/.test(v) || /^\$[A-Z_][A-Z0-9_]*$/.test(v);
}

const SENSITIVE_KEY_RE = [
  /password/i, /passwd/i, /pwd/i, /secret/i, /token/i,
  /api[_-]?key/i, /apikey/i, /private[_-]?key/i, /access[_-]?key/i,
  /aws[_-]?secret/i, /auth[_-]?token/i, /bearer/i, /credential/i,
  /jwt[_-]?secret/i, /client[_-]?secret/i,
];

function isSensitiveKey(key: string): boolean {
  const leaf = key.split(".").pop() ?? key;
  return SENSITIVE_KEY_RE.some((re) => re.test(leaf));
}

function maskValue(raw: string): string {
  if (raw.length <= 4) return "****";
  return raw.slice(0, 4) + "*".repeat(Math.min(raw.length - 4, 8));
}

function flattenValue(
  fullKey: string,
  v: unknown,
  result: Record<string, ConfigValue>,
): void {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    Object.assign(result, flattenObject(v as Record<string, unknown>, fullKey));
    return;
  }
  if (Array.isArray(v)) {
    v.forEach((item, idx) => {
      flattenValue(`${fullKey}[${idx}]`, item, result);
    });
    return;
  }
  const rawValue = v === null || v === undefined ? "null" : String(v);
  const placeholder = isPlaceholder(v);
  const sensitive = isSensitiveKey(fullKey);
  const cv: ConfigValue = {
    key: fullKey,
    value: v,
    valueType: getValueType(v),
    rawValue,
    isPlaceholder: placeholder,
    isSensitiveCandidate: sensitive,
  };
  if (sensitive && !placeholder && rawValue !== "null" && rawValue !== "") {
    cv.maskedValue = maskValue(rawValue);
  }
  result[fullKey] = cv;
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, ConfigValue> {
  const result: Record<string, ConfigValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    flattenValue(prefix ? `${prefix}.${k}` : k, v, result);
  }
  return result;
}

function parseYaml(content: string): { parsed: Record<string, unknown>; errors: ParseError[] } {
  // billion-laughs 방어: 크기 제한 + alias 개수 제한 (SEC-006)
  if (content.length > 500_000) {
    return { parsed: {}, errors: [{ line: 1, message: "YAML 콘텐츠가 너무 큽니다 (최대 500 KB)." }] };
  }
  const aliasCount = (content.match(/\*[A-Za-z_]\w*/g) ?? []).length;
  if (aliasCount > 100) {
    return { parsed: {}, errors: [{ line: 1, message: "YAML alias 수가 너무 많습니다 (최대 100개)." }] };
  }
  try {
    const result = yaml.load(content, { schema: yaml.DEFAULT_SCHEMA });
    if (result === null || result === undefined) return { parsed: {}, errors: [] };
    if (typeof result !== "object" || Array.isArray(result)) {
      return { parsed: {}, errors: [{ line: 1, message: "YAML 루트가 객체가 아닙니다." }] };
    }
    return { parsed: result as Record<string, unknown>, errors: [] };
  } catch (e) {
    const err = e as yaml.YAMLException;
    const line = (err.mark?.line ?? 0) + 1;
    return { parsed: {}, errors: [{ line, message: err.message.split("\n")[0] ?? err.message }] };
  }
}

function parseJson(content: string): { parsed: Record<string, unknown>; errors: ParseError[] } {
  try {
    const result = JSON.parse(content);
    if (typeof result !== "object" || Array.isArray(result) || result === null) {
      return { parsed: {}, errors: [{ line: 1, message: "JSON 루트가 객체가 아닙니다." }] };
    }
    return { parsed: result as Record<string, unknown>, errors: [] };
  } catch (e) {
    return { parsed: {}, errors: [{ line: 1, message: String(e) }] };
  }
}

function parseProperties(content: string): { parsed: Record<string, unknown>; errors: ParseError[] } {
  const result: Record<string, unknown> = {};
  const errors: ParseError[] = [];
  const lines = content.split("\n");
  let pendingKey = "";
  let pendingVal = "";

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];

    if (pendingKey) {
      const trimmed = raw.trim();
      if (trimmed.endsWith("\\")) {
        pendingVal += trimmed.slice(0, -1);
        continue;
      }
      result[pendingKey] = pendingVal + trimmed;
      pendingKey = "";
      pendingVal = "";
      continue;
    }

    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) continue;

    const sepMatch = trimmed.match(/^([^=:\s]+)\s*[=:]\s*(.*)/);
    if (!sepMatch) {
      errors.push({ line: lineNum, message: `구분자가 없습니다: ${trimmed}` });
      continue;
    }

    const key = sepMatch[1];
    const valRaw = sepMatch[2];

    if (valRaw.endsWith("\\")) {
      pendingKey = key;
      pendingVal = valRaw.slice(0, -1);
    } else {
      result[key] = valRaw;
    }
  }

  // 파일 끝에서 continuation이 끊겨도 누적된 값을 저장
  if (pendingKey) {
    result[pendingKey] = pendingVal;
  }

  return { parsed: result, errors };
}

function parseEnv(content: string): { parsed: Record<string, unknown>; errors: ParseError[] } {
  const result: Record<string, unknown> = {};
  const errors: ParseError[] = [];

  for (const [i, raw] of content.split("\n").entries()) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) {
      errors.push({ line: i + 1, message: `= 구분자가 없습니다: ${trimmed}` });
      continue;
    }

    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }

  return { parsed: result, errors };
}

/**
 * 설정 파일 텍스트를 파싱해 ConfigFile 객체로 변환한다.
 * 포맷이 지정되지 않으면 detectFormat으로 자동 감지한다.
 * 파싱된 객체는 점 표기법으로 평탄화(flatten)되며, 민감 키는 마스킹된다.
 * @param content - 파일 원본 텍스트
 * @param filename - 파일 이름 (포맷 감지 및 UUID 부여에 사용)
 * @param format - 명시적으로 지정할 포맷 (생략 시 자동 감지)
 * @returns 파싱 결과와 오류 목록을 포함한 ConfigFile
 */
export function parseConfigFile(
  content: string,
  filename: string,
  format?: ConfigFormat,
): ConfigFile {
  const fmt = format ?? detectFormat(filename, content);
  let parsed: Record<string, unknown> = {};
  let parseErrors: ParseError[] = [];

  switch (fmt) {
    case "yaml":
      ({ parsed, errors: parseErrors } = parseYaml(content));
      break;
    case "json":
      ({ parsed, errors: parseErrors } = parseJson(content));
      break;
    case "properties":
      ({ parsed, errors: parseErrors } = parseProperties(content));
      break;
    case "env":
      ({ parsed, errors: parseErrors } = parseEnv(content));
      break;
  }

  return {
    id: crypto.randomUUID(),
    filename,
    format: fmt,
    rawContent: content,
    parsed,
    flattened: flattenObject(parsed),
    parseErrors,
  };
}

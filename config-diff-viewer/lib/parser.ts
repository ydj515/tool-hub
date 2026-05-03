import * as yaml from "js-yaml";
import type { ConfigFile, ConfigFormat, ConfigValue, ParseError } from "./types";

export function detectFormat(filename: string, content: string): ConfigFormat {
  const lower = filename.toLowerCase();
  const ext = lower.split(".").pop() ?? "";
  if (ext === "yaml" || ext === "yml") return "yaml";
  if (ext === "json") return "json";
  if (ext === "properties") return "properties";
  if (lower.startsWith(".env") || ext === "env") return "env";
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (!trimmed.includes(":") && trimmed.includes("=")) return "env";
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

function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, ConfigValue> {
  const result: Record<string, ConfigValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flattenObject(v as Record<string, unknown>, fullKey));
    } else {
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
  }
  return result;
}

function parseYaml(content: string): { parsed: Record<string, unknown>; errors: ParseError[] } {
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
    id: Math.random().toString(36).slice(2),
    filename,
    format: fmt,
    rawContent: content,
    parsed,
    flattened: flattenObject(parsed),
    parseErrors,
  };
}

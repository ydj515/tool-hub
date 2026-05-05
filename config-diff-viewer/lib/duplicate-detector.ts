/**
 * 포맷별 규칙으로 동일 파일 내 중복 키를 탐지한다.
 */
import type { ConfigFile, ValidationIssue } from "./types";

function makeIssue(file: string, env: string, key: string): ValidationIssue {
  return {
    id: crypto.randomUUID(),
    ruleId: "DUPLICATE_KEY",
    severity: "MEDIUM",
    category: "DUPLICATE_KEY",
    file,
    environment: env,
    key,
    message: `"${key}" 키가 같은 파일 내에서 두 번 이상 정의되어 있습니다.`,
    suggestion: "중복 정의를 제거하고 마지막 값만 남기거나 의도한 값을 확인하세요.",
    ignored: false,
  };
}

// ── YAML: indent-stack 방식으로 중복 키 감지 ────────────────────────────────
// 들여쓰기 레벨과 부모 컨텍스트를 스택으로 추적해 동일 scope 내 중복을 탐지한다.
// 리스트 항목(- )을 만날 때마다 해당 레벨의 scope를 초기화해 false positive를 방지한다.
function detectYamlDuplicates(content: string): string[] {
  const duplicates = new Set<string>();
  const frames: Array<{ indent: number; seenKeys: Set<string> }> = [
    { indent: -1, seenKeys: new Set() },
  ];

  for (const rawLine of content.split("\n")) {
    const stripped = rawLine.replace(/#.*$/, "");
    if (!stripped.trim()) continue;

    const indent = stripped.length - stripped.trimStart().length;
    const trimmed = stripped.trim();

    if (trimmed.startsWith("- ") || trimmed === "-") {
      // 새 리스트 항목 → 해당 레벨 이하 프레임을 제거하고 fresh scope 시작
      while (frames.length > 1 && frames[frames.length - 1].indent >= indent) {
        frames.pop();
      }
      frames.push({ indent, seenKeys: new Set() });
      // 인라인 키 처리: - key: value 형태
      const inlineMatch = trimmed.match(/^-\s+([A-Za-z0-9_][A-Za-z0-9_.[\]-]*):\s*/);
      if (inlineMatch) frames[frames.length - 1].seenKeys.add(inlineMatch[1]);
      continue;
    }

    const match = stripped.match(/^(\s*)([A-Za-z0-9_][A-Za-z0-9_.[\]-]*):\s*/);
    if (!match) continue;
    const key = match[2];

    while (frames.length > 1 && frames[frames.length - 1].indent >= indent) {
      frames.pop();
    }

    const parent = frames[frames.length - 1];
    if (parent.seenKeys.has(key)) {
      duplicates.add(key);
    } else {
      parent.seenKeys.add(key);
    }
    frames.push({ indent, seenKeys: new Set() });
  }

  return [...duplicates];
}

// ── JSON: 상태 머신으로 동일 객체 scope 내 중복 프로퍼티 감지 ────────────────
function detectJsonDuplicates(content: string): string[] {
  const duplicates = new Set<string>();
  const scopes: Set<string>[] = [];
  let i = 0;

  function skipWs() {
    while (i < content.length && /\s/.test(content[i])) i++;
  }

  function readString(): string {
    let s = "";
    i++; // opening " 건너뜀
    while (i < content.length) {
      const c = content[i++];
      if (c === "\\") { i++; }      // 이스케이프 문자 skip
      else if (c === '"') { break; }
      else { s += c; }
    }
    return s;
  }

  while (i < content.length) {
    skipWs();
    if (i >= content.length) break;
    const c = content[i];
    if      (c === "{") { scopes.push(new Set()); i++; }
    else if (c === "}") { scopes.pop(); i++; }
    else if (c === "[" || c === "]" || c === "," || c === ":") { i++; }
    else if (c === '"') {
      const key = readString();
      skipWs();
      if (i < content.length && content[i] === ":" && scopes.length > 0) {
        const scope = scopes[scopes.length - 1];
        if (scope.has(key)) duplicates.add(key);
        else scope.add(key);
      }
    } else {
      i++;
    }
  }

  return [...duplicates];
}

// ── .properties ──────────────────────────────────────────────────────────────
function detectPropertiesDuplicates(content: string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("!")) continue;
    const m = t.match(/^([^=:\s]+)\s*[=:]/);
    if (m) {
      if (seen.has(m[1])) duplicates.add(m[1]);
      else seen.add(m[1]);
    }
  }
  return [...duplicates];
}

// ── .env ─────────────────────────────────────────────────────────────────────
function detectEnvDuplicates(content: string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (seen.has(key)) duplicates.add(key);
    else seen.add(key);
  }
  return [...duplicates];
}

// ── public API ────────────────────────────────────────────────────────────────
/**
 * 설정 파일에서 중복 정의된 키를 탐지해 ValidationIssue 배열로 반환한다.
 * 포맷별 전용 파서(YAML indent-stack, JSON 상태 머신, properties/env 선형 스캔)를 사용한다.
 * @param file - 검사할 설정 파일 (format 및 rawContent 필드 필요)
 * @param env - 이슈에 기록할 환경 레이블 (예: "prod", "dev")
 * @returns 중복 키에 대한 ValidationIssue[]
 */
export function detectDuplicateKeys(file: ConfigFile, env: string): ValidationIssue[] {
  let keys: string[];
  switch (file.format) {
    case "yaml":       keys = detectYamlDuplicates(file.rawContent); break;
    case "json":       keys = detectJsonDuplicates(file.rawContent); break;
    case "properties": keys = detectPropertiesDuplicates(file.rawContent); break;
    case "env":        keys = detectEnvDuplicates(file.rawContent); break;
  }
  return keys.map((key) => makeIssue(file.filename, env, key));
}

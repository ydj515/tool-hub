export type ConfigFormat = "yaml" | "json" | "properties" | "env";

export interface AnalysisOptions {
  enableSecretDetection: boolean;
  enableDangerousConfigDetection: boolean;
}
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type IssueCategory =
  | "MISSING_KEY"
  | "DANGEROUS_CONFIG"
  | "SECRET"
  | "DUPLICATE_KEY"
  | "TYPE_CHANGED"
  | "VALUE_CHANGED";
export type DiffStatus = "ADDED" | "REMOVED" | "CHANGED" | "UNCHANGED" | "TYPE_CHANGED";

export interface ParseError {
  line: number;
  message: string;
}

export interface ConfigValue {
  key: string;
  value: unknown;
  valueType: "string" | "number" | "boolean" | "array" | "object" | "null";
  rawValue: string;
  maskedValue?: string;
  line?: number;
  isPlaceholder: boolean;
  isSensitiveCandidate: boolean;
}

export interface ConfigFile {
  id: string;
  filename: string;
  format: ConfigFormat;
  environment?: string;
  rawContent: string;
  parsed: Record<string, unknown>;
  flattened: Record<string, ConfigValue>;
  parseErrors: ParseError[];
}

export interface ValidationIssue {
  id: string;
  ruleId: string;
  severity: Severity;
  category: IssueCategory;
  file: string;
  environment?: string;
  key?: string;
  actualValue?: string;
  expectedValue?: string;
  message: string;
  suggestion?: string;
  ignored: boolean;
}

export interface DiffResult {
  key: string;
  status: DiffStatus;
  valueA: ConfigValue | null;
  valueB: ConfigValue | null;
}

export interface ValidationReport {
  id: string;
  createdAt: string;
  fileA: ConfigFile;
  fileB: ConfigFile;
  summary: {
    totalKeys: number;
    matchedKeys: number;
    changedKeys: number;
    missingInA: number;
    missingInB: number;
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    status: "PASSED" | "FAILED";
  };
  diffResults: DiffResult[];
  issues: ValidationIssue[];
}

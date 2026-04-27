export type Dialect = "postgresql" | "mysql" | "h2";

export type SqlValue = string | number | boolean | null;

export type ColumnKind =
  | "integer"
  | "decimal"
  | "string"
  | "boolean"
  | "date"
  | "datetime"
  | "uuid"
  | "json"
  | "binary";

export interface ForeignKey {
  name?: string;
  columns: string[];
  refTable: string;
  refColumns: string[];
}

export interface ColumnReference {
  table: string;
  columns: string[];
}

export interface ColumnSchema {
  name: string;
  rawType: string;
  kind: ColumnKind;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  /** GENERATED ALWAYS AS (expr) STORED/VIRTUAL — INSERT에서 제외됨 */
  computed: boolean;
  /** GENERATED ALWAYS AS IDENTITY — PostgreSQL INSERT에 OVERRIDING SYSTEM VALUE 필요 */
  generatedAlwaysAsIdentity: boolean;
  defaultValue?: string;
  enumValues?: string[];
  reference?: ColumnReference;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
}

export interface ParseResult {
  tables: TableSchema[];
  warnings: string[];
}

export type DdlIssueSeverity = "error" | "warning";

export interface DdlSyntaxIssue {
  severity: DdlIssueSeverity;
  line: number;
  column: number;
  offset?: number;
  message: string;
  hint?: string;
}

export interface DdlValidationResult {
  issues: DdlSyntaxIssue[];
  hasErrors: boolean;
}

export interface CycleGroup {
  tables: string[];
}

export interface AnalysisResult {
  tables: TableSchema[];
  insertOrder: string[];
  cycleGroups: CycleGroup[];
  warnings: string[];
}

export type DataLocale = "ko" | "en";

export interface GenerationOptions {
  dialect: Dialect;
  rowCount: number;
  seed: number;
  includeBoundaryValues: boolean;
  locale: DataLocale;
}

export interface GeneratedTable {
  table: TableSchema;
  rows: Record<string, SqlValue>[];
}

export interface GeneratedSql {
  insertSql: string;
  rollbackSql: string;
  analysis: AnalysisResult;
  generatedTables: GeneratedTable[];
  summary: {
    tableCount: number;
    rowCountPerTable: number;
    totalRows: number;
    insertStatements: number;
    rollbackStatements: number;
  };
}

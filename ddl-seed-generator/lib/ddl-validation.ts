import { normalizeIdentifier, extractParenBody } from "@/lib/ddl-utils";
import type { DdlSyntaxIssue, DdlValidationResult, Dialect } from "@/lib/types";

interface StatementRange {
  text: string;
  start: number;
}

interface SplitResult {
  statements: StatementRange[];
  issues: DdlSyntaxIssue[];
}

interface SemanticColumn {
  name: string;
  offset: number;
}

interface SemanticForeignKey {
  isAlterTable?: boolean;
  sourceTableOffset?: number;
  sourceTable: string;
  sourceColumns: SemanticColumn[];
  refTable: SemanticColumn;
  refColumns: SemanticColumn[];
}

interface SemanticTable {
  name: string;
  columns: Map<string, SemanticColumn>;
  primaryKey: string[];
}

interface SemanticModel {
  tables: Map<string, SemanticTable>;
  foreignKeys: SemanticForeignKey[];
}

const CREATE_TABLE_HEADER_PATTERN =
  /create\s+(?:temporary\s+|temp\s+)?table\s+(?:if\s+not\s+exists\s+)?((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.])+)\s*\(/i;

function matchCreateTable(statement: string): { tableName: string; body: string } | null {
  const m = statement.match(CREATE_TABLE_HEADER_PATTERN);
  if (!m || m.index === undefined) return null;
  const openIdx = m.index + m[0].length - 1;
  const body = extractParenBody(statement, openIdx);
  if (body === null) return null;
  return { tableName: m[1], body };
}

export function validateDdl(input: string, dialect: Dialect): DdlValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      issues: [
        {
          severity: "warning",
          line: 1,
          column: 1,
          message: "DDL을 입력해 주세요.",
          hint: "CREATE TABLE 문을 하나 이상 입력하면 분석을 시작합니다.",
        },
      ],
      hasErrors: false,
    };
  }

  const splitResult = splitStatementsWithIssues(input);
  const issues = [...splitResult.issues];
  let createTableCount = 0;

  for (const statement of splitResult.statements) {
    const normalized = statement.text.trim();
    const statementStart = statement.start + statement.text.search(/\S/);
    const position = positionAt(input, statementStart);

    // 주석을 제거한 텍스트로 구문 종류를 분류하여 주석이 앞에 오는 경우를 처리
    const classificationText = normalized
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/--[^\n]*/g, "")
      .trimStart();

    if (/^alter\s+table\b/i.test(classificationText)) {
      issues.push(...validateAlterTableFk(input, statementStart, normalized, dialect));
      continue;
    }

    if (!/^create\s+/i.test(classificationText)) {
      if (classificationText.trim()) {
        issues.push({
          severity: "error",
          ...position,
          message: "지원하지 않는 SQL 문입니다.",
          hint: "CREATE TABLE 또는 ALTER TABLE ... ADD FOREIGN KEY 문을 입력해 주세요.",
        });
      }
      continue;
    }

    if (!/^create\s+(?:temporary\s+|temp\s+)?table\b/i.test(classificationText)) {
      issues.push({
        severity: "error",
        ...position,
        message: "CREATE TABLE 문만 지원합니다.",
        hint: "예: CREATE TABLE users (...);",
      });
      continue;
    }

    const ctMatch = matchCreateTable(normalized);
    if (!ctMatch) {
      issues.push({
        severity: "error",
        ...position,
        message: "CREATE TABLE 구문을 해석하지 못했습니다.",
        hint: "테이블 이름과 괄호로 감싼 컬럼 목록이 있는지 확인해 주세요.",
      });
      continue;
    }

    createTableCount += 1;
    const tableNameIssue = validateIdentifierToken(input, statementStart + normalized.indexOf(ctMatch.tableName), ctMatch.tableName, dialect, "테이블 이름");
    if (tableNameIssue) {
      issues.push(tableNameIssue);
    }
    issues.push(...validateCreateTableBody(input, statement, ctMatch.tableName, ctMatch.body, dialect));
  }

  issues.push(...validateSemanticReferences(input, splitResult.statements, dialect));

  if (createTableCount === 0 && !issues.some((issue) => issue.severity === "error")) {
    issues.push({
      severity: "error",
      line: 1,
      column: 1,
      message: "CREATE TABLE 문을 찾지 못했습니다.",
      hint: "DDL 입력에는 CREATE TABLE 문이 하나 이상 필요합니다.",
    });
  }

  return {
    issues: sortIssues(dedupeIssues(issues)),
    hasErrors: issues.some((issue) => issue.severity === "error"),
  };
}

const ALTER_TABLE_FK_PATTERN =
  /alter\s+table\s+(?:if\s+exists\s+)?((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)+)\s+add\s+(?:constraint\s+(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)\s+)?foreign\s+key\s*\(([^)]+)\)\s+references\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)+)\s*(?:\(([^)]+)\))?/i;

function validateAlterTableFk(
  input: string,
  statementStart: number,
  normalized: string,
  dialect: Dialect,
): DdlSyntaxIssue[] {
  const issues: DdlSyntaxIssue[] = [];

  if (!/add\s+(?:constraint\s+\S+\s+)?foreign\s+key\b/i.test(normalized)) {
    issues.push({
      severity: "warning",
      ...positionAt(input, statementStart),
      message: "지원하지 않는 ALTER TABLE 문입니다.",
      hint: "ALTER TABLE ... ADD [CONSTRAINT name] FOREIGN KEY (...) REFERENCES ...(...) 형식만 지원합니다.",
    });
    return issues;
  }

  const match = normalized.match(ALTER_TABLE_FK_PATTERN);
  if (!match) {
    issues.push({
      severity: "error",
      ...positionAt(input, statementStart),
      message: "ALTER TABLE FOREIGN KEY 구문을 해석하지 못했습니다.",
      hint: "예: ALTER TABLE orders ADD CONSTRAINT fk_name FOREIGN KEY (user_id) REFERENCES users(id)",
    });
    return issues;
  }

  const tableOffset = statementStart + normalized.indexOf(match[1]);
  const tableIssue = validateIdentifierToken(input, tableOffset, match[1], dialect, "테이블 이름");
  if (tableIssue) {
    issues.push(tableIssue);
  }

  const fkColsOffset = statementStart + normalized.indexOf(match[2]);
  issues.push(...validateIdentifierList(input, fkColsOffset, match[2], dialect, "FOREIGN KEY 컬럼"));

  const refTableOffset = statementStart + normalized.lastIndexOf(match[3]);
  const refTableIssue = validateIdentifierToken(input, refTableOffset, match[3], dialect, "REFERENCES 대상 테이블");
  if (refTableIssue) {
    issues.push(refTableIssue);
  }

  if (match[4]) {
    const refColsOffset = statementStart + normalized.lastIndexOf(match[4]);
    issues.push(...validateIdentifierList(input, refColsOffset, match[4], dialect, "REFERENCES 컬럼"));
  }

  return issues;
}

function validateCreateTableBody(
  input: string,
  statement: StatementRange,
  tableName: string,
  body: string,
  dialect: Dialect,
): DdlSyntaxIssue[] {
  const issues: DdlSyntaxIssue[] = [];
  const bodyStartInStatement = statement.text.indexOf(body);
  const bodyStart = statement.start + bodyStartInStatement;
  const items = splitTopLevelItems(body, bodyStart);

  if (items.length === 0) {
    issues.push({
      severity: "error",
      ...positionAt(input, bodyStart),
      message: `${normalizeIdentifier(tableName)} 테이블에 컬럼 정의가 없습니다.`,
      hint: "예: id BIGINT PRIMARY KEY",
    });
    return issues;
  }

  for (const item of items) {
    const text = item.text.trim();
    const itemStart = item.start + item.text.search(/\S/);

    if (!text) {
      issues.push({
        severity: "error",
        ...positionAt(input, item.start),
        message: "비어 있는 컬럼/제약 정의가 있습니다.",
        hint: "연속된 쉼표 또는 마지막 컬럼 뒤 쉼표를 확인해 주세요.",
      });
      continue;
    }

    const withoutConstraintName = text
      .replace(/^constraint\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)\s+/i, "")
      .trim();
    const lower = withoutConstraintName.toLowerCase();

    if (lower.startsWith("primary key")) {
      const keyColumns = extractFirstParenthesizedList(withoutConstraintName);
      if (!keyColumns) {
        issues.push({
          severity: "error",
          ...positionAt(input, itemStart),
          message: "PRIMARY KEY 컬럼 목록을 해석하지 못했습니다.",
          hint: "예: PRIMARY KEY (id)",
        });
      } else {
        issues.push(...validateIdentifierList(input, itemStart + withoutConstraintName.indexOf(keyColumns.raw), keyColumns.value, dialect, "PRIMARY KEY 컬럼"));
      }
      continue;
    }

    if (lower.startsWith("foreign key")) {
      const foreignKeyIssue = validateForeignKeyConstraint(input, itemStart, withoutConstraintName, dialect);
      if (foreignKeyIssue) {
        issues.push(foreignKeyIssue);
      }
      const keyColumns = extractFirstParenthesizedList(withoutConstraintName);
      if (keyColumns) {
        issues.push(...validateIdentifierList(input, itemStart + withoutConstraintName.indexOf(keyColumns.raw), keyColumns.value, dialect, "FOREIGN KEY 컬럼"));
      }
      continue;
    }

    if (lower.startsWith("unique")) {
      const uniqueColumns = extractFirstParenthesizedList(withoutConstraintName);
      if (!uniqueColumns) {
        issues.push({
          severity: "error",
          ...positionAt(input, itemStart),
          message: "UNIQUE 제약의 컬럼 목록을 해석하지 못했습니다.",
          hint: "예: UNIQUE (email)",
        });
      } else {
        issues.push(...validateIdentifierList(input, itemStart + withoutConstraintName.indexOf(uniqueColumns.raw), uniqueColumns.value, dialect, "UNIQUE 컬럼"));
      }
      continue;
    }

    if (lower.startsWith("check")) {
      if (!/^check\s*\(/i.test(withoutConstraintName)) {
        issues.push({
          severity: "error",
          ...positionAt(input, itemStart),
          message: "CHECK 제약을 해석하지 못했습니다.",
          hint: "예: CHECK (status IN ('active', 'disabled'))",
        });
      }
      continue;
    }

    const columnMatch = text.match(/^\s*("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)\s+([A-Za-z_][A-Za-z0-9_$]*(?:\s*\([^)]*\))?|[^\s,]+)/);
    if (!columnMatch) {
      issues.push({
        severity: "error",
        ...positionAt(input, itemStart),
        message: "컬럼 정의를 해석하지 못했습니다.",
        hint: "예: email VARCHAR(120) NOT NULL",
      });
      continue;
    }

    const columnNameStart = itemStart + text.indexOf(columnMatch[1]);
    const columnNameIssue = validateIdentifierToken(input, columnNameStart, columnMatch[1], dialect, "컬럼 이름");
    if (columnNameIssue) {
      issues.push(columnNameIssue);
    }

    const rest = text.slice(columnMatch[0].length);
    const restStart = itemStart + columnMatch[0].length;
    const constraintIssue = validateColumnConstraints(input, restStart, rest, dialect);
    if (constraintIssue) {
      issues.push(constraintIssue);
    }

    const referencesIssue = validateInlineReferences(input, restStart, rest, dialect);
    if (referencesIssue) {
      issues.push(referencesIssue);
    }
  }

  return issues;
}

function validateColumnConstraints(
  input: string,
  restStart: number,
  rest: string,
  dialect: Dialect,
): DdlSyntaxIssue | null {
  const cleaned = removeParenthesizedSections(rest)
    .replace(/\bnot\s+null\b/gi, " ")
    .replace(/\bnull\b/gi, " ")
    .replace(/\bprimary\s+key\b/gi, " ")
    .replace(/\bunique\b/gi, " ")
    .replace(/\bdefault\s+('(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"|[^\s,]+)/gi, " ")
    .replace(/\breferences\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)(?:\s*)/gi, " ")
    .replace(/\bcheck\b/gi, " ")
    .replace(/\bauto_increment\b/gi, " ")
    .replace(/\bgenerated\b[\s\S]*$/gi, " ")
    .replace(/\bon\s+(?:delete|update)\s+\w+/gi, " ")
    .trim();

  const invalidToken = cleaned.match(/[^\s,]+/);
  if (!invalidToken) {
    return null;
  }

  const tokenOffset = restStart + rest.indexOf(invalidToken[0]);
  return {
    severity: "error",
    ...positionAt(input, tokenOffset),
    offset: tokenOffset,
    message: `알 수 없는 컬럼 제약 토큰 '${invalidToken[0]}'가 있습니다.`,
    hint: `${dialectLabel(dialect)} 모드에서 지원되는 제약은 NOT NULL, PRIMARY KEY, UNIQUE, DEFAULT, REFERENCES, CHECK 중심입니다.`,
  };
}

function validateInlineReferences(
  input: string,
  restStart: number,
  rest: string,
  dialect: Dialect,
): DdlSyntaxIssue | null {
  const referencesMatch = rest.match(/\breferences\b/i);
  if (!referencesMatch || referencesMatch.index === undefined) {
    return null;
  }

  const referencesOffset = restStart + referencesMatch.index;
  const afterReferences = rest.slice(referencesMatch.index + referencesMatch[0].length);
  const targetMatch = afterReferences.match(/^\s*("[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s(,]+)/);
  if (!targetMatch || targetMatch.index === undefined) {
    return {
      severity: "error",
      ...positionAt(input, referencesOffset),
      offset: referencesOffset,
      message: "REFERENCES 대상 테이블을 찾지 못했습니다.",
      hint: "예: user_id BIGINT REFERENCES users(id)",
    };
  }

  const tableOffset = referencesOffset + referencesMatch[0].length + targetMatch.index + targetMatch[0].indexOf(targetMatch[1]);
  const tableIssue = validateIdentifierToken(input, tableOffset, targetMatch[1], dialect, "REFERENCES 대상 테이블");
  if (tableIssue) {
    return tableIssue;
  }

  const afterTarget = afterReferences.slice(targetMatch.index + targetMatch[0].length);
  const refColumnMatch = afterTarget.match(/^\s*\(([^)]*)\)/);
  if (refColumnMatch) {
    const listStart = tableOffset + targetMatch[1].length + afterTarget.indexOf(refColumnMatch[0]);
    const listIssues = validateIdentifierList(input, listStart, refColumnMatch[1], dialect, "REFERENCES 컬럼");
    return listIssues[0] ?? null;
  }

  return null;
}

function validateForeignKeyConstraint(
  input: string,
  itemStart: number,
  text: string,
  dialect: Dialect,
): DdlSyntaxIssue | null {
  const match = text.match(/^foreign\s+key\s*\([^)]+\)\s+references\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s(,]+)\s*(?:\(([^)]*)\))?/i);
  if (!match || match.index === undefined) {
    return {
      severity: "error",
      ...positionAt(input, itemStart),
      offset: itemStart,
      message: "FOREIGN KEY 제약을 해석하지 못했습니다.",
      hint: "예: FOREIGN KEY (user_id) REFERENCES users(id)",
    };
  }

  const tableOffset = itemStart + text.indexOf(match[1]);
  const tableIssue = validateIdentifierToken(input, tableOffset, match[1], dialect, "REFERENCES 대상 테이블");
  if (tableIssue) {
    return tableIssue;
  }

  if (match[2]) {
    const listOffset = itemStart + text.indexOf(match[2]);
    return validateIdentifierList(input, listOffset, match[2], dialect, "REFERENCES 컬럼")[0] ?? null;
  }

  return null;
}

function validateIdentifierList(
  input: string,
  listStart: number,
  list: string,
  dialect: Dialect,
  label: string,
): DdlSyntaxIssue[] {
  const issues: DdlSyntaxIssue[] = [];
  let searchFrom = 0;

  for (const rawToken of list.split(",")) {
    const token = rawToken.trim();
    if (!token) {
      issues.push({
        severity: "error",
        ...positionAt(input, listStart + searchFrom),
        offset: listStart + searchFrom,
        message: `${label} 목록에 빈 항목이 있습니다.`,
        hint: "쉼표가 연속되었거나 마지막 쉼표가 남아 있는지 확인해 주세요.",
      });
      searchFrom += rawToken.length + 1;
      continue;
    }

    const relative = list.indexOf(token, searchFrom);
    const tokenOffset = listStart + (relative >= 0 ? relative : searchFrom);
    const issue = validateIdentifierToken(input, tokenOffset, token, dialect, label);
    if (issue) {
      issues.push(issue);
    }
    searchFrom += rawToken.length + 1;
  }

  return issues;
}

function validateIdentifierToken(
  input: string,
  offset: number,
  token: string,
  dialect: Dialect,
  label: string,
): DdlSyntaxIssue | null {
  const parts = token.split(".");
  let partOffset = offset;

  for (const part of parts) {
    const trimmed = part.trim();
    const issueOffset = partOffset + part.indexOf(trimmed);

    if (trimmed.startsWith("\"") || trimmed.endsWith("\"")) {
      if (!(trimmed.startsWith("\"") && trimmed.endsWith("\"")) || dialect === "mysql") {
        return {
          severity: "error",
          ...positionAt(input, issueOffset),
          offset: issueOffset,
          message: `${label}의 quoted identifier 문법이 ${dialectLabel(dialect)}와 맞지 않습니다.`,
          hint: identifierHint(dialect),
        };
      }
      partOffset += part.length + 1;
      continue;
    }

    if (trimmed.startsWith("`") || trimmed.endsWith("`")) {
      if (!(trimmed.startsWith("`") && trimmed.endsWith("`")) || dialect !== "mysql") {
        return {
          severity: "error",
          ...positionAt(input, issueOffset),
          offset: issueOffset,
          message: `${label}의 quoted identifier 문법이 ${dialectLabel(dialect)}와 맞지 않습니다.`,
          hint: identifierHint(dialect),
        };
      }
      partOffset += part.length + 1;
      continue;
    }

    if (trimmed.startsWith("[") || trimmed.endsWith("]")) {
      return {
        severity: "error",
        ...positionAt(input, issueOffset),
        offset: issueOffset,
        message: `${label}에 지원하지 않는 대괄호 identifier가 있습니다.`,
        hint: identifierHint(dialect),
      };
    }

    if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(trimmed)) {
      return {
        severity: "error",
        ...positionAt(input, issueOffset),
        offset: issueOffset,
        message: `${label} '${trimmed}'에 허용되지 않는 문자가 있습니다.`,
        hint: identifierHint(dialect),
      };
    }

    partOffset += part.length + 1;
  }

  return null;
}

function validateSemanticReferences(input: string, statements: StatementRange[], dialect: Dialect): DdlSyntaxIssue[] {
  const model = collectSemanticModel(statements);
  const issues: DdlSyntaxIssue[] = [];

  for (const foreignKey of model.foreignKeys) {
    // ALTER TABLE 대상 테이블 존재 여부
    if (foreignKey.isAlterTable) {
      const srcTable = findSemanticTable(model.tables, foreignKey.sourceTable);
      if (!srcTable) {
        issues.push({
          severity: "error",
          ...positionAt(input, foreignKey.sourceTableOffset ?? 0),
          offset: foreignKey.sourceTableOffset,
          message: `ALTER TABLE의 대상 테이블 '${foreignKey.sourceTable}'을 찾지 못했습니다.`,
          hint: `'${foreignKey.sourceTable}' 테이블의 CREATE TABLE 문이 없거나 테이블 이름이 다릅니다.`,
        });
        continue;
      }
    }

    const refTable = findSemanticTable(model.tables, foreignKey.refTable.name);
    if (!refTable) {
      issues.push({
        severity: "error",
        ...positionAt(input, foreignKey.refTable.offset),
        offset: foreignKey.refTable.offset,
        message: `FK가 참조하는 테이블 '${foreignKey.refTable.name}'을 찾지 못했습니다.`,
        hint: "참조 대상 테이블의 CREATE TABLE 문을 함께 입력했는지 확인해 주세요.",
      });
      continue;
    }

    const sourceTable = findSemanticTable(model.tables, foreignKey.sourceTable);
    for (const sourceColumn of foreignKey.sourceColumns) {
      if (sourceTable && !sourceTable.columns.has(sourceColumn.name.toLowerCase())) {
        issues.push({
          severity: "error",
          ...positionAt(input, sourceColumn.offset),
          offset: sourceColumn.offset,
          message: `FK 원본 컬럼 '${foreignKey.sourceTable}.${sourceColumn.name}'을 찾지 못했습니다.`,
          hint: `${foreignKey.sourceTable} 테이블의 컬럼 정의와 FOREIGN KEY 컬럼 목록을 확인해 주세요.`,
        });
      }
    }

    const refColumns = foreignKey.refColumns.length > 0
      ? foreignKey.refColumns
      : refTable.primaryKey.map((columnName) => ({
          name: columnName,
          offset: foreignKey.refTable.offset,
        }));

    if (refColumns.length === 0) {
      issues.push({
        severity: "error",
        ...positionAt(input, foreignKey.refTable.offset),
        offset: foreignKey.refTable.offset,
        message: `FK가 참조하는 '${refTable.name}' 테이블에 명시된 참조 컬럼이 없고 PRIMARY KEY도 없습니다.`,
        hint: `예: REFERENCES ${refTable.name}(id)처럼 참조 컬럼을 명시해 주세요.`,
      });
      continue;
    }

    // FK 컬럼 수 불일치
    if (foreignKey.sourceColumns.length > 0 && foreignKey.sourceColumns.length !== refColumns.length) {
      issues.push({
        severity: "error",
        ...positionAt(input, foreignKey.refTable.offset),
        offset: foreignKey.refTable.offset,
        message: `FK 컬럼 수가 일치하지 않습니다. FOREIGN KEY ${foreignKey.sourceColumns.length}개, REFERENCES ${refColumns.length}개.`,
        hint: "FOREIGN KEY (...)와 REFERENCES ...(...)의 컬럼 수를 맞춰 주세요.",
      });
      continue;
    }

    for (const refColumn of refColumns) {
      if (!refTable.columns.has(refColumn.name.toLowerCase())) {
        issues.push({
          severity: "error",
          ...positionAt(input, refColumn.offset),
          offset: refColumn.offset,
          message: `FK가 참조하는 컬럼 '${refTable.name}.${refColumn.name}'을 찾지 못했습니다.`,
          hint: `${dialectLabel(dialect)} 기준으로 ${refTable.name} 테이블의 컬럼은 ${formatColumnList(refTable)} 입니다.`,
        });
      }
    }
  }

  return issues;
}

function findSemanticTable(tables: Map<string, SemanticTable>, refName: string): SemanticTable | undefined {
  const exact = tables.get(refName.toLowerCase());
  if (exact) {
    return exact;
  }
  const tablePart = refName.split(".").pop()?.toLowerCase();
  if (!tablePart) {
    return undefined;
  }
  for (const [key, table] of tables) {
    if (key === tablePart || key.split(".").pop() === tablePart) {
      return table;
    }
  }
  return undefined;
}

function collectAlterTableFk(
  statement: StatementRange,
  tables: Map<string, SemanticTable>,
): SemanticForeignKey | null {
  const normalized = statement.text.trim();
  const match = normalized.match(ALTER_TABLE_FK_PATTERN);
  if (!match) {
    return null;
  }

  const sourceTableName = normalizeIdentifier(match[1]);
  const sourceTable = findSemanticTable(tables, sourceTableName);

  const textSearchOffset = statement.text.indexOf(normalized);
  const baseOffset = statement.start + (textSearchOffset >= 0 ? textSearchOffset : 0);

  const alterPrefix = normalized.match(/^alter\s+table\s+(?:if\s+exists\s+)?/i)?.[0] ?? "";
  const sourceTableAbsOffset = baseOffset + alterPrefix.length;

  const fkColumnsStr = match[2];
  const fkColumnsRelOffset = normalized.indexOf(match[2]);
  const fkColumnsAbsOffset = baseOffset + fkColumnsRelOffset;

  const sourceColumns = splitIdentifierList(fkColumnsStr).map((col) => ({
    name: normalizeIdentifier(col.name),
    offset: fkColumnsAbsOffset + col.relativeOffset,
  }));

  const refTableStr = match[3];
  const refTableRelOffset = normalized.lastIndexOf(refTableStr);
  const refTableAbsOffset = baseOffset + refTableRelOffset;

  const refColumnsStr = match[4];
  const refColumnsAbsOffset = refColumnsStr
    ? baseOffset + normalized.lastIndexOf(refColumnsStr)
    : refTableAbsOffset;

  const refColumns = refColumnsStr
    ? splitIdentifierList(refColumnsStr).map((col) => ({
        name: normalizeIdentifier(col.name),
        offset: refColumnsAbsOffset + col.relativeOffset,
      }))
    : [];

  return {
    isAlterTable: true,
    sourceTableOffset: sourceTableAbsOffset,
    sourceTable: sourceTable?.name ?? sourceTableName,
    sourceColumns,
    refTable: {
      name: normalizeIdentifier(refTableStr),
      offset: refTableAbsOffset,
    },
    refColumns,
  };
}

function collectSemanticModel(statements: StatementRange[]): SemanticModel {
  const tables = new Map<string, SemanticTable>();
  const foreignKeys: SemanticForeignKey[] = [];

  for (const statement of statements) {
    const normalized = statement.text.trim();

    if (/^alter\s+table\b/i.test(normalized)) {
      const fk = collectAlterTableFk(statement, tables);
      if (fk) {
        foreignKeys.push(fk);
      }
      continue;
    }

    const ctMatch = matchCreateTable(normalized);
    if (!ctMatch) {
      continue;
    }

    const tableName = normalizeIdentifier(ctMatch.tableName);
    const body = ctMatch.body;
    const bodyStartInStatement = statement.text.indexOf(body);
    if (bodyStartInStatement < 0) {
      continue;
    }

    const bodyStart = statement.start + bodyStartInStatement;
    const table: SemanticTable = {
      name: tableName,
      columns: new Map(),
      primaryKey: [],
    };
    const items = splitTopLevelItems(body, bodyStart);

    for (const item of items) {
      const text = item.text.trim();
      const itemStart = item.start + item.text.search(/\S/);
      if (!text) {
        continue;
      }

      const withoutConstraintName = text
        .replace(/^constraint\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)\s+/i, "")
        .trim();
      const lower = withoutConstraintName.toLowerCase();

      if (lower.startsWith("primary key")) {
        const keyColumns = extractFirstParenthesizedList(withoutConstraintName);
        if (keyColumns) {
          table.primaryKey.push(...splitIdentifierList(keyColumns.value).map((column) => normalizeIdentifier(column.name)));
        }
        continue;
      }

      if (lower.startsWith("foreign key")) {
        const foreignKey = collectTableForeignKey(tableName, itemStart, withoutConstraintName);
        if (foreignKey) {
          foreignKeys.push(foreignKey);
        }
        continue;
      }

      if (lower.startsWith("unique") || lower.startsWith("check")) {
        continue;
      }

      const columnMatch = text.match(/^\s*("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)\s+([A-Za-z_][A-Za-z0-9_$]*(?:\s*\([^)]*\))?|[^\s,]+)/);
      if (!columnMatch) {
        continue;
      }

      const columnOffset = itemStart + text.indexOf(columnMatch[1]);
      const columnName = normalizeIdentifier(columnMatch[1]);
      table.columns.set(columnName.toLowerCase(), {
        name: columnName,
        offset: columnOffset,
      });

      if (/\bprimary\s+key\b/i.test(text) && !table.primaryKey.includes(columnName)) {
        table.primaryKey.push(columnName);
      }

      const rest = text.slice(columnMatch[0].length);
      const restStart = itemStart + columnMatch[0].length;
      const inlineForeignKey = collectInlineForeignKey(tableName, columnName, columnOffset, restStart, rest);
      if (inlineForeignKey) {
        foreignKeys.push(inlineForeignKey);
      }
    }

    tables.set(table.name.toLowerCase(), table);
  }

  return { tables, foreignKeys };
}

function collectInlineForeignKey(
  sourceTable: string,
  sourceColumnName: string,
  sourceColumnOffset: number,
  restStart: number,
  rest: string,
): SemanticForeignKey | null {
  const referencesMatch = rest.match(/\breferences\b/i);
  if (!referencesMatch || referencesMatch.index === undefined) {
    return null;
  }

  const referencesOffset = restStart + referencesMatch.index;
  const afterReferences = rest.slice(referencesMatch.index + referencesMatch[0].length);
  const tableMatch = afterReferences.match(/^\s*("[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s(,]+)/);
  if (!tableMatch || tableMatch.index === undefined) {
    return null;
  }

  const tableOffset = referencesOffset + referencesMatch[0].length + tableMatch.index + tableMatch[0].indexOf(tableMatch[1]);
  const afterTable = afterReferences.slice(tableMatch.index + tableMatch[0].length);
  const refColumnMatch = afterTable.match(/^\s*\(([^)]*)\)/);
  const refColumns = refColumnMatch
    ? splitIdentifierList(refColumnMatch[1]).map((column) => ({
        name: normalizeIdentifier(column.name),
        offset: tableOffset + tableMatch[1].length + afterTable.indexOf(refColumnMatch[0]) + 1 + column.relativeOffset,
      }))
    : [];

  return {
    sourceTable,
    sourceColumns: [{ name: sourceColumnName, offset: sourceColumnOffset }],
    refTable: {
      name: normalizeIdentifier(tableMatch[1]),
      offset: tableOffset,
    },
    refColumns,
  };
}

function collectTableForeignKey(sourceTable: string, itemStart: number, text: string): SemanticForeignKey | null {
  const keyColumns = extractFirstParenthesizedList(text);
  const match = text.match(/^foreign\s+key\s*\([^)]+\)\s+references\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[^\s(,]+)\s*(?:\(([^)]*)\))?/i);
  if (!keyColumns || !match) {
    return null;
  }

  const sourceColumns = splitIdentifierList(keyColumns.value).map((column) => ({
    name: normalizeIdentifier(column.name),
    offset: itemStart + text.indexOf(keyColumns.raw) + 1 + column.relativeOffset,
  }));
  const refTableOffset = itemStart + text.indexOf(match[1]);
  const refColumns = match[2]
    ? splitIdentifierList(match[2]).map((column) => ({
        name: normalizeIdentifier(column.name),
        offset: itemStart + text.indexOf(match[2] ?? "") + column.relativeOffset,
      }))
    : [];

  return {
    sourceTable,
    sourceColumns,
    refTable: {
      name: normalizeIdentifier(match[1]),
      offset: refTableOffset,
    },
    refColumns,
  };
}

function splitIdentifierList(input: string): Array<{ name: string; relativeOffset: number }> {
  const identifiers: Array<{ name: string; relativeOffset: number }> = [];
  let searchFrom = 0;

  for (const rawToken of input.split(",")) {
    const token = rawToken.trim();
    if (token) {
      const relativeOffset = input.indexOf(token, searchFrom);
      identifiers.push({
        name: token,
        relativeOffset: relativeOffset >= 0 ? relativeOffset : searchFrom,
      });
    }
    searchFrom += rawToken.length + 1;
  }

  return identifiers;
}

function formatColumnList(table: SemanticTable): string {
  const columns = [...table.columns.values()].map((column) => column.name).slice(0, 8);
  if (table.columns.size > columns.length) {
    columns.push("...");
  }
  return columns.join(", ");
}

function splitStatementsWithIssues(input: string): SplitResult {
  const statements: StatementRange[] = [];
  const issues: DdlSyntaxIssue[] = [];
  let current = "";
  let statementStart = 0;
  let depth = 0;
  let quote: "'" | "\"" | "`" | null = null;
  let quoteStart = 0;
  let bracketQuoteStart: number | null = null;
  let blockCommentStart: number | null = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (blockCommentStart !== null) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        index += 1;
        blockCommentStart = null;
      }
      continue;
    }

    if (quote) {
      current += char;
      if (char === quote && next === quote) {
        current += next;
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (bracketQuoteStart !== null) {
      current += char;
      if (char === "]") {
        bracketQuoteStart = null;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      const end = input.indexOf("\n", index);
      if (end === -1) {
        current += input.slice(index);
        break;
      }
      current += input.slice(index, end + 1);
      index = end;
      continue;
    }

    if (char === "/" && next === "*") {
      blockCommentStart = index;
      current += char;
      continue;
    }

    if (char === "'" || char === "\"" || char === "`") {
      quote = char;
      quoteStart = index;
      current += char;
      continue;
    }

    if (char === "[") {
      bracketQuoteStart = index;
      current += char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      if (depth === 0) {
        issues.push({
          severity: "error",
          ...positionAt(input, index),
          message: "닫는 괄호가 여는 괄호보다 많습니다.",
          hint: "불필요한 ')'가 있는지 확인해 주세요.",
        });
      } else {
        depth -= 1;
      }
      current += char;
      continue;
    }

    if (char === ";" && depth === 0) {
      if (current.trim()) {
        statements.push({ text: current, start: statementStart });
      }
      current = "";
      statementStart = index + 1;
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    statements.push({ text: current, start: statementStart });
  }

  if (quote) {
    issues.push({
      severity: "error",
      ...positionAt(input, quoteStart),
      message: "문자열 또는 quoted identifier가 닫히지 않았습니다.",
      hint: `${quote} 문자를 닫아 주세요.`,
    });
  }

  if (bracketQuoteStart !== null) {
    issues.push({
      severity: "error",
      ...positionAt(input, bracketQuoteStart),
      message: "대괄호 quoted identifier가 닫히지 않았습니다.",
      hint: "] 문자를 닫아 주세요.",
    });
  }

  if (blockCommentStart !== null) {
    issues.push({
      severity: "error",
      ...positionAt(input, blockCommentStart),
      message: "블록 주석이 닫히지 않았습니다.",
      hint: "*/ 로 주석을 닫아 주세요.",
    });
  }

  if (depth > 0) {
    issues.push({
      severity: "error",
      ...positionAt(input, input.length - 1),
      message: "여는 괄호가 닫히지 않았습니다.",
      hint: "CREATE TABLE의 컬럼 목록 또는 타입 괄호를 닫아 주세요.",
    });
  }

  return { statements, issues };
}

function splitTopLevelItems(body: string, bodyStart: number): StatementRange[] {
  const items: StatementRange[] = [];
  let current = "";
  let itemStart = bodyStart;
  let depth = 0;
  let quote: "'" | "\"" | "`" | null = null;
  let bracketQuote = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const next = body[index + 1];

    if (quote) {
      current += char;
      if (char === quote && next === quote) {
        current += next;
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (bracketQuote) {
      current += char;
      if (char === "]") {
        bracketQuote = false;
      }
      continue;
    }

    if (char === "'" || char === "\"" || char === "`") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "[") {
      bracketQuote = true;
      current += char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === "," && depth === 0) {
      items.push({ text: current, start: itemStart });
      current = "";
      itemStart = bodyStart + index + 1;
      continue;
    }

    current += char;
  }

  if (current.trim() || /,\s*$/.test(body)) {
    items.push({ text: current, start: itemStart });
  }

  return items;
}

function positionAt(input: string, offset: number): Pick<DdlSyntaxIssue, "line" | "column"> {
  const safeOffset = Math.max(0, Math.min(offset, input.length));
  const before = input.slice(0, safeOffset);
  const lines = before.split("\n");

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function extractFirstParenthesizedList(input: string): { raw: string; value: string } | null {
  const match = input.match(/\(([^)]*)\)/);
  if (!match) {
    return null;
  }

  return {
    raw: match[0],
    value: match[1],
  };
}

function removeParenthesizedSections(input: string): string {
  let output = "";
  let depth = 0;
  let quote: "'" | "\"" | "`" | null = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (quote) {
      if (depth === 0) {
        output += char;
      }
      if (char === quote && next === quote) {
        if (depth === 0) {
          output += next;
        }
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === "\"" || char === "`") {
      quote = char;
      if (depth === 0) {
        output += char;
      }
      continue;
    }

    if (char === "(") {
      depth += 1;
      output += " ";
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      output += " ";
      continue;
    }

    if (depth === 0) {
      output += char;
    }
  }

  return output;
}

function sortIssues(issues: DdlSyntaxIssue[]): DdlSyntaxIssue[] {
  return [...issues].sort((left, right) => {
    const leftOffset = left.offset ?? Number.MAX_SAFE_INTEGER;
    const rightOffset = right.offset ?? Number.MAX_SAFE_INTEGER;
    if (leftOffset !== rightOffset) {
      return leftOffset - rightOffset;
    }
    if (left.line !== right.line) {
      return left.line - right.line;
    }
    return left.column - right.column;
  });
}

function dedupeIssues(issues: DdlSyntaxIssue[]): DdlSyntaxIssue[] {
  const seen = new Set<string>();
  const nextIssues: DdlSyntaxIssue[] = [];

  for (const issue of issues) {
    const key = `${issue.line}:${issue.column}:${issue.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    nextIssues.push(issue);
  }

  return nextIssues;
}

function dialectLabel(dialect: Dialect): string {
  if (dialect === "postgresql") {
    return "PostgreSQL";
  }
  if (dialect === "mysql") {
    return "MySQL";
  }
  return "H2";
}

function identifierHint(dialect: Dialect): string {
  if (dialect === "mysql") {
    return "MySQL 모드에서는 unquoted identifier는 영문/숫자/_/$만 사용하고, 특수 문자나 한글은 `name`처럼 backtick으로 감싸세요.";
  }

  if (dialect === "h2") {
    return "H2 모드에서는 unquoted identifier는 영문/숫자/_/$만 사용하고, 특수 문자나 한글은 \"name\"처럼 double quote로 감싸세요.";
  }

  return "PostgreSQL 모드에서는 unquoted identifier는 영문/숫자/_/$만 사용하고, 특수 문자나 한글은 \"name\"처럼 double quote로 감싸세요.";
}


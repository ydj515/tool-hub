import { normalizeIdentifier, extractParenBody } from "@/lib/ddl-utils";
import type {
  ColumnKind,
  ColumnReference,
  ColumnSchema,
  ForeignKey,
  ParseResult,
  TableSchema,
} from "@/lib/types";

const CONSTRAINT_KEYWORDS = [
  "not",
  "null",
  "default",
  "primary",
  "references",
  "unique",
  "check",
  "constraint",
  "collate",
  "generated",
  "identity",
  "auto_increment",
  "comment",
  "on",
];

export function parseDdl(input: string): ParseResult {
  const warnings: string[] = [];
  const statements = splitSqlStatements(stripComments(input));
  const tables: TableSchema[] = [];
  const pendingAlterFKs: Array<{ tableName: string; foreignKey: ForeignKey }> = [];

  for (const statement of statements) {
    if (/^\s*create\s/i.test(statement)) {
      const table = parseCreateTable(statement, warnings);
      if (table) {
        tables.push(table);
      }
    } else if (/^\s*alter\s+table\s/i.test(statement)) {
      const result = parseAlterTableForeignKey(statement);
      if (result) {
        pendingAlterFKs.push(result);
      }
    }
  }

  if (tables.length === 0) {
    warnings.push("CREATE TABLE 문을 찾지 못했습니다.");
  }

  const tableMap = new Map(tables.map((table) => [table.name.toLowerCase(), table]));

  for (const { tableName, foreignKey } of pendingAlterFKs) {
    const table = findTableByRef(tableMap, tableName);
    if (!table) {
      warnings.push(`ALTER TABLE FK의 대상 테이블 ${tableName}을 찾지 못했습니다.`);
      continue;
    }
    table.foreignKeys.push(foreignKey);
    for (const columnName of foreignKey.columns) {
      const column = table.columns.find((c) => sameIdentifier(c.name, columnName));
      if (column && !column.reference) {
        column.reference = { table: foreignKey.refTable, columns: foreignKey.refColumns };
      }
    }
  }

  for (const table of tables) {
    for (const foreignKey of table.foreignKeys) {
      const parent = findTableByRef(tableMap, foreignKey.refTable);
      if (!parent) {
        warnings.push(`${table.name}.${foreignKey.columns.join(", ")} FK가 참조하는 ${foreignKey.refTable} 테이블을 찾지 못했습니다.`);
        continue;
      }

      if (foreignKey.refColumns.length === 0) {
        foreignKey.refColumns = parent.primaryKey.length > 0 ? [...parent.primaryKey] : ["id"];
      }
    }
  }

  return { tables, warnings };
}

function parseCreateTable(statement: string, warnings: string[]): TableSchema | null {
  const headerMatch = statement.match(
    /create\s+(?:temporary\s+|temp\s+)?table\s+(?:if\s+not\s+exists\s+)?((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.])+)\s*\(/i,
  );

  if (!headerMatch || headerMatch.index === undefined) {
    return null;
  }

  const tableName = normalizeIdentifier(headerMatch[1]);
  const openParenIndex = headerMatch.index + headerMatch[0].length - 1;
  const rawBody = extractParenBody(statement, openParenIndex);
  if (rawBody === null) return null;
  const body = rawBody.trim();
  const items = splitTopLevel(body, ",");
  const columns: ColumnSchema[] = [];
  const foreignKeys: ForeignKey[] = [];
  const uniqueColumns: string[] = [];
  let primaryKey: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }

    const constraint = stripConstraintPrefix(trimmed);
    const lower = constraint.toLowerCase();

    if (lower.startsWith("primary key")) {
      primaryKey = parseColumnList(constraint);
      continue;
    }

    if (lower.startsWith("foreign key")) {
      const foreignKey = parseTableForeignKey(trimmed);
      if (foreignKey) {
        foreignKeys.push(foreignKey);
      } else {
        warnings.push(`${tableName} 테이블의 FK 제약을 해석하지 못했습니다: ${trimmed}`);
      }
      continue;
    }

    if (lower.startsWith("unique")) {
      uniqueColumns.push(...parseColumnList(constraint));
      continue;
    }

    if (lower.startsWith("check")) {
      continue;
    }

    const column = parseColumn(trimmed, warnings, tableName);
    if (column) {
      columns.push(column);
      if (column.primaryKey && !primaryKey.includes(column.name)) {
        primaryKey.push(column.name);
      }
      if (column.reference) {
        foreignKeys.push({
          columns: [column.name],
          refTable: column.reference.table,
          refColumns: column.reference.columns,
        });
      }
    }
  }

  for (const pkColumn of primaryKey) {
    const column = columns.find((item) => sameIdentifier(item.name, pkColumn));
    if (column) {
      column.primaryKey = true;
      column.nullable = false;
    }
  }

  for (const uniqueColumn of uniqueColumns) {
    const column = columns.find((item) => sameIdentifier(item.name, uniqueColumn));
    if (column) {
      column.unique = true;
    }
  }

  for (const foreignKey of foreignKeys) {
    for (const columnName of foreignKey.columns) {
      const column = columns.find((item) => sameIdentifier(item.name, columnName));
      if (column) {
        column.reference = {
          table: foreignKey.refTable,
          columns: foreignKey.refColumns,
        };
      }
    }
  }

  return {
    name: tableName,
    columns,
    primaryKey,
    foreignKeys,
  };
}

function parseColumn(definition: string, warnings: string[], tableName: string): ColumnSchema | null {
  const nameMatch = definition.match(/^\s*("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)\s+([\s\S]*)$/);
  if (!nameMatch) {
    warnings.push(`${tableName} 테이블의 컬럼 정의를 해석하지 못했습니다: ${definition}`);
    return null;
  }

  const name = normalizeIdentifier(nameMatch[1]);
  const rest = nameMatch[2].trim();
  const { typePart, constraintPart } = splitColumnTypeAndConstraints(rest);
  const rawType = typePart.trim();
  const lowerType = rawType.toLowerCase();
  const enumValues = parseEnumValues(rawType) ?? parseCheckInValues(constraintPart, name);
  const columnReference = parseInlineReference(constraintPart);

  return {
    name,
    rawType,
    kind: inferColumnKind(rawType),
    ...parseTypeShape(rawType),
    nullable: !/\bnot\s+null\b/i.test(constraintPart) && !/\bprimary\s+key\b/i.test(constraintPart),
    primaryKey: /\bprimary\s+key\b/i.test(constraintPart),
    unique: /\bunique\b/i.test(constraintPart),
    autoIncrement:
      /\b(auto_increment|autoincrement|identity)\b/i.test(constraintPart) ||
      /\b(bigserial|serial|smallserial|identity)\b/i.test(lowerType),
    computed: /\bgenerated\s+always\s+as\s*\(/i.test(constraintPart),
    generatedAlwaysAsIdentity: /\bgenerated\s+always\s+as\s+identity\b/i.test(constraintPart),
    defaultValue: parseDefaultValue(constraintPart),
    enumValues,
    reference: columnReference,
  };
}

function parseTableForeignKey(definition: string): ForeignKey | null {
  const constraintName = definition.match(/^\s*constraint\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)/i)?.[1];
  const normalized = stripConstraintPrefix(definition);
  const match = normalized.match(
    /^foreign\s+key\s*\(([^)]+)\)\s+references\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.])+)\s*(?:\(([^)]+)\))?/i,
  );

  if (!match) {
    return null;
  }

  return {
    name: constraintName ? normalizeIdentifier(constraintName) : undefined,
    columns: parseIdentifierList(match[1]),
    refTable: normalizeIdentifier(match[2]),
    refColumns: match[3] ? parseIdentifierList(match[3]) : [],
  };
}

function parseInlineReference(input: string): ColumnReference | undefined {
  const match = input.match(
    /\breferences\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.])+)\s*(?:\(([^)]+)\))?/i,
  );

  if (!match) {
    return undefined;
  }

  return {
    table: normalizeIdentifier(match[1]),
    columns: match[2] ? parseIdentifierList(match[2]) : [],
  };
}

function stripComments(input: string): string {
  let output = "";
  let quote: "'" | '"' | "`" | null = null;
  let bracketQuote = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];
    const next = input[i + 1];

    if (quote !== null) {
      output += char;
      if (char === quote && next === quote) {
        output += next;
        i += 2;
      } else if (char === quote) {
        quote = null;
        i++;
      } else {
        i++;
      }
      continue;
    }

    if (bracketQuote) {
      output += char;
      if (char === "]") bracketQuote = false;
      i++;
      continue;
    }

    if (char === "-" && next === "-") {
      i += 2;
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }

    if (char === "/" && next === "*") {
      i += 2;
      while (i < input.length) {
        if (input[i] === "*" && input[i + 1] === "/") { i += 2; break; }
        i++;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      output += char;
      i++;
      continue;
    }

    if (char === "[") {
      bracketQuote = true;
      output += char;
      i++;
      continue;
    }

    output += char;
    i++;
  }

  return output;
}

function splitSqlStatements(input: string): string[] {
  return splitTopLevel(input, ";").map((statement) => statement.trim()).filter(Boolean);
}

function splitTopLevel(input: string, delimiter: "," | ";"): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote: "'" | "\"" | "`" | null = null;
  let bracketQuote = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (quote) {
      current += char;
      if (char === quote && next === quote) {
        current += next;
        i += 1;
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

    if (char === delimiter && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

function stripConstraintPrefix(input: string): string {
  return input
    .trim()
    .replace(/^constraint\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)\s+/i, "")
    .trim();
}

function splitColumnTypeAndConstraints(rest: string): { typePart: string; constraintPart: string } {
  let depth = 0;
  let quote: "'" | "\"" | "`" | null = null;
  let bracketQuote = false;

  for (let i = 0; i < rest.length; i += 1) {
    const char = rest[i];
    const next = rest[i + 1];

    if (quote) {
      if (char === quote && next === quote) {
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (bracketQuote) {
      if (char === "]") {
        bracketQuote = false;
      }
      continue;
    }

    if (char === "'" || char === "\"" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "[") {
      bracketQuote = true;
      continue;
    }

    if (char === "(") {
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth === 0 && /\s/.test(char)) {
      const nextWord = rest.slice(i).trimStart().match(/^([A-Za-z_][\w$]*)\b/);
      if (nextWord && CONSTRAINT_KEYWORDS.includes(nextWord[1].toLowerCase())) {
        const splitAt = rest.indexOf(nextWord[1], i);
        return {
          typePart: rest.slice(0, splitAt).trim(),
          constraintPart: rest.slice(splitAt).trim(),
        };
      }
    }
  }

  return { typePart: rest.trim(), constraintPart: "" };
}

function inferColumnKind(rawType: string): ColumnKind {
  const type = rawType.toLowerCase();

  if (/\b(uuid)\b/.test(type)) {
    return "uuid";
  }
  if (/\b(jsonb?|xml)\b/.test(type)) {
    return "json";
  }
  if (/\b(bytea|blob|binary|varbinary)\b/.test(type)) {
    return "binary";
  }
  if (/\b(bool|boolean)\b/.test(type) || /tinyint\s*\(\s*1\s*\)/.test(type)) {
    return "boolean";
  }
  if (/\b(timestamp|datetime|time)\b/.test(type)) {
    return "datetime";
  }
  if (/\bdate\b/.test(type)) {
    return "date";
  }
  if (/\b(decimal|numeric|number|float|double|real|money)\b/.test(type)) {
    return "decimal";
  }
  if (/\b(bigint|int8|integer|int|int4|smallint|int2|tinyint|serial|bigserial|smallserial|identity)\b/.test(type)) {
    return "integer";
  }

  return "string";
}

function parseTypeShape(rawType: string): Partial<Pick<ColumnSchema, "length" | "precision" | "scale">> {
  const match = rawType.match(/\(([^)]+)\)/);
  if (!match) {
    return {};
  }

  const numbers = match[1]
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));

  if (numbers.length === 1) {
    return { length: numbers[0], precision: numbers[0] };
  }

  if (numbers.length >= 2) {
    return { precision: numbers[0], scale: numbers[1] };
  }

  return {};
}

function parseDefaultValue(input: string): string | undefined {
  const defaultMatch = input.match(/\bdefault\s+/i);
  if (!defaultMatch || defaultMatch.index === undefined) return undefined;

  const rest = input.slice(defaultMatch.index + defaultMatch[0].length);
  if (!rest) return undefined;

  const first = rest[0];

  if (first === "'") {
    let i = 1;
    while (i < rest.length) {
      if (rest[i] === "'" && rest[i + 1] === "'") { i += 2; continue; }
      if (rest[i] === "'") return rest.slice(0, i + 1);
      i++;
    }
    return rest;
  }

  if (first === '"') {
    let i = 1;
    while (i < rest.length) {
      if (rest[i] === '"' && rest[i + 1] === '"') { i += 2; continue; }
      if (rest[i] === '"') return rest.slice(0, i + 1);
      i++;
    }
    return rest;
  }

  let depth = 0;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (c === "(") { depth++; continue; }
    if (c === ")") {
      if (depth === 0) return rest.slice(0, i).trim() || undefined;
      depth--;
      continue;
    }
    if (depth === 0 && (c === "," || /\s/.test(c))) {
      return rest.slice(0, i).trim() || undefined;
    }
  }

  return rest.trim() || undefined;
}

function parseEnumValues(rawType: string): string[] | undefined {
  const match = rawType.match(/\benum\s*\(([\s\S]+)\)/i);
  if (!match) {
    return undefined;
  }

  return splitTopLevel(match[1], ",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function parseCheckInValues(input: string, columnName: string): string[] | undefined {
  const escapedName = columnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = input.match(new RegExp(`\\b${escapedName}\\b\\s+in\\s*\\(([^)]+)\\)`, "i"));

  if (!match) {
    return undefined;
  }

  return splitTopLevel(match[1], ",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function parseColumnList(input: string): string[] {
  const match = input.match(/\(([^)]+)\)/);
  return match ? parseIdentifierList(match[1]) : [];
}

function parseIdentifierList(input: string): string[] {
  return splitTopLevel(input, ",").map((part) => normalizeIdentifier(part.trim())).filter(Boolean);
}

function sameIdentifier(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function findTableByRef(tableMap: Map<string, TableSchema>, refTable: string): TableSchema | undefined {
  const exact = tableMap.get(refTable.toLowerCase());
  if (exact) {
    return exact;
  }
  const tablePart = refTable.split(".").pop()?.toLowerCase();
  if (!tablePart) {
    return undefined;
  }
  for (const [key, table] of tableMap) {
    if (key === tablePart || key.split(".").pop() === tablePart) {
      return table;
    }
  }
  return undefined;
}

const ALTER_TABLE_FK_PATTERN =
  /alter\s+table\s+(?:if\s+exists\s+)?((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)+)\s+add\s+(?:constraint\s+(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)\s+)?foreign\s+key\s*\(([^)]+)\)\s+references\s+((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w.]+)+)\s*(?:\(([^)]+)\))?/i;

function parseAlterTableForeignKey(
  statement: string,
): { tableName: string; foreignKey: ForeignKey } | null {
  const match = statement.match(ALTER_TABLE_FK_PATTERN);
  if (!match) {
    return null;
  }

  const constraintNameMatch = statement.match(
    /add\s+constraint\s+("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_][\w$]*)\s+foreign/i,
  );

  return {
    tableName: normalizeIdentifier(match[1]),
    foreignKey: {
      name: constraintNameMatch ? normalizeIdentifier(constraintNameMatch[1]) : undefined,
      columns: parseIdentifierList(match[2]),
      refTable: normalizeIdentifier(match[3]),
      refColumns: match[4] ? parseIdentifierList(match[4]) : [],
    },
  };
}

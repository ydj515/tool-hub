import { fakerKO, fakerEN } from "@faker-js/faker";
import type { Faker } from "@faker-js/faker";

import type { AnalysisResult, ColumnSchema, GeneratedTable, GenerationOptions, SqlValue, TableSchema } from "@/lib/types";

const STATUS_VALUES = ["active", "pending", "disabled", "archived"];
const ROLE_VALUES = ["admin", "manager", "member", "viewer"];
const CATEGORY_VALUES = ["standard", "premium", "trial", "internal"];

export function generateFakeData(analysis: AnalysisResult, options: GenerationOptions): GeneratedTable[] {
  const f: Faker = options.locale === "ko" ? fakerKO : fakerEN;
  f.seed(options.seed);

  const orderedTables = analysis.insertOrder
    .map((tableName) => analysis.tables.find((table) => table.name === tableName))
    .filter((table): table is TableSchema => Boolean(table));
  const generatedTables = orderedTables.map((table) => ({
    table,
    rows: Array.from({ length: options.rowCount }, (_, rowIndex) => generateBaseRow(table, rowIndex, options, f)),
  }));
  const rowsByTable = new Map(generatedTables.map((item) => [item.table.name.toLowerCase(), item.rows]));
  const tableByName = new Map(generatedTables.map((item) => [item.table.name.toLowerCase(), item.table]));

  for (const generatedTable of generatedTables) {
    for (const foreignKey of generatedTable.table.foreignKeys) {
      const parentRows = rowsByTable.get(foreignKey.refTable.toLowerCase());
      const parentTable = tableByName.get(foreignKey.refTable.toLowerCase());

      if (!parentRows || parentRows.length === 0 || !parentTable) {
        continue;
      }

      const refColumns = foreignKey.refColumns.length > 0 ? foreignKey.refColumns : parentTable.primaryKey;
      generatedTable.rows.forEach((row, rowIndex) => {
        const selfReference = generatedTable.table.name.toLowerCase() === parentTable.name.toLowerCase();
        const useNullableSelfRoot =
          selfReference &&
          areForeignKeyColumnsNullable(generatedTable.table, foreignKey.columns) &&
          (rowIndex === 0 || rowIndex % 7 === 0);
        const parentRow = selfReference
          ? parentRows[selfParentIndex(rowIndex, parentRows.length)]
          : parentRows[rowIndex % parentRows.length];

        foreignKey.columns.forEach((columnName, columnIndex) => {
          if (useNullableSelfRoot) {
            row[columnName] = null;
            return;
          }

          const refColumnName = refColumns[columnIndex] ?? refColumns[0] ?? "id";
          row[columnName] = parentRow[refColumnName] ?? parentRow[findFirstPrimaryKey(parentTable)] ?? rowIndex + 1;
        });
      });
    }
  }

  return generatedTables;
}

function generateBaseRow(table: TableSchema, rowIndex: number, options: GenerationOptions, f: Faker): Record<string, SqlValue> {
  return Object.fromEntries(
    table.columns.map((column) => [column.name, generateColumnValue(column, table, rowIndex, options, f)]),
  );
}

function generateColumnValue(
  column: ColumnSchema,
  table: TableSchema,
  rowIndex: number,
  options: GenerationOptions,
  f: Faker,
): SqlValue {
  if (column.computed) {
    return null;
  }

  if (column.primaryKey) {
    return generatePrimaryKey(column, table, rowIndex, f);
  }

  if (column.reference) {
    return null;
  }

  if (column.enumValues && column.enumValues.length > 0) {
    return column.enumValues[rowIndex % column.enumValues.length];
  }

  if (options.includeBoundaryValues) {
    const boundary = boundaryValue(column, rowIndex);
    if (boundary !== undefined) {
      return boundary;
    }
  }

  if (column.nullable && shouldUseNull(column, rowIndex)) {
    return null;
  }

  return realisticValue(column, table.name, rowIndex, f);
}

function generatePrimaryKey(column: ColumnSchema, table: TableSchema, rowIndex: number, f: Faker): SqlValue {
  if (column.kind === "uuid") {
    return f.string.uuid();
  }

  if (column.kind === "string") {
    return fitString(`${slugify(table.name)}_${rowIndex + 1}`, column.length ?? 48);
  }

  if (column.kind === "decimal") {
    return rowIndex + 1;
  }

  return rowIndex + 1;
}

function boundaryValue(column: ColumnSchema, rowIndex: number): SqlValue | undefined {
  if (column.primaryKey || column.reference) {
    return undefined;
  }

  if (column.nullable && rowIndex === 0) {
    return null;
  }

  if (column.kind === "string") {
    if (rowIndex === 1) {
      return fitString("A", column.length ?? 1);
    }
    if (rowIndex === 2) {
      return fitString("가나다 ABC 123 !@#", column.length ?? 64);
    }
    if (rowIndex === 3 && column.length) {
      return fitString("X".repeat(column.length), column.length);
    }
  }

  if (column.kind === "integer") {
    if (rowIndex === 1) {
      return 0;
    }
    if (rowIndex === 2 && !/\bunsigned\b/i.test(column.rawType)) {
      return -1;
    }
    if (rowIndex === 3) {
      return integerUpperBound(column.rawType);
    }
  }

  if (column.kind === "decimal") {
    if (rowIndex === 1) {
      return 0;
    }
    if (rowIndex === 2 && !/\bunsigned\b/i.test(column.rawType)) {
      return -1;
    }
    if (rowIndex === 3) {
      return decimalUpperBound(column);
    }
  }

  if (column.kind === "date") {
    if (rowIndex === 1) {
      return "1970-01-01";
    }
    if (rowIndex === 2) {
      return "2024-02-29";
    }
  }

  if (column.kind === "datetime") {
    if (rowIndex === 1) {
      return "1970-01-01 00:00:00";
    }
    if (rowIndex === 2) {
      return "2024-02-29 23:59:59";
    }
  }

  if (column.kind === "boolean" && rowIndex <= 2) {
    return rowIndex % 2 === 0;
  }

  return undefined;
}

function realisticValue(column: ColumnSchema, tableName: string, rowIndex: number, f: Faker): SqlValue {
  const name = column.name.toLowerCase();
  const table = tableName.toLowerCase();

  if (column.unique) {
    return uniqueValue(column, tableName, rowIndex, f);
  }

  if (column.kind === "uuid") {
    return f.string.uuid();
  }

  if (column.kind === "boolean") {
    return f.datatype.boolean();
  }

  if (column.kind === "date") {
    return formatDate(f.date.between({ from: "2020-01-01", to: "2026-12-31" }));
  }

  if (column.kind === "datetime") {
    if (name.includes("created")) {
      return formatDateTime(f.date.between({ from: "2021-01-01", to: "2026-04-27" }));
    }
    if (name.includes("updated")) {
      return formatDateTime(f.date.between({ from: "2024-01-01", to: "2026-04-27" }));
    }
    if (name.includes("deleted") && column.nullable) {
      return rowIndex % 8 === 0 ? formatDateTime(f.date.between({ from: "2024-01-01", to: "2026-04-27" })) : null;
    }
    return formatDateTime(f.date.between({ from: "2020-01-01", to: "2026-12-31" }));
  }

  if (column.kind === "integer") {
    return integerValue(column, name, f);
  }

  if (column.kind === "decimal") {
    return decimalValue(column, name, f);
  }

  if (column.kind === "json") {
    return JSON.stringify({
      source: "ddl-seed-generator",
      key: f.string.alphanumeric(8),
      enabled: f.datatype.boolean(),
    });
  }

  if (column.kind === "binary") {
    return f.string.hexadecimal({ length: 16, prefix: "" });
  }

  if (name.includes("email")) {
    return fitString(f.internet.email({ provider: "example.test" }).toLowerCase(), column.length ?? 120);
  }
  if (name.includes("phone") || name.includes("mobile") || name.includes("tel")) {
    return fitString(f.phone.number({ style: "national" }), column.length ?? 32);
  }
  if (name === "name" || name.endsWith("_name") || name.includes("full_name")) {
    return fitString(f.person.fullName(), column.length ?? 80);
  }
  if (name.includes("first_name")) {
    return fitString(f.person.firstName(), column.length ?? 40);
  }
  if (name.includes("last_name")) {
    return fitString(f.person.lastName(), column.length ?? 40);
  }
  if (name.includes("username") || name.includes("login")) {
    return fitString(f.internet.username(), column.length ?? 40);
  }
  if (name.includes("password")) {
    return fitString(f.internet.password({ length: Math.min(column.length ?? 24, 32) }), column.length ?? 80);
  }
  if (name.includes("address")) {
    return fitString(f.location.streetAddress(), column.length ?? 160);
  }
  if (name.includes("city")) {
    return fitString(f.location.city(), column.length ?? 80);
  }
  if (name.includes("country")) {
    return fitString(f.location.country(), column.length ?? 80);
  }
  if (name.includes("zip") || name.includes("postal")) {
    return fitString(f.location.zipCode(), column.length ?? 20);
  }
  if (name.includes("url") || name.includes("link")) {
    return fitString(f.internet.url(), column.length ?? 200);
  }
  if (name.includes("company") || table.includes("company")) {
    return fitString(f.company.name(), column.length ?? 120);
  }
  if (name.includes("title") || name.includes("subject")) {
    return fitString(f.lorem.sentence({ min: 3, max: 8 }), column.length ?? 140);
  }
  if (name.includes("description") || name.includes("content") || name.includes("memo")) {
    return fitString(f.lorem.paragraph(), column.length ?? 500);
  }
  if (name.includes("status")) {
    return fitString(STATUS_VALUES[rowIndex % STATUS_VALUES.length], column.length ?? 32);
  }
  if (name.includes("role")) {
    return fitString(ROLE_VALUES[rowIndex % ROLE_VALUES.length], column.length ?? 32);
  }
  if (name.includes("type") || name.includes("category")) {
    return fitString(CATEGORY_VALUES[rowIndex % CATEGORY_VALUES.length], column.length ?? 48);
  }
  if (name.includes("code")) {
    return fitString(`${slugify(tableName).slice(0, 4).toUpperCase()}-${String(rowIndex + 1).padStart(5, "0")}`, column.length ?? 32);
  }

  return fitString(f.lorem.words({ min: 1, max: 4 }), column.length ?? 80);
}

function uniqueValue(column: ColumnSchema, tableName: string, rowIndex: number, f: Faker): SqlValue {
  const name = column.name.toLowerCase();
  const prefix = slugify(tableName);

  if (column.kind === "integer" || column.kind === "decimal") {
    return rowIndex + 1;
  }

  if (column.kind === "uuid") {
    return f.string.uuid();
  }

  if (name.includes("email")) {
    return fitString(`${prefix}.${rowIndex + 1}@example.test`, column.length ?? 120);
  }

  return fitString(`${prefix}_${slugify(column.name)}_${rowIndex + 1}`, column.length ?? 80);
}

function integerValue(column: ColumnSchema, name: string, f: Faker): number {
  if (name.includes("age")) {
    return f.number.int({ min: 1, max: 99 });
  }
  if (name.includes("count") || name.includes("quantity") || name.includes("qty")) {
    return f.number.int({ min: 0, max: 5000 });
  }
  if (name.includes("year")) {
    return f.number.int({ min: 1990, max: 2026 });
  }
  if (name.includes("month")) {
    return f.number.int({ min: 1, max: 12 });
  }
  if (name.includes("day")) {
    return f.number.int({ min: 1, max: 31 });
  }

  return f.number.int({ min: 1, max: Math.min(integerUpperBound(column.rawType), 1000000) });
}

function decimalValue(column: ColumnSchema, name: string, f: Faker): number {
  const scale = Math.min(column.scale ?? 2, 6);
  const max = name.includes("rate") || name.includes("ratio") ? 1 : Math.min(decimalUpperBound(column), 100000);
  return Number(f.number.float({ min: 0, max, fractionDigits: scale }).toFixed(scale));
}

function integerUpperBound(rawType: string): number {
  const type = rawType.toLowerCase();
  if (type.includes("tinyint")) {
    return 127;
  }
  if (type.includes("smallint") || type.includes("int2")) {
    return 32767;
  }
  if (type.includes("bigint") || type.includes("int8")) {
    return Number.MAX_SAFE_INTEGER;
  }
  return 2147483647;
}

function decimalUpperBound(column: ColumnSchema): number {
  const precision = Math.min(column.precision ?? 10, 15);
  const scale = Math.min(column.scale ?? 2, precision);
  const wholeDigits = Math.max(1, precision - scale);
  const whole = Number("9".repeat(Math.min(wholeDigits, 12)));
  return scale > 0 ? Number(`${whole}.${"9".repeat(scale)}`) : whole;
}

function shouldUseNull(column: ColumnSchema, rowIndex: number): boolean {
  if (column.primaryKey || column.unique || column.reference) {
    return false;
  }
  return rowIndex > 5 && rowIndex % 13 === 0;
}

function findFirstPrimaryKey(table: TableSchema): string {
  return table.primaryKey[0] ?? table.columns[0]?.name ?? "id";
}

function areForeignKeyColumnsNullable(table: TableSchema, columnNames: string[]): boolean {
  return columnNames.every((columnName) => {
    const column = table.columns.find((item) => item.name.toLowerCase() === columnName.toLowerCase());
    return column?.nullable ?? false;
  });
}

function selfParentIndex(rowIndex: number, rowCount: number): number {
  if (rowCount <= 1 || rowIndex === 0) {
    return 0;
  }

  return Math.min(Math.floor((rowIndex - 1) / 3), rowCount - 1);
}

function fitString(value: string, maxLength: number): string {
  if (maxLength <= 0) {
    return "";
  }
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "seed";
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

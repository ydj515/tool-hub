import { describe, expect, it } from "vitest";
import { analyzeSchema } from "@/lib/graph";
import type { TableSchema } from "@/lib/types";

function createTable(name: string, foreignKeys: TableSchema["foreignKeys"] = []): TableSchema {
  return {
    name,
    columns: [
      {
        name: "id",
        rawType: "bigint",
        kind: "integer",
        nullable: false,
        primaryKey: true,
        unique: true,
        autoIncrement: false,
        computed: false,
        generatedAlwaysAsIdentity: false,
      },
    ],
    primaryKey: ["id"],
    foreignKeys,
  };
}

describe("analyzeSchema", () => {
  it("orders parent tables before child tables", () => {
    const parent = createTable("parent");
    const child = createTable("child", [
      {
        columns: ["parent_id"],
        refTable: "parent",
        refColumns: ["id"],
      },
    ]);

    const result = analyzeSchema([child, parent], []);

    expect(result.insertOrder).toEqual(["parent", "child"]);
    expect(result.cycleGroups).toEqual([]);
  });

  it("ignores nullable self references as cycles", () => {
    const selfRef = {
      name: "employee",
      columns: [
        {
          name: "id",
          rawType: "bigint",
          kind: "integer",
          nullable: false,
          primaryKey: true,
          unique: true,
          autoIncrement: false,
          computed: false,
          generatedAlwaysAsIdentity: false,
        },
        {
          name: "manager_id",
          rawType: "bigint",
          kind: "integer",
          nullable: true,
          primaryKey: false,
          unique: false,
          autoIncrement: false,
          computed: false,
          generatedAlwaysAsIdentity: false,
        },
      ],
      primaryKey: ["id"],
      foreignKeys: [
        {
          columns: ["manager_id"],
          refTable: "employee",
          refColumns: ["id"],
        },
      ],
    } satisfies TableSchema;

    const result = analyzeSchema([selfRef], []);

    expect(result.insertOrder).toEqual(["employee"]);
    expect(result.cycleGroups).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { computeDiff } from "./differ";
import type { ConfigFile, ConfigValue } from "./types";

function createValue(
  key: string,
  rawValue: string,
  valueType: ConfigValue["valueType"],
): ConfigValue {
  return {
    key,
    value: rawValue,
    valueType,
    rawValue,
    isPlaceholder: false,
    isSensitiveCandidate: false,
  };
}

function createFile(flattened: ConfigFile["flattened"]): ConfigFile {
  return {
    id: "file",
    filename: "sample.yml",
    format: "yaml",
    rawContent: "",
    parsed: {},
    flattened,
    parseErrors: [],
  };
}

describe("computeDiff", () => {
  it("classifies added, removed, changed, type-changed, and unchanged keys", () => {
    const fileA = createFile({
      unchanged: createValue("unchanged", "true", "boolean"),
      removed: createValue("removed", "left", "string"),
      changed: createValue("changed", "100", "number"),
      typed: createValue("typed", "true", "boolean"),
    });
    const fileB = createFile({
      unchanged: createValue("unchanged", "true", "boolean"),
      added: createValue("added", "right", "string"),
      changed: createValue("changed", "200", "number"),
      typed: createValue("typed", "1", "number"),
    });

    const result = computeDiff(fileA, fileB);
    const byKey = Object.fromEntries(result.map((item) => [item.key, item.status]));

    expect(result.map((item) => item.key)).toEqual(["added", "changed", "removed", "typed", "unchanged"]);
    expect(byKey).toEqual({
      added: "ADDED",
      changed: "CHANGED",
      removed: "REMOVED",
      typed: "TYPE_CHANGED",
      unchanged: "UNCHANGED",
    });
  });
});

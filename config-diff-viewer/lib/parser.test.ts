import { describe, expect, it } from "vitest";
import { parseConfigFile } from "./parser";

describe("YAML parser compatibility", () => {
  it("preserves merge keys and YAML 1.2 scalar resolution", () => {
    const result = parseConfigFile(
      "defaults: &defaults\n  retries: 3\nservice:\n  <<: *defaults\n  enabled: true\n  label: yes\n",
      "config.yaml",
    );

    expect(result.parseErrors).toEqual([]);
    expect(result.parsed.service).toEqual({ retries: 3, enabled: true, label: "yes" });
    expect(result.flattened["service.retries"].value).toBe(3);
  });

  it("preserves timestamp and binary tags from the previous default schema", () => {
    const result = parseConfigFile("date: 2026-01-02\ndata: !!binary SGVsbG8=\n", "config.yaml");

    expect(result.parseErrors).toEqual([]);
    expect(result.parsed.date).toEqual(new Date("2026-01-02T00:00:00.000Z"));
    expect(result.parsed.data).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it("reports invalid YAML with its source line", () => {
    const result = parseConfigFile("service:\n  value: [\n", "config.yaml");

    expect(result.parseErrors).toHaveLength(1);
    expect(result.parseErrors[0].line).toBeGreaterThan(1);
    expect(result.parsed).toEqual({});
  });
});

import type { ConfigFile, DiffResult } from "./types";

export function computeDiff(fileA: ConfigFile, fileB: ConfigFile): DiffResult[] {
  const keysA = new Set(Object.keys(fileA.flattened));
  const keysB = new Set(Object.keys(fileB.flattened));
  const allKeys = new Set([...keysA, ...keysB]);
  const results: DiffResult[] = [];

  for (const key of allKeys) {
    const valA = fileA.flattened[key] ?? null;
    const valB = fileB.flattened[key] ?? null;

    let status: DiffResult["status"];
    if (!valA) {
      status = "ADDED";
    } else if (!valB) {
      status = "REMOVED";
    } else if (valA.valueType !== valB.valueType) {
      status = "TYPE_CHANGED";
    } else if (valA.rawValue !== valB.rawValue) {
      status = "CHANGED";
    } else {
      status = "UNCHANGED";
    }

    results.push({ key, status, valueA: valA, valueB: valB });
  }

  return results.sort((a, b) => a.key.localeCompare(b.key));
}

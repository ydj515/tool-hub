/**
 * 두 설정 파일의 평탄화 결과를 비교해 diff 목록을 만든다.
 */
import type { ConfigFile, DiffResult } from "./types";

/**
 * 두 ConfigFile의 평탄화된 키-값 쌍을 비교해 DiffResult 배열을 반환한다.
 * 각 키에 대해 ADDED / REMOVED / TYPE_CHANGED / CHANGED / UNCHANGED 상태를 부여하며,
 * 결과는 키 알파벳 순으로 정렬된다.
 * @param fileA - 비교 기준 파일 (좌측)
 * @param fileB - 비교 대상 파일 (우측)
 * @returns 키별 diff 상태가 담긴 DiffResult[]
 */
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

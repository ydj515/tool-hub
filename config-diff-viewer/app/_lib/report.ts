import { parseConfigFile } from "@/lib/parser";
import { computeDiff } from "@/lib/differ";
import { detectSecrets } from "@/lib/detector";
import { validateConfig } from "@/lib/validator";
import { detectDuplicateKeys } from "@/lib/duplicate-detector";
import type { AnalysisOptions, ConfigFormat, ValidationReport } from "@/lib/types";

function buildReport(
  contentA: string, filenameA: string, formatA: ConfigFormat, envA: string,
  contentB: string, filenameB: string, formatB: ConfigFormat, envB: string,
  options: AnalysisOptions,
): ValidationReport {
  const fileA = parseConfigFile(contentA, filenameA, formatA);
  fileA.environment = envA;
  const fileB = parseConfigFile(contentB, filenameB, formatB);
  fileB.environment = envB;

  const diffResults = computeDiff(fileA, fileB);
  const allIssues = [
    ...(options.enableSecretDetection ? detectSecrets(fileA, envA) : []),
    ...(options.enableSecretDetection ? detectSecrets(fileB, envB) : []),
    ...(options.enableDangerousConfigDetection ? validateConfig(fileA, envA) : []),
    ...(options.enableDangerousConfigDetection ? validateConfig(fileB, envB) : []),
    ...(options.enableDuplicateKeyDetection ? detectDuplicateKeys(fileA, envA) : []),
    ...(options.enableDuplicateKeyDetection ? detectDuplicateKeys(fileB, envB) : []),
  ];

  const matched    = diffResults.filter((d) => d.status === "UNCHANGED").length;
  const changed    = diffResults.filter((d) => d.status === "CHANGED" || d.status === "TYPE_CHANGED").length;
  const missingInB = diffResults.filter((d) => d.status === "REMOVED").length;
  const missingInA = diffResults.filter((d) => d.status === "ADDED").length;
  const countBy    = (sev: string) => allIssues.filter((i) => i.severity === sev).length;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    fileA, fileB,
    summary: {
      totalKeys: diffResults.length, matchedKeys: matched, changedKeys: changed,
      missingInA, missingInB, totalIssues: allIssues.length,
      critical: countBy("CRITICAL"), high: countBy("HIGH"),
      medium: countBy("MEDIUM"), low: countBy("LOW"),
      status: countBy("CRITICAL") + countBy("HIGH") > 0 ? "FAILED" : "PASSED",
    },
    diffResults,
    issues: allIssues,
  };
}

export { buildReport };

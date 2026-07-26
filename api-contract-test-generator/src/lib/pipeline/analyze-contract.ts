import type { Diagnostic } from '../../domain/diagnostic';
import type { TestCaseSelection, TestPlan } from '../../domain/test-case';
import { generateTestPlan } from '../generation/test-plan-builder';
import { normalizeContract } from '../normalization/normalize-contract';
import { parseOpenApi } from '../parser/parse-openapi';

export type AnalyzeContractResult =
  | { ok: false; diagnostics: Diagnostic[] }
  | { ok: true; plan: TestPlan; selections: Record<string, TestCaseSelection>; partial: boolean };

export async function analyzeContract(raw: string, filename: string | undefined, seed: string): Promise<AnalyzeContractResult> {
  const parsed = parseOpenApi(raw, filename);
  if (!parsed.ok) return { ok: false, diagnostics: parsed.diagnostics };

  const normalized = normalizeContract(parsed.document, parsed.version);
  const diagnostics = [...parsed.diagnostics, ...normalized.diagnostics];
  if (diagnostics.some((diagnostic) => diagnostic.blocking)) return { ok: false, diagnostics };

  const generated = await generateTestPlan(normalized.contract, seed);
  if (parsed.diagnostics.length > 0) generated.plan.diagnostics.unshift(...parsed.diagnostics);
  return {
    ok: true,
    plan: generated.plan,
    selections: generated.selections,
    partial: generated.plan.diagnostics.length > 0,
  };
}

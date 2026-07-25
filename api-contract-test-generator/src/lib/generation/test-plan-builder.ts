import type { NormalizedContract } from '../../domain/contract';
import { createDiagnostic, type Diagnostic } from '../../domain/diagnostic';
import type {
  GeneratedTestCase,
  GenerationLimits,
  GenerationResult,
  TestCandidate,
  TestCaseSelection,
} from '../../domain/test-case';
import { sha256 } from '../hash/sha256';
import { buildBaselineRequest } from './baseline-builder';
import { generateRuleCandidates } from './rules';

const DEFAULT_LIMITS: GenerationLimits = { maxPerEndpoint: 200, maxTotal: 2000 };

async function candidateId(method: string, path: string, candidate: TestCandidate): Promise<string> {
  return sha256([
    method.toUpperCase(),
    path,
    candidate.sourcePointer,
    candidate.ruleId,
    candidate.variantId,
  ].join('|'));
}

function limitDiagnostic(message: string, sourcePointer: string): Diagnostic {
  return createDiagnostic('TEST_LIMIT_REACHED', message, {
    stage: 'generate', sourcePointer, severity: 'warning', blocking: false,
  });
}

export async function generateTestPlan(
  contract: NormalizedContract,
  seed: string,
  limits: GenerationLimits = DEFAULT_LIMITS,
): Promise<GenerationResult> {
  const diagnostics = [...contract.diagnostics];
  const testCases: GeneratedTestCase[] = [];
  const seen = new Set<string>();
  let skippedCount = 0;

  let totalLimitReported = false;

  for (const endpoint of contract.endpoints) {
    if (endpoint.incomplete) {
      diagnostics.push(createDiagnostic('ENDPOINT_INCOMPLETE_SKIPPED', `${endpoint.id}은 안전한 기준 요청을 만들 수 없어 건너뜁니다.`, {
        stage: 'generate', sourcePointer: endpoint.sourcePointer, severity: 'warning', blocking: false,
      }));
      skippedCount += 1;
      continue;
    }

    const candidates: TestCandidate[] = [];
    const alternativeCount = Math.max(1, endpoint.security.length);
    for (let alternativeIndex = 0; alternativeIndex < alternativeCount; alternativeIndex += 1) {
      const baseline = buildBaselineRequest(endpoint, `${seed}:${endpoint.id}`, alternativeIndex);
      diagnostics.push(...baseline.diagnostics);
      if (!baseline.ok) {
        skippedCount += 1;
        continue;
      }
      candidates.push(...generateRuleCandidates(endpoint, baseline.request, seed, alternativeIndex).map((candidate) => ({
        ...candidate,
        variantId: `${candidate.variantId}:security-${alternativeIndex}`,
      })));
    }

    const withIds = await Promise.all(candidates.map(async (candidate) => ({
      ...candidate,
      id: await candidateId(endpoint.method, endpoint.path, candidate),
      method: endpoint.method,
      path: endpoint.path,
      tags: endpoint.tags,
    })));
    withIds.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
    const endpointSeen = new Set<string>();
    const uniqueCases = withIds.filter((testCase) => {
      if (endpointSeen.has(testCase.id)) return false;
      endpointSeen.add(testCase.id);
      return true;
    });
    if (uniqueCases.length > limits.maxPerEndpoint) {
      diagnostics.push(limitDiagnostic(`${endpoint.id} 테스트를 ${limits.maxPerEndpoint}개로 제한했습니다.`, endpoint.sourcePointer));
      skippedCount += uniqueCases.length - limits.maxPerEndpoint;
    }

    for (const testCase of uniqueCases.slice(0, limits.maxPerEndpoint)) {
      if (testCases.length >= limits.maxTotal) {
        if (!totalLimitReported) {
          diagnostics.push(limitDiagnostic(`전체 테스트를 ${limits.maxTotal}개로 제한했습니다.`, endpoint.sourcePointer));
          totalLimitReported = true;
        }
        skippedCount += 1;
        continue;
      }
      if (seen.has(testCase.id)) continue;
      seen.add(testCase.id);
      testCases.push(testCase);
    }
  }

  const selections: Record<string, TestCaseSelection> = Object.fromEntries(
    testCases.map((testCase) => [testCase.id, { included: true, reviewed: !testCase.expected.needsReview }]),
  );
  const sourceDigest = await sha256(JSON.stringify(contract));

  return {
    plan: {
      schemaVersion: 'toolhub.api-contract-test-plan/v1',
      title: contract.title,
      apiVersion: contract.apiVersion,
      specVersion: contract.specVersion,
      serverUrl: contract.serverUrl,
      generatedAt: new Date().toISOString(),
      endpoints: contract.endpoints,
      testCases,
      diagnostics,
      summary: {
        endpointCount: contract.endpoints.length,
        testCount: testCases.length,
        reviewRequiredCount: testCases.filter((testCase) => testCase.expected.needsReview).length,
        skippedCount,
      },
      sourceDigest,
    },
    selections,
  };
}

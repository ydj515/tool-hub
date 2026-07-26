import type { NormalizedContract, NormalizedEndpoint } from './contract';
import type { Diagnostic } from './diagnostic';

export type TestCategory = 'valid' | 'validation' | 'boundary' | 'authentication';
export type Confidence = 'explicit' | 'derived' | 'review-required';
export type ExportFormat = 'markdown' | 'json' | 'postman';
export type ExpectedStatus = number | '2XX' | '4XX';

export interface GeneratedRequest {
  pathParameters: Record<string, unknown>;
  queryParameters: Record<string, unknown>;
  headers: Record<string, unknown>;
  cookies: Record<string, unknown>;
  body?: unknown;
}

export interface ExpectedOutcome {
  statuses: ExpectedStatus[];
  needsReview: boolean;
  rationale: string;
}

export interface TestCandidate {
  endpointId: string;
  title: string;
  category: TestCategory;
  confidence: Confidence;
  sourcePointer: string;
  rationale: string;
  request: GeneratedRequest;
  expected: ExpectedOutcome;
  ruleId: string;
  variantId: string;
  priority: number;
}

export interface GeneratedTestCase extends TestCandidate {
  id: string;
  method: string;
  path: string;
  tags: string[];
}

export interface TestCaseSelection {
  included: boolean;
  reviewed: boolean;
  expectedStatuses?: ExpectedStatus[];
}

export interface GenerationSummary {
  endpointCount: number;
  testCount: number;
  reviewRequiredCount: number;
  skippedCount: number;
}

export interface TestPlan {
  schemaVersion: 'toolhub.api-contract-test-plan/v1';
  title: string;
  apiVersion: string;
  specVersion: string;
  serverUrl?: string;
  generatedAt: string;
  endpoints: NormalizedEndpoint[];
  testCases: GeneratedTestCase[];
  diagnostics: Diagnostic[];
  summary: GenerationSummary;
  sourceDigest: string;
}

export interface GenerationLimits {
  maxPerEndpoint: number;
  maxTotal: number;
}

export interface GenerationResult {
  plan: TestPlan;
  selections: Record<string, TestCaseSelection>;
}

export interface PlanSource {
  contract: NormalizedContract;
  sourceDigest: string;
}

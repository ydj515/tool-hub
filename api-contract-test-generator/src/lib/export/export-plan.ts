import type { ExportFormat, TestCaseSelection, TestPlan } from '../../domain/test-case';
import { exportJsonPlan } from './json-plan';
import { exportMarkdown } from './markdown';
import { exportPostman } from './postman';
import { safeSlug } from './shared';

export interface ExportArtifact {
  filename: string;
  mimeType: 'text/markdown' | 'application/json';
  content: string;
}

export function exportPlan(
  plan: TestPlan,
  selections: Record<string, TestCaseSelection>,
  format: ExportFormat,
): ExportArtifact {
  const slug = safeSlug(plan.title);
  if (format === 'markdown') return { filename: `${slug}-test-plan.md`, mimeType: 'text/markdown', content: exportMarkdown(plan, selections) };
  if (format === 'json') return { filename: `${slug}-test-plan.json`, mimeType: 'application/json', content: exportJsonPlan(plan, selections) };
  return { filename: `${slug}-postman-collection.json`, mimeType: 'application/json', content: exportPostman(plan, selections) };
}

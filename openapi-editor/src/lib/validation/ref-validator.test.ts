import { describe, expect, it } from 'vitest';
import { validateReferences } from './ref-validator';

describe('validateReferences', () => {
  it('accepts a resolved internal reference including escaped pointer tokens', () => {
    const document = {
      components: { schemas: { 'Pet/Record': { type: 'object' } } },
      paths: { '/pets': { get: { responses: { '200': { $ref: '#/components/schemas/Pet~1Record' } } } } },
    };

    expect(validateReferences(document).diagnostics).toEqual([]);
  });

  it('reports unresolved internal references as conversion blockers', () => {
    const result = validateReferences({ paths: { '/pets': { $ref: '#/components/pathItems/Missing' } } });

    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'UNRESOLVED_INTERNAL_REF', severity: 'error' }),
    ]));
  });

  it('preserves external references and reports a warning without fetching them', () => {
    const result = validateReferences({ components: { schemas: { Pet: { $ref: './common.yaml#/Pet' } } } });

    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EXTERNAL_REF_NOT_RESOLVED', severity: 'warning' }),
    ]));
    expect(result.externalCount).toBe(1);
  });
});

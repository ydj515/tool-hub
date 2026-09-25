import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const yaml = createRequire(import.meta.url)('js-yaml') as {
  load(source: string, options?: { maxTotalMergeKeys: number }): unknown;
};

describe('Swagger YAML dependency resource limits', () => {
  it.each(['{}', '{id: 1}'])('counts merge work for source %s', (source) => {
    const input = `base: &base ${source}\nmerged:\n  <<: [*base, *base, *base, *base]\n`;
    expect(() => yaml.load(input, { maxTotalMergeKeys: 2 })).toThrow('maxTotalMergeKeys');
  });

  it('preserves ordinary merge and ordered-map parsing', () => {
    expect(yaml.load('base: &base {id: 1}\nmerged: {<<: *base, title: task}', { maxTotalMergeKeys: 10 })).toEqual({ base: { id: 1 }, merged: { id: 1, title: 'task' } });
    expect(yaml.load('!!omap [{first: 1}, {second: 2}]')).toEqual([{ first: 1 }, { second: 2 }]);
  });
});

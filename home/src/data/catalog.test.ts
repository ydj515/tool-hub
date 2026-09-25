import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalog, categories } from './catalog';
import { tools } from './tools';

describe('landing catalog', () => {
  it('includes every registered tool once and preserves its destination', () => {
    expect(catalog.map((tool) => tool.id).sort()).toEqual(tools.map((tool) => tool.id).sort());
    for (const tool of catalog) {
      expect(categories).toContain(tool.category);
      expect(tool.url).toBe(tools.find((entry) => entry.id === tool.id)?.url);
      expect(existsSync(resolve('public/images/previews', `${tool.id}.webp`))).toBe(true);
    }
  });
});

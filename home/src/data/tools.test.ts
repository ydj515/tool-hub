import { describe, expect, it } from 'vitest';
import { tools } from './tools';

describe('tools metadata', () => {
  it('uses unique ids and GitHub links', () => {
    const ids = tools.map((tool) => tool.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(tools.every((tool) => tool.github.startsWith('https://github.com/'))).toBe(true);
  });

  it('requires live tools to have a deploy URL', () => {
    const liveTools = tools.filter((tool) => tool.status === 'live');

    expect(liveTools.every((tool) => typeof tool.url === 'string' && tool.url.length > 0)).toBe(true);
  });

  it('registers the JSON YAML converter as coming soon until deployment', () => {
    expect(tools).toContainEqual(expect.objectContaining({
      id: 'json-yaml-converter',
      status: 'coming-soon',
      url: null,
      tags: expect.arrayContaining(['JSON', 'YAML', 'Converter']),
    }));
  });

  it('registers the current OpenAPI Studio capabilities until deployment', () => {
    expect(tools).toContainEqual(expect.objectContaining({
      id: 'openapi-editor',
      name: 'OpenAPI Studio',
      status: 'coming-soon',
      url: null,
      longDescription: expect.stringContaining('버전별 YAML 샘플'),
      tags: expect.arrayContaining(['OpenAPI', 'Swagger', 'YAML', 'JSON', 'Sample']),
    }));
  });
});

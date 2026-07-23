import { describe, expect, it } from 'vitest';
import { normalizeDownloadFilename } from './download';

describe('normalizeDownloadFilename', () => {
  it('keeps the basename and replaces a forbidden path with a safe OpenAPI extension', () => {
    expect(normalizeDownloadFilename('../my:api.json', 'yaml')).toBe('myapi.yaml');
  });

  it('uses an OpenAPI fallback name when no filename exists', () => {
    expect(normalizeDownloadFilename(undefined, 'json')).toBe('openapi.json');
  });
});

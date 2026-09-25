import { describe, expect, it } from 'vitest';
import { sampleDocumentFor } from '../../data/spec-samples';
import { createHtmlDocument } from './html-document';

describe('ReDoc HTML document', () => {
  it.each(['swagger-2.0', 'openapi-3.0', 'openapi-3.1'] as const)('embeds the complete %s document and renderer without remote assets', (version) => {
    const spec = sampleDocumentFor(version);
    const html = new DOMParser().parseFromString(createHtmlDocument(spec), 'text/html');
    expect(JSON.parse(html.getElementById('openapi-spec')!.textContent!)).toEqual(spec);
    expect(html.querySelector('script[src], link[rel="stylesheet"]')).toBeNull();
    expect(html.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toContain("connect-src 'none'");
    expect(html.querySelector('title')?.textContent).toBe('Task API');
    expect(html.scripts).toHaveLength(3);
    expect(html.body.textContent).toContain('Redoc.init');
  });

  it('escapes document text without creating executable markup', () => {
    const attack = '</script><script>window.compromised=true</script><img src=x onerror=alert(1)>';
    const spec = { ...sampleDocumentFor('openapi-3.1'), info: { title: attack, description: attack, version: '1.0.0' } };
    const html = new DOMParser().parseFromString(createHtmlDocument(spec), 'text/html');
    expect(html.title).toBe(attack);
    expect(html.querySelector('img')).toBeNull();
    expect(html.scripts).toHaveLength(3);
    expect(JSON.parse(html.getElementById('openapi-spec')!.textContent!)).toEqual(spec);
  });

  it('rejects OpenAPI 3.2 instead of changing its version', () => {
    const spec = sampleDocumentFor('openapi-3.2');
    expect(() => createHtmlDocument(spec)).toThrow('현재 버전은 지원하지 않습니다.');
    expect(spec.openapi).toBe('3.2.0');
  });

  it('rejects unresolved external references instead of downloading incomplete documentation', () => {
    const spec = { ...sampleDocumentFor('openapi-3.1'), components: { schemas: { External: { $ref: 'https://example.com/private.json' } } } };
    expect(() => createHtmlDocument(spec)).toThrow('외부 참조($ref)');
  });
});

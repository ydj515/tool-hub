import type { Diagnostic, OpenApiDocument, SpecFamily } from '../../domain/document';

export type VersionDetection =
  | { ok: true; family: SpecFamily; rawVersion: string }
  | { ok: false; diagnostic: Diagnostic };

function invalid(code: string, message: string): VersionDetection {
  return {
    ok: false,
    diagnostic: { id: `${code}:root`, code, severity: 'error', stage: 'validate', message, sourcePointer: '', lossy: false },
  };
}

export function detectSpecVersion(document: OpenApiDocument): VersionDetection {
  const swagger = document.swagger;
  const openapi = document.openapi;
  if (typeof swagger === 'string' && typeof openapi === 'string') return invalid('CONFLICTING_SPEC_VERSION', 'swagger와 openapi를 동시에 선언할 수 없습니다.');
  if (swagger === '2.0') return { ok: true, family: 'swagger-2.0', rawVersion: swagger };
  if (typeof openapi === 'string' && /^3\.0\.[0-4]$/.test(openapi)) return { ok: true, family: 'openapi-3.0', rawVersion: openapi };
  if (typeof openapi === 'string' && /^3\.1\.[0-2]$/.test(openapi)) return { ok: true, family: 'openapi-3.1', rawVersion: openapi };
  if (typeof openapi === 'string' && /^3\.2\.\d+$/.test(openapi)) return { ok: true, family: 'openapi-3.2', rawVersion: openapi };
  if (swagger === undefined && openapi === undefined) return invalid('MISSING_SPEC_VERSION', 'swagger 또는 openapi 버전 필드가 필요합니다.');
  return invalid('UNSUPPORTED_SPEC_VERSION', `지원하지 않는 명세 버전입니다: ${String(swagger ?? openapi)}`);
}

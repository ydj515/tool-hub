import type { OpenApiDocument } from '../../domain/contract';
import { createDiagnostic, type Diagnostic } from '../../domain/diagnostic';

export type ReferenceResult =
  | { ok: true; value: unknown; pointer: string }
  | { ok: false; diagnostic: Diagnostic };

function decodePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function lookup(document: OpenApiDocument, ref: string): unknown {
  if (ref === '#') return document;
  const tokens = ref.slice(2).split('/').map(decodePointerToken);
  let current: unknown = document;

  for (const token of tokens) {
    if (typeof current !== 'object' || current === null || Array.isArray(current) || !(token in current)) return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

export function resolveLocalReference(document: OpenApiDocument, ref: string, trail: string[] = []): ReferenceResult {
  if (!ref.startsWith('#')) {
    return {
      ok: false,
      diagnostic: createDiagnostic('EXTERNAL_REFERENCE_UNSUPPORTED', '외부 $ref는 가져오지 않습니다.', {
        stage: 'reference',
        sourcePointer: ref,
        severity: 'warning',
        blocking: false,
      }),
    };
  }
  if (ref !== '#' && !ref.startsWith('#/')) {
    return {
      ok: false,
      diagnostic: createDiagnostic('INVALID_LOCAL_REFERENCE', '지원하지 않는 로컬 $ref 형식입니다.', {
        stage: 'reference', sourcePointer: ref,
      }),
    };
  }
  if (trail.includes(ref)) {
    return {
      ok: false,
      diagnostic: createDiagnostic('CIRCULAR_REFERENCE', '순환 $ref를 더 이상 확장하지 않습니다.', {
        stage: 'reference', sourcePointer: ref, severity: 'warning', blocking: false,
      }),
    };
  }

  const value = lookup(document, ref);
  if (value === undefined) {
    return {
      ok: false,
      diagnostic: createDiagnostic('REFERENCE_NOT_FOUND', '$ref 대상이 존재하지 않습니다.', {
        stage: 'reference', sourcePointer: ref,
      }),
    };
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && typeof (value as Record<string, unknown>).$ref === 'string') {
    return resolveLocalReference(document, (value as Record<string, unknown>).$ref as string, [...trail, ref]);
  }
  return { ok: true, value, pointer: ref.slice(1) };
}

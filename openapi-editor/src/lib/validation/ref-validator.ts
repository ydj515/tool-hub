import type { Diagnostic, OpenApiDocument } from '../../domain/document';

export interface ReferenceValidation {
  diagnostics: Diagnostic[];
  internalCount: number;
  externalCount: number;
}

function unescapePointerToken(token: string): string {
  return token.replaceAll('~1', '/').replaceAll('~0', '~');
}

function resolvePointer(root: unknown, reference: string): unknown {
  if (reference === '#') return root;
  if (!reference.startsWith('#/')) return undefined;
  return reference.slice(2).split('/').map(unescapePointerToken).reduce<unknown>((value, token) => {
    if (typeof value !== 'object' || value === null) return undefined;
    return (value as Record<string, unknown>)[token];
  }, root);
}

function anchors(root: unknown): Map<string, unknown> {
  const result = new Map<string, unknown>();
  const stack = [root];
  const visited = new WeakSet<object>();
  while (stack.length > 0) {
    const value = stack.pop();
    if (typeof value !== 'object' || value === null || visited.has(value)) continue;
    visited.add(value);
    const record = value as Record<string, unknown>;
    if (typeof record.$anchor === 'string') result.set(record.$anchor, record);
    for (const child of Object.values(record)) stack.push(child);
  }
  return result;
}

export function validateReferences(document: OpenApiDocument): ReferenceValidation {
  const diagnostics: Diagnostic[] = [];
  const localAnchors = anchors(document);
  let internalCount = 0;
  let externalCount = 0;
  const stack: Array<{ value: unknown; pointer: string }> = [{ value: document, pointer: '' }];
  const visited = new WeakSet<object>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current.value !== 'object' || current.value === null || visited.has(current.value)) continue;
    visited.add(current.value);
    const record = current.value as Record<string, unknown>;
    if (typeof record.$ref === 'string') {
      if (record.$ref.startsWith('#')) {
        internalCount += 1;
        const resolved = record.$ref.startsWith('#/') ? resolvePointer(document, record.$ref) : localAnchors.get(record.$ref.slice(1));
        if (resolved === undefined) diagnostics.push({
          id: `UNRESOLVED_INTERNAL_REF:${current.pointer}`,
          code: 'UNRESOLVED_INTERNAL_REF',
          severity: 'error',
          stage: 'validate',
          message: `내부 참조를 찾을 수 없습니다: ${record.$ref}`,
          sourcePointer: current.pointer,
          lossy: false,
        });
      } else {
        externalCount += 1;
        diagnostics.push({
          id: `EXTERNAL_REF_NOT_RESOLVED:${current.pointer}`,
          code: 'EXTERNAL_REF_NOT_RESOLVED',
          severity: 'warning',
          stage: 'validate',
          message: `외부 참조를 가져오지 않습니다: ${record.$ref}`,
          sourcePointer: current.pointer,
          lossy: false,
        });
      }
    }
    for (const [key, value] of Object.entries(record)) stack.push({ value, pointer: `${current.pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}` });
  }
  return { diagnostics, internalCount, externalCount };
}

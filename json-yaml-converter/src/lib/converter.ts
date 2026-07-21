import type { OperationResult } from './data-node';
import { parseJson, prettyJson, stringifyJson } from './json';
import { parseYaml, prettyYaml, stringifyYaml } from './yaml';
import { safetyDiagnostic } from './safety';

export type ConverterDirection = 'json-to-yaml' | 'yaml-to-json';

export function convertSource(source: string, direction: ConverterDirection): OperationResult<string> {
  try {
    const parsed = direction === 'json-to-yaml' ? parseJson(source) : parseYaml(source);
    if (!parsed.ok) return parsed;
    const serialized = direction === 'json-to-yaml' ? stringifyYaml(parsed.value) : stringifyJson(parsed.value);
    if (serialized.ok) return serialized;
    return {
      ok: false,
      diagnostic: {
        ...serialized.diagnostic,
        format: direction === 'json-to-yaml' ? 'json' : 'yaml',
      },
    };
  } catch {
    const format = direction === 'json-to-yaml' ? 'json' : 'yaml';
    return { ok: false, diagnostic: safetyDiagnostic(format, 'UNEXPECTED_ERROR', '변환 중 예상하지 못한 오류가 발생했습니다.', source) };
  }
}

export function prettySource(source: string, direction: ConverterDirection): OperationResult<string> {
  try {
    return direction === 'json-to-yaml' ? prettyJson(source) : prettyYaml(source);
  } catch {
    const format = direction === 'json-to-yaml' ? 'json' : 'yaml';
    return { ok: false, diagnostic: safetyDiagnostic(format, 'UNEXPECTED_ERROR', 'Pretty 중 예상하지 못한 오류가 발생했습니다.', source) };
  }
}

export function oppositeDirection(direction: ConverterDirection): ConverterDirection {
  return direction === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml';
}

export function sampleFor(direction: ConverterDirection): string {
  return direction === 'json-to-yaml'
    ? '{\n  "name": "tool-hub",\n  "enabled": true\n}\n'
    : 'name: tool-hub\nenabled: true\n';
}

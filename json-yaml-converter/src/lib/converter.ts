import type { OperationResult } from './data-node';
import { parseJson, prettyJson, stringifyJson } from './json';
import { parseYaml, prettyYaml, stringifyYaml } from './yaml';

export type ConverterDirection = 'json-to-yaml' | 'yaml-to-json';

export function convertSource(source: string, direction: ConverterDirection): OperationResult<string> {
  const parsed = direction === 'json-to-yaml' ? parseJson(source) : parseYaml(source);
  if (!parsed.ok) return parsed;

  return {
    ok: true,
    value: direction === 'json-to-yaml' ? stringifyYaml(parsed.value) : stringifyJson(parsed.value),
  };
}

export function prettySource(source: string, direction: ConverterDirection): OperationResult<string> {
  return direction === 'json-to-yaml' ? prettyJson(source) : prettyYaml(source);
}

export function oppositeDirection(direction: ConverterDirection): ConverterDirection {
  return direction === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml';
}

export function sampleFor(direction: ConverterDirection): string {
  return direction === 'json-to-yaml'
    ? '{\n  "name": "tool-hub",\n  "enabled": true\n}\n'
    : 'name: tool-hub\nenabled: true\n';
}

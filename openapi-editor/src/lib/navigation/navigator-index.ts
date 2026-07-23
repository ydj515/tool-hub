import type { OpenApiDocument, SpecFamily } from '../../domain/document';

export interface NavigatorItem {
  label: string;
  pointer: string;
  children?: NavigatorItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function operations(paths: unknown): NavigatorItem[] {
  if (!isRecord(paths)) return [];
  const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
  return Object.entries(paths).map(([path, item]) => ({
    label: path,
    pointer: `/paths/${path.replaceAll('~', '~0').replaceAll('/', '~1')}`,
    children: isRecord(item) ? Object.keys(item).filter((key) => methods.has(key)).map((method) => ({ label: method.toUpperCase(), pointer: `/paths/${path.replaceAll('~', '~0').replaceAll('/', '~1')}/${method}` })) : [],
  }));
}

export function buildNavigatorIndex(document: OpenApiDocument, version: SpecFamily | undefined): NavigatorItem[] {
  const componentsPointer = version === 'swagger-2.0' ? '/definitions' : '/components';
  const componentValue = version === 'swagger-2.0' ? document.definitions : document.components;
  const serversLabel = version === 'swagger-2.0' ? '서버 (host/basePath)' : 'Servers';
  const items: NavigatorItem[] = [
    { label: 'Info', pointer: '/info' },
    { label: serversLabel, pointer: version === 'swagger-2.0' ? '/host' : '/servers' },
    { label: 'Paths', pointer: '/paths', children: operations(document.paths) },
  ];
  if (isRecord(componentValue)) items.push({ label: version === 'swagger-2.0' ? 'Definitions' : 'Components', pointer: componentsPointer, children: Object.keys(componentValue).map((key) => ({ label: key, pointer: `${componentsPointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}` })) });
  if (Array.isArray(document.tags)) items.push({ label: 'Tags', pointer: '/tags' });
  if (Array.isArray(document.security)) items.push({ label: 'Security', pointer: '/security' });
  return items;
}

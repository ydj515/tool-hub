import type { Diagnostic } from './diagnostics';

export type DataNode =
  | { kind: 'null' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'sequence'; items: DataNode[] }
  | { kind: 'mapping'; entries: Array<{ key: string; value: DataNode }> };

export type OperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; diagnostic: Diagnostic };

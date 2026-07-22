import type { DataNode, OperationResult } from './data-node';
import { diagnosticAt, type DataFormat, type Diagnostic } from './diagnostics';
import { utf8ByteLength } from './size';

export const MAX_NESTING_DEPTH = 100;
export const OUTPUT_LIMIT_BYTES = 2 * 1024 * 1024;

export class OutputByteBudget {
  private usedBytes = 0;

  addBytes(bytes: number): boolean {
    if (bytes < 0 || this.usedBytes > OUTPUT_LIMIT_BYTES - bytes) return false;
    this.usedBytes += bytes;
    return true;
  }

  addUtf8(value: string): boolean {
    let bytes = 0;
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code <= 0x7f) bytes += 1;
      else if (code <= 0x7ff) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
        const next = value.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          bytes += 4;
          index += 1;
        } else bytes += 3;
      } else bytes += 3;
      if (bytes > OUTPUT_LIMIT_BYTES - this.usedBytes) return false;
    }
    return this.addBytes(bytes);
  }

  get byteLength(): number {
    return this.usedBytes;
  }
}

export function safetyDiagnostic(
  format: DataFormat,
  code: 'MAX_DEPTH_EXCEEDED' | 'OUTPUT_TOO_LARGE' | 'UNEXPECTED_ERROR' | 'NON_FINITE_NUMBER' | 'CYCLIC_DATA' | 'DUPLICATE_KEY',
  message: string,
  source = '',
  offset = 0,
  length = 0,
): Diagnostic {
  return diagnosticAt(format, code, message, source, offset, length);
}

export function outputWithinLimit(format: DataFormat, output: string): OperationResult<string> {
  if (utf8ByteLength(output) > OUTPUT_LIMIT_BYTES) {
    return {
      ok: false,
      diagnostic: safetyDiagnostic(format, 'OUTPUT_TOO_LARGE', '생성 결과가 2MB 제한을 초과했습니다.'),
    };
  }
  return { ok: true, value: output };
}

export function outputPreflightResult(format: DataFormat, budget: OutputByteBudget): OperationResult<number> {
  if (budget.byteLength > OUTPUT_LIMIT_BYTES) {
    return {
      ok: false,
      diagnostic: safetyDiagnostic(format, 'OUTPUT_TOO_LARGE', '생성 결과가 2MB 제한을 초과했습니다.'),
    };
  }
  return { ok: true, value: budget.byteLength };
}

export function outputTooLarge(format: DataFormat): OperationResult<never> {
  return {
    ok: false,
    diagnostic: safetyDiagnostic(format, 'OUTPUT_TOO_LARGE', '생성 결과가 2MB 제한을 초과했습니다.'),
  };
}

export function validateDataNode(node: DataNode, format: DataFormat): OperationResult<DataNode> {
  type Frame = { node: DataNode; depth: number; exit?: boolean };
  const stack: Frame[] = [{ node, depth: 1 }];
  const active = new WeakSet<object>();

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    if (frame.exit) {
      active.delete(frame.node);
      continue;
    }
    const isCollection = frame.node.kind === 'sequence' || frame.node.kind === 'mapping';
    if (isCollection && frame.depth > MAX_NESTING_DEPTH) {
      return {
        ok: false,
        diagnostic: safetyDiagnostic(format, 'MAX_DEPTH_EXCEEDED', `중첩 깊이는 ${MAX_NESTING_DEPTH}단계까지 지원합니다.`),
      };
    }
    if (frame.node.kind === 'number' && !Number.isFinite(frame.node.value)) {
      return {
        ok: false,
        diagnostic: safetyDiagnostic(format, 'NON_FINITE_NUMBER', '유한한 숫자만 사용할 수 있습니다.'),
      };
    }
    if (frame.node.kind !== 'sequence' && frame.node.kind !== 'mapping') continue;
    if (active.has(frame.node)) {
      return {
        ok: false,
        diagnostic: safetyDiagnostic(format, 'CYCLIC_DATA', '순환 데이터는 직렬화할 수 없습니다.'),
      };
    }
    active.add(frame.node);
    stack.push({ ...frame, exit: true });
    if (frame.node.kind === 'sequence') {
      for (let index = frame.node.items.length - 1; index >= 0; index -= 1) {
        stack.push({ node: frame.node.items[index], depth: frame.depth + 1 });
      }
    } else {
      for (let index = frame.node.entries.length - 1; index >= 0; index -= 1) {
        stack.push({ node: frame.node.entries[index].value, depth: frame.depth + 1 });
      }
    }
  }
  return { ok: true, value: node };
}

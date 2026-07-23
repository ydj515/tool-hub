import type { ConversionCandidate, DocumentFormat, OpenApiDocument, SpecFamily } from '../domain/document';
import { collectMeaningInventory, missingMeaning } from '../lib/conversion/meaning-inventory';
import { convertDocument } from '../lib/conversion/conversion-router';
import { serializeDocument } from '../lib/parser/serialize-document';
import { analyzeDocument } from '../lib/validation/analyze-document';

export function createConversionCandidate(
  revision: number,
  sourceSnapshot: string,
  document: OpenApiDocument,
  source: SpecFamily,
  target: SpecFamily,
  outputFormat: DocumentFormat,
): ConversionCandidate {
  const converted = convertDocument(document, source, target);
  const targetText = serializeDocument(converted.document, outputFormat);
  const analyzed = analyzeDocument(targetText, { formatHint: outputFormat });
  const diagnostics = [...converted.diagnostics, ...analyzed.diagnostics];
  const removed = missingMeaning(collectMeaningInventory(document), collectMeaningInventory(converted.document));
  if (removed.length > 0 && !diagnostics.some((item) => item.lossy)) {
    diagnostics.push({
      id: 'UNEXPLAINED_CONVERSION_CHANGE:root',
      code: 'UNEXPLAINED_CONVERSION_CHANGE',
      severity: 'error',
      stage: 'reconcile',
      message: `의미 인벤토리 차이를 설명할 수 없습니다: ${removed.slice(0, 3).join(', ')}${removed.length > 3 ? ' 등' : ''}`,
      sourcePointer: '',
      lossy: false,
    });
  }
  const targetValid = !diagnostics.some((item) => item.severity === 'error');
  return { revision, sourceVersion: source, targetVersion: target, sourceSnapshot, targetDocument: converted.document, targetText, diagnostics, targetValid };
}

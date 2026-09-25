import type { OpenApiDocument } from '../../domain/document';
import { detectSpecVersion } from '../validation/version-detector';
import { validateReferences } from '../validation/ref-validator';

export const REDOC_UNSUPPORTED_VERSION = '현재 버전은 지원하지 않습니다. ReDoc은 Swagger 2.0과 OpenAPI 3.0/3.1 명세를 지원합니다.';

export function redocUnavailableReason(document: OpenApiDocument): string | undefined {
  const version = detectSpecVersion(document);
  if (!version.ok || version.family === 'openapi-3.2') return REDOC_UNSUPPORTED_VERSION;
  if (validateReferences(document).externalCount > 0) return 'ReDoc으로 보거나 내려받으려면 외부 참조($ref)를 문서 안에 포함해 주세요.';
  return undefined;
}

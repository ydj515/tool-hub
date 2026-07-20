import type { Diagnostic } from '../../lib/diagnostics';

export function DiagnosticBanner({ diagnostic, onFocus }: { diagnostic: Diagnostic; onFocus(): void }) {
  return <div className="diagnostic-banner" role="alert" data-testid="diagnostic-banner"><button type="button" onClick={onFocus}>{diagnostic.line}행 {diagnostic.column}열: {diagnostic.message}</button></div>;
}

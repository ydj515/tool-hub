import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import type { OpenApiDocument } from '../../domain/document';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = lazy(() => import('swagger-ui-react'));

class PreviewErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  public state = { failed: false };

  public static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    // 사용자 문서 내용은 로그로 남기지 않는다.
    void error;
    void info;
  }

  public render(): ReactNode {
    return this.state.failed ? <p className="preview-error" role="alert">미리보기를 렌더링할 수 없습니다. 문서는 편집기에 그대로 유지됩니다.</p> : this.props.children;
  }
}

interface SwaggerPreviewProps {
  document?: OpenApiDocument;
  stale: boolean;
}

export function SwaggerPreview({ document, stale }: SwaggerPreviewProps) {
  if (!document) return <div className="preview-empty"><p>유효한 문서를 입력하면 읽기 전용 API 문서가 표시됩니다.</p></div>;
  return <PreviewErrorBoundary>
    <div className="swagger-preview">
      {stale ? <span className="stale-badge">현재 편집 내용과 다름</span> : null}
      <Suspense fallback={<div className="preview-empty" role="status">미리보기를 불러오는 중입니다.</div>}>
        <SwaggerUI
          spec={document}
          supportedSubmitMethods={[]}
          docExpansion="list"
          displayOperationId={true}
          deepLinking={false}
          requestInterceptor={(request: { url?: string }) => {
            if (request.url && !request.url.startsWith(window.location.origin)) throw new Error('외부 요청은 허용되지 않습니다.');
            return request;
          }}
        />
      </Suspense>
    </div>
  </PreviewErrorBoundary>;
}

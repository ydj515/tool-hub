import type { OpenApiDocument } from '../../domain/document';
import redocScript from 'redoc/bundles/redoc.standalone.js?raw';
import redocLicense from 'redoc/LICENSE?raw';
import bundledLicenses from 'redoc/bundles/redoc.standalone.js.LICENSE.txt?raw';
import { redocUnavailableReason } from './redoc-support';
import type { Theme } from '../../theme';
import redocLogo from '../../assets/redoc-logo.svg?raw';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function createHtmlDocument(document: OpenApiDocument, { theme = 'light', embedded = false }: { theme?: Theme; embedded?: boolean } = {}): string {
  const reason = redocUnavailableReason(document);
  if (reason) throw new Error(reason);
  const info = document.info as Record<string, unknown> | undefined;
  const title = typeof info?.title === 'string' ? info.title : 'OpenAPI 명세서';
  // application/json script도 HTML 파서의 종료 태그를 이스케이프해야 한다.
  const spec = JSON.stringify(document).replace(/[<>&\u2028\u2029]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const dark = theme === 'dark';
  const script = redocScript.replaceAll('https://cdn.redoc.ly/redoc/logo-mini.svg', `data:image/svg+xml,${encodeURIComponent(redocLogo)}`).replace(/<\/script/gi, '<\\/script');
  const options = JSON.stringify({
    untrustedSpec: true,
    hideDownloadButton: true,
    disableGoogleFont: true,
    theme: {
      colors: { primary: { main: dark ? '#90b8ff' : '#2349ad' }, success: { main: dark ? '#7ed38b' : '#147d28' }, text: { primary: dark ? '#e8e8ed' : '#25252a', secondary: dark ? '#bfc2cc' : '#555963' } },
      typography: { fontFamily: 'system-ui, sans-serif', headings: { fontFamily: 'system-ui, sans-serif' } },
      sidebar: { backgroundColor: dark ? '#22242a' : '#f5f6f8', textColor: dark ? '#e8e8ed' : '#25252a' },
      rightPanel: { backgroundColor: '#202630' },
    },
  });
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; background: ${dark ? '#191b20' : '#fff'}; color: ${dark ? '#e8e8ed' : '#25252a'}; }
    .export-note { padding: 16px 20px; font: 14px/1.5 system-ui, sans-serif; }
    .licenses { padding: 20px; font: 12px/1.5 system-ui, sans-serif; }
    .licenses pre { white-space: pre-wrap; overflow-wrap: anywhere; }
    #drop-hint { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; background: #eef3ff; color: #25252a; border: 3px dashed #2349ad; padding: 20px; font: 14px/1.5 system-ui, sans-serif; pointer-events: none; }
    #drop-hint[hidden] { display: none; }
  </style>
</head>
<body>
  ${embedded ? '<div id="drop-hint" hidden>파일을 놓으면 OpenAPI 문서를 불러옵니다.</div>' : '<div class="export-note">읽기 전용 API 명세서입니다. 외부 참조와 외부 이미지는 불러오지 않습니다.</div>'}
  <noscript>명세서를 보려면 JavaScript를 활성화해 주세요.</noscript>
  <div id="redoc-container"></div>
  <p id="render-error" role="alert" hidden>명세서를 표시하지 못했습니다. 문서 구조와 참조를 확인해 주세요.</p>
  <details class="licenses"><summary>ReDoc 오픈소스 라이선스</summary><pre>${escapeHtml(`${redocLicense}\n${bundledLicenses}`)}</pre></details>
  <script id="openapi-spec" type="application/json">${spec}</script>
  <script>${script}</script>
  <script>
    ${embedded ? `
    let dragDepth = 0;
    const resetDrop = () => { dragDepth = 0; document.getElementById('drop-hint').hidden = true; };
    window.addEventListener('dragenter', (event) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      dragDepth++;
      document.getElementById('drop-hint').hidden = false;
    });
    window.addEventListener('dragover', (event) => {
      if (event.dataTransfer?.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }
    });
    window.addEventListener('dragleave', (event) => {
      if (event.dataTransfer?.types.includes('Files') && --dragDepth <= 0) resetDrop();
    });
    window.addEventListener('drop', (event) => {
      resetDrop();
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) window.parent.postMessage({ type: 'redoc-file-drop', file }, '*');
    });
    window.addEventListener('dragend', resetDrop);
    window.addEventListener('blur', resetDrop);
    ` : ''}
    try {
      Redoc.init(JSON.parse(document.getElementById('openapi-spec').textContent), ${options},
        document.getElementById('redoc-container'), function (error) {
          if (error) document.getElementById('render-error').hidden = false;
        });
    } catch {
      document.getElementById('render-error').hidden = false;
    }
  </script>
</body>
</html>`;
}

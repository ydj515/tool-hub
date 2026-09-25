import { expect, test } from '@playwright/test';

for (const hookName of ['beforeSanitizeElements', 'uponSanitizeElement']) {
  test(`Monaco sanitizer neutralizes detached descendants from ${hookName}`, async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async ({ moduleUrl, hook }) => {
      const { default: purify } = await import(moduleUrl);
      const root = document.createElement('div');
      root.innerHTML = '<footer><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" onload="window.sanitizerCompromised=true"></footer><div>safe</div>';
      const image = root.querySelector('img')!;
      purify.addHook(hook, (node: Element) => { if (node.tagName === 'FOOTER') node.remove(); });
      try {
        purify.sanitize(root, { IN_PLACE: true, ALLOWED_TAGS: ['div', '#text', 'footer'] });
        image.dispatchEvent(new Event('load'));
        return { handler: image.getAttribute('onload'), compromised: Reflect.get(window, 'sanitizerCompromised'), text: root.textContent };
      } finally {
        purify.removeAllHooks();
      }
    }, { moduleUrl: '/node_modules/monaco-editor/esm/vs/base/browser/dompurify/dompurify.js', hook: hookName });
    expect(result.handler).toBeNull();
    expect(result.compromised).toBeUndefined();
    expect(result.text).toBe('safe');
  });
}

// 이 파일은 packages/design-system/shell-contract.spec.ts 에서 생성되었다.
// 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
// `npm run design-system:sync` 를 실행한다.
import { expect, test } from '@playwright/test';
import {
  assertShellContract,
  prepareShell,
  THEMES,
  VIEWPORTS,
} from './ds-shell-contract-e2e';
import { TEST_PRODUCT } from './product.generated';

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`${viewport.name} ${theme} 셸 계약`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await prepareShell(page, theme);
      await assertShellContract(page, TEST_PRODUCT, viewport);

      const masks = [
        page.locator(
          '.monaco-editor .cursor, .monaco-editor .cursors-layer, [data-ds-visual-mask]',
        ),
      ];
      await expect(page.locator('[data-ds-tool-header]')).toHaveScreenshot(
        `${TEST_PRODUCT.id}-${viewport.name}-${theme}-header.png`,
        { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001 },
      );
      await expect(page).toHaveScreenshot(
        `${TEST_PRODUCT.id}-${viewport.name}-${theme}-shell.png`,
        {
          animations: 'disabled',
          caret: 'hide',
          mask: masks,
          fullPage: false,
          maxDiffPixelRatio: 0.001,
        },
      );
    });
  }
}

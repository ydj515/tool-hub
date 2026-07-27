import { test } from '@playwright/test';
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
    });
  }
}

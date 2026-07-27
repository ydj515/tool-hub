import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

for (const theme of ['light', 'dark'] as const) {
  test(`프리미티브 ${theme}`, async ({ page }) => {
    const html = readFileSync(
      resolve(process.cwd(), '../packages/design-system/fixtures/primitives.html'),
      'utf8',
    );
    const css = ['ds-tokens.css', 'ds-base.css', 'ds-primitives.css']
      .map((name) => readFileSync(resolve(process.cwd(), `src/styles/${name}`), 'utf8'))
      .join('\n');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.setContent(html.replace('</head>', `<style>${css}</style></head>`));
    await page.evaluate((value) => {
      document.documentElement.setAttribute('data-theme', value);
    }, theme);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    await expect(page).toHaveScreenshot(`primitives-${theme}.png`, {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.001,
    });
  });
}

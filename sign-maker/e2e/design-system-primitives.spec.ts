import { expect, test } from '@playwright/test';

test('ThemeToggle은 Chromium에서 36px 버튼과 16px 아이콘 크기를 유지한다', async ({ page }) => {
  await page.goto('/e2e/fixtures/design-system-primitives.html');
  await expect(page.locator('[data-ds-theme-toggle]')).toBeVisible();

  const metrics = await page.locator('[data-ds-theme-toggle]').evaluate((button) => {
    const icon = button.querySelector('svg');
    if (!icon) throw new Error('ThemeToggle 아이콘이 렌더되지 않았다.');

    const buttonStyle = getComputedStyle(button);
    const buttonRect = button.getBoundingClientRect();
    const iconStyle = getComputedStyle(icon);
    const iconRect = icon.getBoundingClientRect();

    return {
      button: {
        display: buttonStyle.display,
        padding: buttonStyle.padding,
        width: buttonRect.width,
        height: buttonRect.height,
      },
      icon: {
        computedWidth: iconStyle.width,
        computedHeight: iconStyle.height,
        flexShrink: iconStyle.flexShrink,
        computedStrokeWidth: iconStyle.strokeWidth,
        width: iconRect.width,
        height: iconRect.height,
        strokeWidth: icon.getAttribute('stroke-width'),
      },
    };
  });

  expect(metrics).toEqual({
    button: {
      display: 'grid',
      padding: '0px',
      width: 36,
      height: 36,
    },
    icon: {
      computedWidth: '16px',
      computedHeight: '16px',
      flexShrink: '0',
      computedStrokeWidth: '2px',
      width: 16,
      height: 16,
      strokeWidth: '2',
    },
  });
});

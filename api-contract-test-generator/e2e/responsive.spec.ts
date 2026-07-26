import { expect, test, type Page } from '@playwright/test';

async function openReview(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'OpenAPI 3.1 예제' }).click();
  await page.getByRole('button', { name: '테스트 생성' }).click();
  await expect(page.getByRole('heading', { name: '테스트 검토' })).toBeVisible();
}

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`${width}px에서 콘텐츠가 겹치거나 가로로 넘치지 않는다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openReview(page);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    if (width >= 1200) {
      const endpoint = await page.getByRole('region', { name: '엔드포인트 목록' }).boundingBox();
      const list = await page.getByRole('region', { name: '테스트 목록' }).boundingBox();
      const detail = await page.getByRole('region', { name: '테스트 상세' }).boundingBox();
      expect(endpoint && list && detail).toBeTruthy();
      expect(endpoint!.x + endpoint!.width).toBeLessThanOrEqual(list!.x + 0.5);
      expect(list!.x + list!.width).toBeLessThanOrEqual(detail!.x + 0.5);
    }

    if (width >= 768 && width < 1200) {
      const endpoint = await page.getByRole('region', { name: '엔드포인트 목록' }).boundingBox();
      const list = await page.getByRole('region', { name: '테스트 목록' }).boundingBox();
      const detail = await page.getByRole('region', { name: '테스트 상세' }).boundingBox();
      expect(endpoint && list && detail).toBeTruthy();
      expect(endpoint!.y + endpoint!.height).toBeLessThanOrEqual(list!.y + 0.5);
      expect(list!.x + list!.width).toBeLessThanOrEqual(detail!.x + 0.5);
    }

    if (width < 768) {
      const visibleRegions = await page.locator('[aria-label="엔드포인트 목록"], [aria-label="테스트 목록"], [aria-label="테스트 상세"]').evaluateAll((elements) => elements.filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
      }).length);
      expect(visibleRegions).toBe(1);

      await page.getByRole('button', { name: 'POST /users 테스트 보기' }).click();
      const lastCard = page.locator('.test-card').last();
      await lastCard.scrollIntoViewIfNeeded();
      const coveredByFixedAction = await lastCard.evaluate((card) => {
        const cardRect = card.getBoundingClientRect();
        return [...document.querySelectorAll('button')].some((button) => {
          const style = getComputedStyle(button);
          if (style.position !== 'fixed' && style.position !== 'sticky') return false;
          const rect = button.getBoundingClientRect();
          return !(rect.right <= cardRect.left || rect.left >= cardRect.right || rect.bottom <= cardRect.top || rect.top >= cardRect.bottom);
        });
      });
      expect(coveredByFixedAction).toBe(false);

      await page.getByRole('searchbox', { name: '테스트 검색' }).fill('email');
      await page.getByRole('button', { name: '필수 email 필드 누락 상세' }).click();
      await page.getByRole('button', { name: '테스트 목록으로 돌아가기' }).click();
      await expect(page.getByRole('searchbox', { name: '테스트 검색' })).toHaveValue('email');
    }

    const heading = await page.getByRole('heading', { name: '테스트 검토' }).boundingBox();
    const action = await page.getByRole('button', { name: '내보내기 단계로' }).boundingBox();
    expect(heading && action).toBeTruthy();
    const intersects = !(heading!.x + heading!.width <= action!.x
      || action!.x + action!.width <= heading!.x
      || heading!.y + heading!.height <= action!.y
      || action!.y + action!.height <= heading!.y);
    expect(intersects).toBe(false);
  });
}

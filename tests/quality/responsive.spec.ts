import { test, expect, type Page } from '@playwright/test';

const base = process.env.BASE_URL || 'https://qaoci.quickheal.co.in';
const product = process.env.PRODUCT_URL || 'https://qaoci.quickheal.co.in/qh-drps';
const renew = process.env.RENEW_URL || 'https://qaoci.quickheal.co.in/quick-heal-product-renew';

async function openPage(page: Page, url: string) {
  return page.goto(url, { waitUntil: 'commit', timeout: 60_000 });
}
async function noMajorOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content - dimensions.viewport, `Horizontal overflow: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(24);
}

test('@smoke @responsive homepage mobile layout', async ({ page }) => {
  await openPage(page, base);
  await page.locator('body').waitFor({ state: 'attached', timeout: 15_000 });
  await noMajorOverflow(page);
});
test('@responsive renewal page mobile layout', async ({ page }) => {
  await openPage(page, renew);
  await page.locator('body').waitFor({ state: 'attached', timeout: 15_000 });
  await noMajorOverflow(page);
});
test('@responsive DRPS product page mobile layout', async ({ page }) => {
  await openPage(page, product);
  await page.locator('body').waitFor({ state: 'attached', timeout: 15_000 });
  await noMajorOverflow(page);
});

import { test, expect, type Page } from '@playwright/test';

const liveUrl = process.env.PRODUCTION_BASE_URL || 'https://quickheal.co.in';

async function openLiveSite(page: Page) {
  const response = await page.goto(liveUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000
  });
  expect(response, 'No response received from the Quick Heal live website.').not.toBeNull();
  expect(response!.status(), 'Production homepage returned an HTTP error.').toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
  return response!;
}

test.describe('Quick Heal production website | read-only checks', () => {
  test('homepage is reachable over HTTPS', async ({ page }) => {
    const response = await openLiveSite(page);
    expect(page.url()).toMatch(/^https:\/\//);
    expect(response.status()).toBeLessThan(400);
  });

  test('homepage has a meaningful title and visible content', async ({ page }) => {
    await openLiveSite(page);
    expect((await page.title()).trim().length).toBeGreaterThan(2);
    const bodyText = (await page.locator('body').innerText()).trim();
    expect(bodyText.length).toBeGreaterThan(30);
  });

  test('homepage exposes a viewport setting and renders at the selected device size', async ({ page }) => {
    await openLiveSite(page);
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveCount(1);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth
    }));
    expect(dimensions.content - dimensions.viewport, 'Unexpected horizontal overflow').toBeLessThanOrEqual(40);
  });

  test('visible navigation links have usable destinations', async ({ page }) => {
    await openLiveSite(page);
    const links = page.locator('a:visible');
    const count = await links.count();
    expect(count, 'No visible links found on homepage').toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 100); i++) {
      const href = (await links.nth(i).getAttribute('href') || '').trim();
      expect(href, `Visible link at index ${i} has an empty href`).not.toBe('');
    }
  });

  test('homepage has no uncaught browser JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await openLiveSite(page);
    await page.waitForTimeout(1_000);
    expect(errors, 'Uncaught JavaScript errors were detected').toEqual([]);
  });

  test('records production security headers for review', async ({ page }, testInfo) => {
    const response = await openLiveSite(page);
    const headers = await response.allHeaders();
    const expected = ['strict-transport-security', 'x-content-type-options', 'content-security-policy'];
    const present = expected.filter(name => Boolean(headers[name]));
    const missing = expected.filter(name => !headers[name]);
    await testInfo.attach('production-security-header-observation.json', {
      body: JSON.stringify({ checked: expected, present, missing }, null, 2),
      contentType: 'application/json'
    });
    testInfo.annotations.push({
      type: 'security-header-observation',
      description: `Present: ${present.join(', ') || 'none'}; not observed: ${missing.join(', ') || 'none'}`
    });
    expect(response.status()).toBeLessThan(400);
  });
});

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


test.describe('Quick Heal production purchase journey | non-transactional', () => {
  test('customer can select a product and reach the cart without placing an order', async ({ page }) => {
    const catalogueUrl = new URL('/home-users', liveUrl).toString();
    const response = await page.goto(catalogueUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000
    });
    expect(response, 'No response from the Quick Heal product catalogue').not.toBeNull();
    expect(response!.status()).toBeLessThan(400);

    const productName = 'Quick Heal Total Security';
    // The live site renders hidden desktop/mobile navigation copies of product links.
    // Target the actual visible product-card link instead of the first matching hidden anchor.
    const productLink = page.locator(
      'a[href*="/home-users/quick-heal-total-security"]:visible'
    ).filter({ hasText: productName }).first();
    await expect(
      productLink,
      'Visible Quick Heal Total Security product link was not found in the catalogue'
    ).toBeVisible();
    await productLink.scrollIntoViewIfNeeded();

    // Find the nearest visible product card that contains the plan selectors and Buy Now action.
    const productCard = productLink.locator(
      'xpath=ancestor::*[.//select and .//*[contains(normalize-space(), "Buy Now")]][1]'
    );
    await expect(productCard, 'Could not identify the product card with plan selectors').toBeVisible();

    const selectors = productCard.locator('select');
    await expect(selectors, 'Duration and license selectors should be available').toHaveCount(2);

    for (let i = 0; i < 2; i++) {
      const select = selectors.nth(i);
      const options = await select.locator('option').evaluateAll(items =>
        items.map(option => ({
          value: (option as HTMLOptionElement).value,
          text: (option as HTMLOptionElement).textContent?.trim() || ''
        }))
      );
      const validOption = options.find(option => option.value && !/select|please/i.test(option.text));
      expect(validOption, `Selector ${i + 1} has no selectable plan option`).toBeTruthy();
      await select.selectOption(validOption!.value);
    }

    // Buy Now may add the selected product to this browser session's cart.
    // The test deliberately stops at cart/review and never submits checkout/payment.
    const buyNow = productCard.locator('a, button, input[type="button"], input[type="submit"]')
      .filter({ hasText: /Buy Now/i })
      .first();
    await expect(buyNow, 'Buy Now action is not available for the selected product').toBeVisible();

    await Promise.all([
      page.waitForLoadState('domcontentloaded').catch(() => undefined),
      buyNow.click()
    ]);

    await expect.poll(
      async () => {
        const url = page.url().toLowerCase();
        const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
        return /cart|checkout|basket/.test(url) || /my cart|shopping cart|order summary/.test(body);
      },
      { message: 'Buy Now did not navigate to a cart or checkout review state', timeout: 20_000 }
    ).toBeTruthy();

    const currentUrl = page.url();
    const bodyText = (await page.locator('body').innerText()).toLowerCase();
    await test.info().attach('production-cart-checkpoint.txt', {
      body: [
        `Product selected: ${productName}`,
        `Reached URL: ${currentUrl}`,
        `Cart/checkout review text detected: ${/my cart|shopping cart|order summary/.test(bodyText)}`,
        'Payment and order submission were not attempted.'
      ].join('\n'),
      contentType: 'text/plain'
    });

    expect(
      /cart|checkout|basket/.test(currentUrl.toLowerCase()) ||
      /my cart|shopping cart|order summary/.test(bodyText),
      'Expected to reach cart or checkout review'
    ).toBeTruthy();
  });
});

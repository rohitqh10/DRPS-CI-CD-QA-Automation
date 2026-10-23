import { test, expect } from '@playwright/test';

const base = process.env.BASE_URL || 'https://qaoci.quickheal.co.in';

test('homepage document timing smoke budget', async ({ page }) => {
  const response = await page.goto(base, { waitUntil: 'commit', timeout: 60_000 });
  expect(response, 'No homepage response; see staging reachability diagnostics in workflow logs.').not.toBeNull();
  expect(response!.status()).toBeLessThan(500);
  await page.locator('body').waitFor({ state: 'attached', timeout: 15_000 });

  const timing = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return entry ? {
      responseMs: Math.round(entry.responseEnd - entry.requestStart),
      domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd),
      loadMs: Math.round(entry.loadEventEnd)
    } : null;
  });

  if (timing) {
    expect(timing.responseMs, 'Document response budget: 5 seconds').toBeLessThan(5_000);
    if (timing.loadMs > 0) expect(timing.loadMs, 'Load-event budget: 20 seconds').toBeLessThan(20_000);
  }
});

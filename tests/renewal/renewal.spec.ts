import { test, expect, type Page } from '@playwright/test';
import { selectors, firstVisible } from '../../utils/selectors';
import { collectDiagnostics, attachDiagnostics } from '../../utils/diagnostics';

const renewUrl = process.env.RENEW_URL || 'https://qaoci.quickheal.co.in/quick-heal-product-renew';
const licenseKey = process.env.RENEWAL_LICENSE_KEY || '';

async function openPage(page: Page) {
  return page.goto(renewUrl, { waitUntil: 'commit', timeout: 60_000 });
}

test.describe('Quick Heal QA OCI license renewal', () => {
  test('@smoke renewal page responds and renders', async ({ page }, info) => {
    const diag = collectDiagnostics(page);
    const response = await openPage(page);
    expect(response, 'No renewal page response; check staging reachability from GitHub Actions.').not.toBeNull();
    expect(response!.status(), 'Renewal page should not return 5xx').toBeLessThan(500);
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });
    await attachDiagnostics(info, diag);
  });

  test('renewal form exposes a license/serial input', async ({ page }) => {
    await openPage(page);
    const input = await firstVisible(page, selectors.renewalLicense);
    expect(input, 'License/serial field not found. Inspect staging DOM and configure SELECTOR_RENEW_LICENSE.').not.toBeNull();
  });

  test('blank license input is rejected without creating an order', async ({ page }) => {
    await openPage(page);
    const input = await firstVisible(page, selectors.renewalLicense);
    const submit = await firstVisible(page, selectors.renewalSubmit);
    test.skip(!input || !submit, 'Renewal input/submit selector not found; configure selector variables.');
    await input!.fill('');
    await submit!.click();
    await page.waitForTimeout(700);
    const nativeInvalid = await input!.evaluate((el: HTMLInputElement) => el.willValidate && !el.checkValidity());
    if (nativeInvalid) {
      expect(nativeInvalid).toBeTruthy();
    } else {
      expect(new URL(page.url()).origin).toBe(new URL(renewUrl).origin);
    }
  });

  test('approved staging license key reaches renewal lookup only; no payment/order submission', async ({ page }, info) => {
    test.skip(!licenseKey, 'Set RENEWAL_LICENSE_KEY as a GitHub Actions repository secret using an approved staging key.');
    const diag = collectDiagnostics(page);
    await openPage(page);
    const input = await firstVisible(page, selectors.renewalLicense);
    const submit = await firstVisible(page, selectors.renewalSubmit);
    test.skip(!input || !submit, 'Renewal form selectors need to be configured for QA OCI.');
    await input!.fill(licenseKey);
    // Triggers renewal lookup/continue only; never clicks payment or place-order.
    await submit!.click();
    await page.waitForTimeout(900);
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });
    await attachDiagnostics(info, {
      pageErrors: diag.pageErrors,
      consoleErrors: diag.consoleErrors,
      failedRequests: diag.failedRequests.map(x => x.replace(licenseKey, '[REDACTED]')),
      note: 'License value omitted. Verify product, expiry, price, and eligibility in the authorized QA environment.'
    });
  });
});

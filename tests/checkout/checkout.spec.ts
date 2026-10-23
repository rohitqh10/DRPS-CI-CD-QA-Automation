import { test, expect, type Page } from '@playwright/test';
import { selectors, firstVisible } from '../../utils/selectors';
import { collectDiagnostics, attachDiagnostics } from '../../utils/diagnostics';

const base = process.env.BASE_URL || 'https://qaoci.quickheal.co.in';
const product = process.env.PRODUCT_URL || 'https://qaoci.quickheal.co.in/qh-drps';
const cart = process.env.CART_URL || '';
const checkout = process.env.CHECKOUT_URL || '';

async function openPage(page: Page, url: string) {
  return page.goto(url, { waitUntil: 'commit', timeout: 60_000 });
}

test.describe('Quick Heal QA OCI DRPS checkout', () => {
  test('@smoke homepage responds and renders', async ({ page }, info) => {
    const diag = collectDiagnostics(page);
    const response = await openPage(page, base);
    expect(response, 'No homepage document response; check staging reachability from GitHub Actions.').not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });
    await attachDiagnostics(info, diag);
  });

  test('@smoke DRPS product page responds and shows Buy Now forms', async ({ page }) => {
    const response = await openPage(page, product);
    expect(response, 'No DRPS document response; check staging reachability from GitHub Actions.').not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 20_000 });
    const form = page.locator('form[action*="/checkout/cart/add"]').first();
    await expect(form, 'Magento add-to-cart form not found on DRPS product page.').toBeVisible({ timeout: 20_000 });
    await expect(form.locator('button[type="submit"], input[type="submit"]').first()).toBeVisible();
  });

  test('DRPS form contains expected product and option fields', async ({ page }) => {
    await openPage(page, product);
    const form = page.locator('form[action*="/checkout/cart/add"]').first();
    await expect(form).toBeVisible({ timeout: 20_000 });
    await expect(form.locator('input[name="product"]')).toHaveValue('89');
    await expect(form.locator('input[name="qty"]')).toHaveValue('1');
    await expect(form.locator('input[name^="options["]')).not.toHaveCount(0);
  });

  test('DRPS Buy Now adds product to cart without submitting payment', async ({ page }, info) => {
    const diag = collectDiagnostics(page);
    await openPage(page, product);
    const buyForm = page.locator('form[action*="/checkout/cart/add"]').first();
    await expect(buyForm).toBeVisible({ timeout: 20_000 });
    const submit = buyForm.locator('button[type="submit"], input[type="submit"]').first();
    await expect(submit).toBeVisible();
    // Adds the selected product to cart only. This does not submit payment or place an order.
    await submit.click({ timeout: 15_000 });
    await page.waitForTimeout(1_200);

    if (cart) {
      await openPage(page, cart);
    } else {
      const checkoutButton = await firstVisible(page, selectors.cartCheckout);
      if (checkoutButton) {
        await checkoutButton.click();
      } else {
        const bodyText = await page.locator('body').innerText().catch(() => '');
        expect(
          /checkout|cart/i.test(page.url()) || /added to your|shopping cart|cart/i.test(bodyText),
          'Buy Now was clicked but no cart confirmation or cart/checkout navigation was detected.'
        ).toBeTruthy();
      }
    }
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });
    await attachDiagnostics(info, diag);
  });

  test('checkout page renders an email field without payment submission', async ({ page }) => {
    test.skip(!checkout, 'Set CHECKOUT_URL in repository variables to an authorized staging checkout URL.');
    const response = await openPage(page, checkout);
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    expect(await firstVisible(page, selectors.email), 'Email field not found; inspect checkout DOM and configure SELECTOR_EMAIL.').not.toBeNull();
  });

  test('invalid email is rejected by native HTML validation when supported', async ({ page }) => {
    test.skip(!checkout, 'Set CHECKOUT_URL in repository variables.');
    await openPage(page, checkout);
    const email = await firstVisible(page, selectors.email);
    test.skip(!email, 'Email input not found.');
    if (await email!.getAttribute('type') !== 'email') {
      test.skip(true, 'Checkout email input is not type=email; application-specific validation is needed.');
    }
    await email!.fill('not-an-email');
    expect(await email!.evaluate((el: HTMLInputElement) => el.checkValidity())).toBeFalsy();
  });
});

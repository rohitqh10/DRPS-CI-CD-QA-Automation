import 'dotenv/config';
import type { Page } from '@playwright/test';

function list(value: string | undefined, fallback: string): string[] {
  return (value || fallback).split(',').map(s => s.trim()).filter(Boolean);
}
export const selectors = {
  addToCart: list(process.env.SELECTOR_PRODUCT_ADD_TO_CART,
    'form[action*="/checkout/cart/add"] button[type="submit"], form[action*="/checkout/cart/add"] input[type="submit"], [data-testid="add-to-cart"], button:has-text("Buy Now"), button:has-text("Add to Cart")'),
  cartCheckout: list(process.env.SELECTOR_CART_CHECKOUT,
    '[data-testid="proceed-to-checkout"], button:has-text("Proceed to Checkout"), a:has-text("Proceed to Checkout"), button:has-text("Checkout"), a:has-text("Checkout")'),
  renewalLicense: list(process.env.SELECTOR_RENEW_LICENSE,
    'input[name*="license" i], input[id*="license" i], input[placeholder*="license" i], input[name*="serial" i], input[placeholder*="serial" i]'),
  renewalSubmit: list(process.env.SELECTOR_RENEW_SUBMIT,
    'button:has-text("Renew"), button:has-text("Continue"), button:has-text("Submit"), input[type="submit"]'),
  email: list(process.env.SELECTOR_EMAIL,
    'input[type="email"], input[name*="email" i], input[id*="email" i]')
};
export async function firstVisible(page: Page, candidates: string[]) {
  for (const selector of candidates) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 800 })) return locator;
    } catch { /* Try next selector. */ }
  }
  return null;
}

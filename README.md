# DRPS CI/CD QA Automation — Quick Heal QA OCI

## What is included
- Playwright checkout/product-page tests for `https://qaoci.quickheal.co.in/qh-drps`
- Renewal page smoke and blank-input checks
- Responsive layout and basic timing checks
- Browser diagnostics and HTML report artifacts
- GitHub Actions workflow with npm caching disabled to avoid the missing-lockfile error

## GitHub Actions setup
1. Upload/replace these files in your repository.
2. Open **Settings → Pages** and choose **GitHub Actions** as the source.
3. Add repository variables under **Settings → Secrets and variables → Actions → Variables** if needed:
   - `BASE_URL` = `https://qaoci.quickheal.co.in`
   - `PRODUCT_URL` = `https://qaoci.quickheal.co.in/qh-drps`
   - `CART_URL` = optional cart URL
   - `CHECKOUT_URL` = authorized staging checkout URL
   - `RENEW_URL` = confirmed staging renewal URL
4. Optional: add `RENEWAL_LICENSE_KEY` as a repository **secret** only if it is an approved QA/staging test key.
5. Open **Actions → DRPS QA Automation - Checkout and Renewal → Run workflow**.

## Important limitations
- The workflow no longer requires a lockfile for `setup-node` caching; `npm install` installs dependencies.
- The tests are not claimed as verified against the live QA environment. GitHub Actions must be run to confirm site access and DOM selectors.
- The Buy Now test adds a product to the cart only. It does not submit payment or place a final order.
- Renewal key lookup test is skipped if no `RENEWAL_LICENSE_KEY` secret is configured.
- Generic selectors may need adjustment to the exact QA renewal and checkout DOM.
- Never store real customer/production license keys in source code, variables, logs, screenshots, or public issues.

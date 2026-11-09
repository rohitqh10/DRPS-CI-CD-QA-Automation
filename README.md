# Quick Heal | Production & QA Multi-Job Playwright CI

This repository runs two independent Playwright suites and publishes a combined GitHub Pages status summary.

## Pipeline jobs

1. **Production Live Website QA** targets `https://quickheal.co.in`. Checks are read-only: availability, HTTPS, title/content, viewport layout, visible link destinations, browser page errors, and security-header observations. It does not submit forms, place orders, make payments, or perform renewals.
2. **QA OCI Checkout & Renewal** targets `qaoci.quickheal.co.in`. It runs the existing DRPS checkout, renewal, responsive and performance suites. Any cart action and approved license lookup remain in QA only. Payment/order submission remains disabled.
3. **QA Summary & GitHub Pages Deployment** runs even if either test job fails and publishes a combined status page.

## Schedule and manual execution

- Scheduled daily at **03:30 UTC (09:00 India Standard Time)**.
- Manual execution is available under **Actions → Quick Heal | Production & QA Multi-Job Playwright CI → Run workflow**.
- GitHub scheduled workflows run from the default branch. Keep this workflow committed to the repository's default branch.

## Repository variables and secrets

Under **Settings → Secrets and variables → Actions**:

Optional variables for QA OCI:
- `QA_RUNNER_LABELS` = `["self-hosted","linux","x64"]` after DevOps registers an authorized runner. Leave unset to use GitHub-hosted Ubuntu.
- `BASE_URL` = `https://qaoci.quickheal.co.in`
- `PRODUCT_URL` = `https://qaoci.quickheal.co.in/qh-drps`
- `CART_URL` = authorized QA cart URL, if needed
- `CHECKOUT_URL` = authorized QA checkout URL
- `RENEW_URL` = `https://qaoci.quickheal.co.in/quick-heal-product-renew`

Optional secret:
- `RENEWAL_LICENSE_KEY` = approved QA/staging test key only. Never use a production/customer key or put a key in source code.

## QA OCI network access

Previous GitHub-hosted runner logs showed that `qaoci.quickheal.co.in` timed out. This workflow checks QA access first and skips the QA Playwright run if the runner cannot reach the staging site, then marks the QA job as failed with a clear message.

If QA OCI is restricted to the company network, ask Quick Heal DevOps to register an authorized self-hosted GitHub Actions runner with access to QA OCI. After it is registered, add the repository variable `QA_RUNNER_LABELS` with the JSON value `["self-hosted","linux","x64"]` (or the exact labels DevOps assigns). The workflow uses GitHub-hosted Ubuntu when this variable is absent. Do not expose the QA environment publicly just to make the workflow pass.

## Reports and evidence

Each test job uploads a separate artifact:
- `quickheal-production-report-<run>`
- `quickheal-qa-oci-report-<run>`

Artifacts include Playwright HTML report output, JUnit XML, and failure evidence where generated. Screenshots, videos and traces are retained on failures. Artifacts are retained for 14 days. The GitHub Pages summary links to the run; detailed reports are downloaded from the run's Artifacts section.

Enable **Settings → Pages → Build and deployment → Source: GitHub Actions** if Pages has not been configured for this repository.

## Safety and scope

- Production suite is read-only and targets the public website and product catalogue. The purchase journey selects a product plan and proceeds to the cart/checkout review checkpoint only; it does not submit customer details, create an order, initiate payment, or perform renewal.
- Checkout and renewal suites are executed only against QA OCI.
- Payment submission is not part of the automated run.
- Security-header observations are attached to the report for review; absence is not automatically treated as a confirmed vulnerability.
- These checks are starter automation and require execution review against the current websites. They are not a formal security audit or a full Core Web Vitals audit.

import type { Page, TestInfo } from '@playwright/test';
export function collectDiagnostics(page: Page) {
  const data = { pageErrors: [] as string[], consoleErrors: [] as string[], failedRequests: [] as string[] };
  page.on('pageerror', e => data.pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') data.consoleErrors.push(m.text()); });
  page.on('requestfailed', r => data.failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText || 'failed'}`));
  return data;
}
export async function attachDiagnostics(testInfo: TestInfo, data: unknown) {
  await testInfo.attach('browser-diagnostics.json', {
    body: Buffer.from(JSON.stringify(data, null, 2)),
    contentType: 'application/json'
  });
}

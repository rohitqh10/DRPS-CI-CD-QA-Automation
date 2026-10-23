import fs from 'node:fs';
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function url(s) { try { const u = new URL(s); return ['https:','http:'].includes(u.protocol) ? esc(u.href) : '#'; } catch { return '#'; } }
const outcome = process.env.TEST_OUTCOME || 'unknown';
const status = outcome === 'success' ? 'PASSED' : outcome === 'failure' ? 'FAILED' : outcome.toUpperCase();
const color = outcome === 'success' ? '#067647' : '#b42318';
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quick Heal QA OCI test run</title><style>body{font:16px/1.5 system-ui;margin:0;background:#f5f7fb;color:#182230}main{max-width:760px;margin:8vh auto;padding:28px;background:white;border:1px solid #e3e8ef;border-radius:16px}h1{font-size:1.5rem}.status{font-weight:800;color:${color}}.note{background:#f2f4f7;padding:12px;border-radius:8px}a{color:#175cd3}</style></head><body><main><h1>Quick Heal QA OCI — Checkout &amp; Renewal QA</h1><p class="status">Run status: ${esc(status)}</p><p>Run #${esc(process.env.RUN_NUMBER || 'local')} · Commit <code>${esc((process.env.RUN_SHA || '').slice(0,12))}</code></p><p><a href="${url(process.env.RUN_URL || '#')}">Open GitHub Actions run and detailed artifacts</a></p><div class="note"><b>Privacy:</b> This page does not include license keys, customer data, screenshots, traces, or request bodies.</div></main></body></html>`;
fs.mkdirSync('pages-summary', {recursive:true});
fs.writeFileSync('pages-summary/index.html', html);

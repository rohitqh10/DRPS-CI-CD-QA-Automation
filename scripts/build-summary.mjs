import fs from 'node:fs';

function esc(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function statusLabel(value) {
  const s = String(value || 'unknown').toUpperCase();
  return ['SUCCESS', 'FAILURE', 'CANCELLED', 'SKIPPED'].includes(s) ? s : 'UNKNOWN';
}
function statusColor(value) {
  return value === 'success' ? '#067647' : value === 'failure' ? '#b42318' : '#667085';
}
function safeUrl(value) {
  try {
    const parsed = new URL(value);
    return ['https:', 'http:'].includes(parsed.protocol) ? esc(parsed.href) : '#';
  } catch {
    return '#';
  }
}

const production = process.env.PRODUCTION_RESULT || 'unknown';
const qa = process.env.QA_RESULT || 'unknown';
const overall = production === 'success' && qa === 'success' ? 'PASSED' : 'ATTENTION REQUIRED';
const runUrl = safeUrl(process.env.RUN_URL || '#');
const sha = esc((process.env.RUN_SHA || '').slice(0, 12));
const runNumber = esc(process.env.RUN_NUMBER || 'local');
const trigger = esc(process.env.RUN_TRIGGER || 'local');

const rows = [
  ['Production live website', 'https://quickheal.co.in', production],
  ['QA OCI checkout and renewal', 'https://qaoci.quickheal.co.in', qa]
].map(([name, target, result]) => `
  <tr><td>${esc(name)}</td><td>${esc(target)}</td>
  <td style="font-weight:700;color:${statusColor(result)}">${statusLabel(result)}</td></tr>`).join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quick Heal | Automated QA Run</title>
<style>
body{font:15px/1.55 system-ui,Arial;margin:0;background:#f4f6fa;color:#182230}
main{max-width:900px;margin:6vh auto;padding:28px;background:#fff;border:1px solid #e3e8ef;border-radius:16px}
h1{margin-top:0}.pill{display:inline-block;padding:6px 12px;border-radius:20px;background:#f2f4f7;font-weight:700}
table{border-collapse:collapse;width:100%;margin:22px 0}td,th{text-align:left;padding:13px;border-bottom:1px solid #e7ebf0}
th{background:#f8f9fc}a{color:#175cd3}.muted{color:#667085;font-size:13px}
.note{padding:14px;background:#f8f9fc;border-radius:10px}
</style></head><body><main>
<h1>Quick Heal Automated QA</h1>
<p class="pill" style="color:${overall === 'PASSED' ? '#067647' : '#b42318'}">Overall status: ${overall}</p>
<p class="muted">Run #${runNumber} · Commit ${sha} · Trigger: ${trigger}</p>
<h2>Pipeline job results</h2>
<table><thead><tr><th>Job</th><th>Target</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>
<p><a href="${runUrl}">Open GitHub Actions run, logs and downloadable reports ↗</a></p>
<div class="note"><b>Report contents:</b> Each test job uploads its own Playwright HTML report, JUnit XML, failure screenshots, videos and traces when available. Open the workflow run's Artifacts section to download them.</div>
<p class="muted">Production checks are read-only. Checkout and renewal tests execute only against QA OCI. This page does not expose license keys, customer data, screenshots or traces.</p>
</main></body></html>`;

fs.mkdirSync('pages-summary', { recursive: true });
fs.writeFileSync('pages-summary/index.html', html);

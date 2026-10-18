// Optional cloud-only investigation: one game, one page, bounded duration.
// Prints coarse evidence, never HAR, URLs, query values, headers or messages.
const { chromium } = require('playwright');
const args = process.argv.slice(2);
if (args.includes('--help') || process.env.HEAVENLY_LIVE_CHECK !== '1') {
  console.log('Opt in with HEAVENLY_LIVE_CHECK=1. Usage: node test/browser/coolmath_live.cjs --game papas|boba [--proxy https://heavenly-preview.example] [--seconds 45]');
  console.log('Run in a controlled cloud environment, one invocation at a time. Counts/canvas presence do not prove gameplay.');
  process.exit(0);
}
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const game = option('--game', 'papas');
if (!['papas', 'boba'].includes(game)) throw new Error('Choose papas or boba');
const seconds = Math.max(20, Math.min(90, Number(option('--seconds', '45')) || 45));
const remote = 'https://www.coolmathgames.com/' + (game === 'papas' ? '0-papas-freezeria' : '0-boba-simulator') + '?variant=next';
const proxy = option('--proxy', '');
let destination = remote;
if (proxy) {
  const parsed = new URL(proxy);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Use a plain HTTP(S) proxy origin');
  destination = parsed.origin + '/proxy/' + remote;
}
let browser, page, session, closing = false, timer;
const started = Date.now();
const report = { game, mode: proxy ? 'proxy' : 'original', documentLoaded: false, requests: 0, failedRequests: 0, statuses: {}, frameNavigations: 0, clientErrors: 0, consoleErrors: 0, engineErrors: 0, samples: [], canvasElements: 'Unavailable', gameInitialized: 'Unverified', interactiveGameplay: 'Unverified' };
async function finish(reason) {
  if (closing) return;
  closing = true; clearTimeout(timer);
  report.stopReason = reason; report.elapsedSeconds = Math.round((Date.now() - started) / 1000);
  if (page && reason !== 'console-error limit') {
    try {
      report.canvasElements = await Promise.race([
        Promise.all(page.frames().filter(frame => frame === page.mainFrame() || /\/play(?:[?#]|$)/.test(frame.url())).slice(0, 3).map(frame => frame.locator('canvas').count())).then(counts => counts.reduce((a, b) => a + b, 0)),
        new Promise(resolve => setTimeout(() => resolve('Unavailable (renderer unresponsive)'), 1000))
      ]);
    } catch (_) { /* unavailable is honest */ }
  }
  console.log(JSON.stringify(report, null, 2));
  await browser?.close();
}
(async () => {
  const networkProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'], ...(networkProxy ? { proxy: { server: new URL(networkProxy).origin, bypass: '127.0.0.1,localhost' } } : {}) });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  page = await context.newPage(); session = await context.newCDPSession(page);
  await session.send('Performance.enable');
  page.on('request', () => report.requests++);
  page.on('requestfailed', () => report.failedRequests++);
  page.on('response', response => { report.statuses[response.status()] = (report.statuses[response.status()] || 0) + 1; });
  page.on('framenavigated', () => report.frameNavigations++);
  page.on('pageerror', () => { report.clientErrors = Math.min(10000, report.clientErrors + 1); });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    report.consoleErrors++;
    if (/Condition|at:.*(?:core|scene|drivers)\//.test(message.text())) report.engineErrors++;
    if (report.consoleErrors >= 200) finish('console-error limit').catch(() => {});
  });
  timer = setTimeout(() => finish('time limit').catch(() => {}), seconds * 1000);
  const sample = async () => {
    if (closing) return;
    try {
      const data = await session.send('Performance.getMetrics');
      report.samples.push({ elapsedSeconds: Math.round((Date.now() - started) / 1000), ...Object.fromEntries(data.metrics.filter(metric => ['TaskDuration', 'ScriptDuration', 'JSHeapUsedSize', 'Nodes', 'Documents'].includes(metric.name)).map(metric => [metric.name, metric.value])) });
    } catch (_) { /* closing/unavailable */ }
  };
  await page.goto(destination, { waitUntil: 'domcontentloaded', timeout: 30000 }); report.documentLoaded = true;
  await sample();
  // Wait through the site's own countdown. Only click an actually visible,
  // enabled Continue control; never alter timers, ads or access checks.
  const end = Date.now() + seconds * 1000;
  let continued = false;
  while (!closing && Date.now() < end) {
    if (!continued) {
      const button = page.getByRole('button', { name: 'Continue', exact: true });
      if (await button.isVisible().catch(() => false) && await button.isEnabled().catch(() => false)) { await button.click({ timeout: 1000 }).catch(() => {}); continued = true; }
    }
    await new Promise(resolve => setTimeout(resolve, 5000)); await sample();
  }
  await finish('time limit');
})().catch(async () => {
  // Closing an unresponsive page can reject an in-flight navigation/control.
  // An intentional watchdog stop is still a successful bounded observation.
  if (!closing) { process.exitCode = 1; await finish('browser or network unavailable'); }
});

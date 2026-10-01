const { performance } = require('perf_hooks');

// Mock data objects representing proxied requests across different sites
const testRequests = [
  { url: 'https://example.com/index.html', headers: { 'user-agent': 'Mozilla/5.0' } },
  { url: 'https://google.com/search?q=test', headers: { 'user-agent': 'Mozilla/5.0', 'accept': 'text/html' } },
  { url: 'https://wikipedia.org/wiki/Main_Page', headers: { 'user-agent': 'Mozilla/5.0', 'referer': '/proxy/https://wikipedia.org/' } },
  { url: 'https://cdn.example.com/style.css', headers: { 'user-agent': 'Mozilla/5.0' } },
  { url: 'https://www.newgrounds.com/games/play', headers: { 'user-agent': 'Mozilla/5.0', 'referer': 'https://www.newgrounds.com/' } },
  { url: 'https://example.com/cdn-cgi/rum', headers: { 'user-agent': 'Mozilla/5.0' } }
];

// Existing unoptimized middleware implementations
function unoptimizedCloudflare(data) {
  if (!data.url) return;
  try {
    var parsed = data.uri || new URL(data.url);
    var hostname = parsed.hostname || parsed.host;
    var pathname = parsed.pathname || '';
    var isCdnCgi = pathname.indexOf('/cdn-cgi/') !== -1;

    if (isCdnCgi) {
      var targetOrigin = parsed.origin || (parsed.protocol + '//' + (hostname || ''));
      if (!data.headers['referer']) {
        data.headers['referer'] = targetOrigin + '/';
      }
      if (!data.headers['origin']) {
        data.headers['origin'] = targetOrigin;
      }
      if (data.headers['sec-fetch-site']) {
        data.headers['sec-fetch-site'] = 'same-origin';
      }
    }
  } catch (e) {}
}

function unoptimizedNewgrounds(data) {
  if (!data.url) return;
  try {
    var parsed = data.uri || new URL(data.url);
    var hostname = parsed.hostname || parsed.host;
    if (hostname && /(^|\.)(newgrounds\.com|ngfiles\.com|ungrounded\.net)$/i.test(hostname)) {
      if (!data.headers['referer'] || !/(^|\.)newgrounds\.com/i.test(data.headers['referer'])) {
        data.headers['referer'] = 'https://www.newgrounds.com/';
      }
      if (!data.headers['origin']) {
        data.headers['origin'] = 'https://www.newgrounds.com';
      }
      if (data.headers['sec-fetch-site']) {
        data.headers['sec-fetch-site'] = 'same-origin';
      }
      var search = parsed.search || '';
      var isXmlHttpRequest = (data.headers['x-requested-with'] && data.headers['x-requested-with'].toLowerCase() === 'xmlhttprequest') || search.indexOf('inner=') !== -1;
      if (isXmlHttpRequest) {
        data.headers['x-requested-with'] = 'XMLHttpRequest';
      }
    }
  } catch (e) {}
}

function unoptimizedHeaders(data) {
  if (!data.url) return;
  try {
    var targetUri = data.uri || new URL(data.url);

    if (data.headers && data.headers.referer) {
      var ref = data.headers.referer;
      ref = ref.replace(/^(https?:\/)([^\/])/i, '$1/$2');
      var proxyPrefixIndex = ref.indexOf('/proxy/');
      while (proxyPrefixIndex !== -1) {
        ref = ref.substring(proxyPrefixIndex + 7);
        ref = ref.replace(/^(https?:\/)([^\/])/i, '$1/$2');
        proxyPrefixIndex = ref.indexOf('/proxy/');
      }
      data.headers.referer = ref;
    }

    if (data.headers && data.headers.origin && targetUri.origin) {
      data.headers.origin = targetUri.origin;
    }
  } catch (e) {}
}

// Fast-path optimized middleware implementations
function optimizedCloudflare(data) {
  if (!data.url || data.url.indexOf('/cdn-cgi/') === -1) return;
  try {
    var parsed = data.uri || new URL(data.url);
    var hostname = parsed.hostname || parsed.host;
    var pathname = parsed.pathname || '';
    var isCdnCgi = pathname.indexOf('/cdn-cgi/') !== -1;

    if (isCdnCgi) {
      var targetOrigin = parsed.origin || (parsed.protocol + '//' + (hostname || ''));
      if (!data.headers['referer']) {
        data.headers['referer'] = targetOrigin + '/';
      }
      if (!data.headers['origin']) {
        data.headers['origin'] = targetOrigin;
      }
      if (data.headers['sec-fetch-site']) {
        data.headers['sec-fetch-site'] = 'same-origin';
      }
    }
  } catch (e) {}
}

function optimizedNewgrounds(data) {
  if (!data.url || (data.url.indexOf('newgrounds') === -1 && data.url.indexOf('ngfiles') === -1 && data.url.indexOf('ungrounded') === -1)) return;
  try {
    var parsed = data.uri || new URL(data.url);
    var hostname = parsed.hostname || parsed.host;
    if (hostname && /(^|\.)(newgrounds\.com|ngfiles\.com|ungrounded\.net)$/i.test(hostname)) {
      if (!data.headers['referer'] || !/(^|\.)newgrounds\.com/i.test(data.headers['referer'])) {
        data.headers['referer'] = 'https://www.newgrounds.com/';
      }
      if (!data.headers['origin']) {
        data.headers['origin'] = 'https://www.newgrounds.com';
      }
      if (data.headers['sec-fetch-site']) {
        data.headers['sec-fetch-site'] = 'same-origin';
      }
      var search = parsed.search || '';
      var isXmlHttpRequest = (data.headers['x-requested-with'] && data.headers['x-requested-with'].toLowerCase() === 'xmlhttprequest') || search.indexOf('inner=') !== -1;
      if (isXmlHttpRequest) {
        data.headers['x-requested-with'] = 'XMLHttpRequest';
      }
    }
  } catch (e) {}
}

function optimizedHeaders(data) {
  if (!data.url || !data.headers || (!data.headers.referer && !data.headers.origin)) return;
  try {
    var targetUri = data.uri || new URL(data.url);

    if (data.headers.referer) {
      var ref = data.headers.referer;
      ref = ref.replace(/^(https?:\/)([^\/])/i, '$1/$2');
      var proxyPrefixIndex = ref.indexOf('/proxy/');
      while (proxyPrefixIndex !== -1) {
        ref = ref.substring(proxyPrefixIndex + 7);
        ref = ref.replace(/^(https?:\/)([^\/])/i, '$1/$2');
        proxyPrefixIndex = ref.indexOf('/proxy/');
      }
      data.headers.referer = ref;
    }

    if (data.headers.origin && targetUri.origin) {
      data.headers.origin = targetUri.origin;
    }
  } catch (e) {}
}

function cloneReq(req) {
  return {
    url: req.url,
    headers: Object.assign({}, req.headers)
  };
}

const ITERATIONS = 200000;

// Warmup
for (let i = 0; i < 10000; i++) {
  testRequests.forEach(req => {
    const r1 = cloneReq(req);
    unoptimizedCloudflare(r1);
    unoptimizedNewgrounds(r1);
    unoptimizedHeaders(r1);

    const r2 = cloneReq(req);
    optimizedCloudflare(r2);
    optimizedNewgrounds(r2);
    optimizedHeaders(r2);
  });
}

// Measure Unoptimized
const startUnopt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const req = testRequests[i % testRequests.length];
  const r = cloneReq(req);
  unoptimizedCloudflare(r);
  unoptimizedNewgrounds(r);
  unoptimizedHeaders(r);
}
const timeUnopt = performance.now() - startUnopt;

// Measure Optimized
const startOpt = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const req = testRequests[i % testRequests.length];
  const r = cloneReq(req);
  optimizedCloudflare(r);
  optimizedNewgrounds(r);
  optimizedHeaders(r);
}
const timeOpt = performance.now() - startOpt;

const opsUnopt = (ITERATIONS / (timeUnopt / 1000)).toFixed(0);
const opsOpt = (ITERATIONS / (timeOpt / 1000)).toFixed(0);
const speedup = ((timeUnopt - timeOpt) / timeUnopt * 100).toFixed(2);

console.log(`--- REQUEST MIDDLEWARE BENCHMARK RESULTS ---`);
console.log(`Iterations: ${ITERATIONS}`);
console.log(`Unoptimized Time: ${timeUnopt.toFixed(2)} ms (${opsUnopt} ops/sec)`);
console.log(`Optimized Time:   ${timeOpt.toFixed(2)} ms (${opsOpt} ops/sec)`);
console.log(`Improvement:      ${speedup}% faster`);

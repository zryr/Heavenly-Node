'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const app = require('../app');
const diagnostics = require('../lib/proxy-diagnostics');
const client = require('../custom-client/unblocker-client');

function renderError(error, path) {
  const result = { headers: {} };
  app.heavenlyErrorMiddleware(error, { originalUrl: path }, {
    headersSent: false,
    status(value) { result.status = value; },
    setHeader(k, v) { result.headers[k] = v; },
    send(html) { result.html = html; }
  }, () => assert.fail('unexpected next'));
  return result;
}
function report(html) {
  return html.match(/<textarea[^>]*id="heavenly-advanced-report"[^>]*>([\s\S]*?)<\/textarea>/)[1];
}

describe('Production-safe Advanced Details', () => {
  it('renders collapsed public details in hosted production without enabling developer diagnostics', () => {
    const saved = { NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL, HEAVENLY_DEV_DIAGNOSTICS: process.env.HEAVENLY_DEV_DIAGNOSTICS };
    Object.assign(process.env, { NODE_ENV: 'production', VERCEL: '1', HEAVENLY_DEV_DIAGNOSTICS: '1' });
    try {
      const result = renderError({ code: 'ENOTFOUND', message: 'private token' }, '/proxy/https://example.test/path');
      assert(result.html.includes('<summary>Advanced Details</summary>'));
      assert(!result.html.includes('<details open'));
      assert(!result.html.includes('Developer Details'));
      assert(result.html.includes('/assets/heavenly-error-details.js'));
      assert(report(result.html).includes(result.headers['X-Heavenly-Request-ID']));
      assert.equal(result.status, 502);
      assert.equal(result.headers['Cache-Control'], 'no-store');
    } finally {
      for (const [key,value] of Object.entries(saved)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  it('redacts every path, query, credential, header, body and unknown exception field before copying', () => {
    const opts = { statusCode: 502, errorType: 'secret-category', phase: 'secret-stage', code: 'secret-code', source: 'secret-source', requestId: 'secret-id', targetUrl: 'https://user:password@example.test/private-token?api_key=secret-query#secret-fragment', requestPath: '/private/server/path', stack: 'secret-stack', headers: { cookie: 'secret-cookie' }, body: 'secret-body' };
    const data = diagnostics.publicSnapshot(opts), text = diagnostics.report(data);
    for (const secret of ['secret', 'password', 'private-token', '/private/server/path', 'user:']) assert(!text.includes(secret), secret);
    assert(text.includes('example.test'));
    assert(text.includes('[path omitted]'));
    assert(text.includes('Exact cause unavailable.'));
    assert(text.includes('Redirect Count: Unavailable'));
    assert.match(data.timestamp, /^\d{4}-\d\d-\d\dT/);
  });
  it('reports only supported DNS, TLS, timeout and invalid-target distinctions', () => {
    for (const [code,status,phase] of [['ENOTFOUND',502,'dns'],['ECONNREFUSED',502,'connection'],['ETIMEDOUT',504,'timeout'],['CERT_HAS_EXPIRED',502,'tls'],['ERR_INVALID_URL',400,'validation']]) {
      const result = renderError({ code, message: 'secret-stack' }, '/proxy/https://example.test/');
      assert.equal(result.status, status);
      assert(report(result.html).includes('Failure Stage: ' + phase));
      assert(!report(result.html).includes('secret-stack'));
    }
    const unknown = renderError({ code: 'EPROTO', message: 'unknown message' }, '/proxy/https://example.test/');
    assert(report(unknown.html).includes('Exact cause unavailable.'));
    assert(report(unknown.html).includes('Source: proxy'));
  });
  it('does not turn an upstream 404 into a proxy error page', () => {
    const stream = {};
    const data = { url: 'https://example.test/missing', remoteResponse: { statusCode: 404 }, contentType: 'text/html', stream, headers: { 'x-content-type-options': 'nosniff' } };
    app.serverErrorResponseMiddleware(data);
    assert.equal(data.stream, stream);
    assert.equal(data.headers['x-content-type-options'], 'nosniff');
  });
  it('has a storage-free clipboard fallback that selects only the sanitized report', async () => {
    const handlers = {};
    const text = { value: 'Heavenly Node — Proxy Diagnostics\nBrowser: Unavailable', focus() {}, select() { this.selected = true; }, setSelectionRange() {} };
    const button = { hidden: true, addEventListener(name, fn) { handlers[name] = fn; } }, status = {};
    const sandbox = { document: { readyState: 'complete', getElementById: id => ({ 'heavenly-advanced-report': text, 'heavenly-advanced-copy': button, 'heavenly-advanced-copy-status': status })[id] }, navigator: { userAgent: 'Mozilla Firefox/150', clipboard: { writeText: () => Promise.reject(new Error('denied')) } } };
    Object.defineProperty(sandbox, 'localStorage', { get() { throw new Error('must not read storage'); } });
    vm.runInNewContext(fs.readFileSync(require.resolve('../public/assets/heavenly-error-details.js'), 'utf8'), sandbox);
    assert.equal(button.hidden, false); assert(text.value.includes('Browser: Firefox'));
    handlers.click(); await Promise.resolve(); await Promise.resolve();
    assert.equal(text.selected, true); assert(status.textContent.includes('selected'));
  });
});

describe('Embedded and responsive resource resolution', () => {
  const location = new URL('https://heavenly.test/proxy/https://example.test/game/play');
  const config = { prefix: '/proxy/', url: 'https://example.test/game/play', documentBaseUrl: () => 'https://heavenly.test/proxy/https://example.test/sites/public/game/' };
  it('honors a document base for loader, data, wasm, images and fetch URLs', () => {
    for (const file of ['Build/loader.js','Build/game.framework.js','Build/game.data','Build/game.wasm','images/thumb.png']) {
      assert.equal(client.fixUrl(file,config,location), '/proxy/https://example.test/sites/public/game/' + file);
    }
    assert.equal(client.fixUrl('/_next/image?url=%2Fimages%2Fx.png&w=640&q=75',config,location), '/proxy/https://example.test/_next/image?url=%2Fimages%2Fx.png&w=640&q=75');
    assert.equal(client.fixUrl('/other',config,location), '/proxy/https://example.test/other');
  });
  it('reads a changed base on subsequent requests without changing native URL semantics', () => {
    let base = 'https://cdn.test/a/';
    const dynamic = { ...config, documentBaseUrl: () => base };
    assert.equal(client.fixUrl('game.js',dynamic,location), '/proxy/https://cdn.test/a/game.js');
    base = 'https://cdn.test/b/';
    assert.equal(client.fixUrl('game.js',dynamic,location), '/proxy/https://cdn.test/b/game.js');
  });
  it('retains data-URL commas, image URL commas and responsive descriptors', () => {
    const data = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    assert.equal(client.fixSrcset(data,config,location), data);
    const value = data + ' 1x, images/a,b.png 2x, /images/c.png 3x';
    const fixed = client.fixSrcset(value,config,location);
    assert.equal(fixed,data+' 1x, /proxy/https://example.test/sites/public/game/images/a,b.png 2x, /proxy/https://example.test/images/c.png 3x');
    assert.equal(client.fixSrcset(fixed,config,location), fixed);
  });
});

describe('Proxy host and native element handling regressions', () => {
  it('drops the proxy development port when constructing a remote URL', () => {
    const loc = new URL('http://heavenly.test:8090/proxy/https://example.test/game');
    assert.equal(client.fixUrl('http://heavenly.test:8090/cmg/toppicks.json', { prefix: '/proxy/', url: 'https://example.test/game' }, loc), '/proxy/https://example.test/cmg/toppicks.json');
  });
});

describe('Invalid targets fail before outbound proxy requests', () => {
  const request = require('supertest');
  for (const path of ['/proxy/https://', '/proxy/https://%', '/proxy/file:///private/file', '/proxy/javascript:alert(1)']) {
    it('returns a classified 400 for ' + path, async () => {
      const response = await request(app).get(path).expect(400);
      assert(report(response.text).includes('Invalid Target Address'));
      assert(report(response.text).includes('Failure Stage: validation'));
      assert(report(response.text).includes('Retryable: No'));
    });
  }
});

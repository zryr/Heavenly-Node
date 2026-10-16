'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const vm = require('node:vm');
const fs = require('node:fs');
const request = require('supertest');
const app = require('../app');
const client = require('../custom-client/unblocker-client');
const navigation = require('../public/assets/heavenly-navigation');
const icons = require('../public/assets/heavenly-icons');
const diagnostics = require('../lib/proxy-diagnostics');
const blankWindow = require('./helpers/wrapper.cjs');
const parseRelativeUrl = require('./fixtures/next-relative-url');

function withEnv(values, fn) {
  const saved = {};
  for (const key of Object.keys(values)) { saved[key] = process.env[key]; if (values[key] === undefined) delete process.env[key]; else process.env[key] = values[key]; }
  const restore = () => { for (const key of Object.keys(saved)) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } };
  try { const result = fn(); if (result && result.then) return result.finally(restore); restore(); return result; }
  catch (error) { restore(); throw error; }
}

describe('Framework URL validation and widget helpers', () => {
  it('passes the Next.js origin-validation contract for canonical and collapsed proxy paths', () => {
    const origin = 'https://heavenly.test';
    const sandbox = { URL, window: { location: new URL(origin + '/proxy/https://www.coolmathgames.com/') } };
    vm.createContext(sandbox);
    vm.runInContext(parseRelativeUrl.toString(), sandbox);
    for (const path of ['/proxy/https://www.coolmathgames.com/', '/proxy/https:/www.coolmathgames.com/', '/0-snake', '/_next/data/build/game.json?x=1']) {
      assert.equal(sandbox.parseRelativeUrl(path), new URL(path, origin).pathname);
    }
    assert.throws(() => sandbox.parseRelativeUrl('https://other.test/'), /invalid relative URL/);
  });
  it('reproduces the old constructor defect independently of a missing script or a redirect', () => {
    function BrokenURL(value, base) { return new URL(typeof value === 'string' && value.startsWith('/proxy/') ? value.slice(7).replace(/^(https?:\/)([^/])/i, '$1/$2') : value, base); }
    const sandbox = { URL: BrokenURL, window: { location: new URL('https://heavenly.test/proxy/https://www.coolmathgames.com/') } };
    vm.createContext(sandbox); vm.runInContext(parseRelativeUrl.toString(), sandbox);
    assert.throws(() => sandbox.parseRelativeUrl('/proxy/https:/www.coolmathgames.com/'), /invalid relative URL/);
  });
  it('repairs collapsed paths at rewriting boundaries without changing canonical absolute presentation', () => {
    const location = new URL('https://heavenly.test/proxy/https:/example.test/first');
    const config = { prefix: '/proxy/', url: 'https://example.test/first' };
    assert.equal(client.fixUrl('/proxy/https:/example.test/second', config, location), '/proxy/https://example.test/second');
    assert.equal(client.fixUrl('https://heavenly.test/proxy/https:/example.test/second', config, location), 'https://heavenly.test/proxy/https://example.test/second');
    assert.equal(client.fixUrl('/_next/static/app.js', config, location), '/proxy/https://example.test/_next/static/app.js');
  });
  it('renders shared presets, unknown-preset fallback and custom URL selection', () => {
    assert.equal(icons.presets.length, 30);
    for (const item of icons.presets) assert.match(client.getPresetSvg('preset:' + item.id), /^<svg/);
    assert.match(client.getPresetSvg('preset:missing'), /<circle/);
    assert.equal(client.getPresetSvg('https://example.test/icon.png'), null);
    assert(!client.getPresetSvg('preset:star', '"><script>').includes('<script>'));
  });
  it('keeps blank-load races and frame errors in the wrapper, and Home leaves for Heavenly', () => {
    const win = blankWindow();
    const url = 'https://heavenly.test/proxy/https://fmhy.net/video#anime-streaming';
    const wrapper = navigation.mountWrapper(win, url, {});
    wrapper.frame.contentWindow = { location: { href: 'about:blank' } };
    wrapper.frame.onload(); assert.equal(win.location.href, 'about:blank'); assert.equal(wrapper.ready, false);
    wrapper.frame.contentWindow.location.href = url;
    wrapper.frame.onload(); assert.equal(wrapper.ready, true);
    wrapper.frame.onerror(); wrapper.frame.onerror(); assert.equal(win.location.href, 'about:blank');
    assert(!wrapper.frame.attributes.sandbox.includes('allow-top-navigation'));
    // Use the actual registered child to verify widget routing.
    const child = wrapper.frame.contentWindow;
    child.parent = win; child.location.origin = 'https://heavenly.test';
    client.goHeavenlyHome(child, { proxyOrigin: 'https://heavenly.test' });
    assert.equal(win.location.href, 'https://heavenly.test/');
  });
});

describe('Local upstream redirect attribution and security', () => {
  let fixture, remote, received;
  before(done => {
    received = [];
    fixture = http.createServer((req, res) => {
      received.push(req.url);
      if (req.url === '/redirect') { res.writeHead(308, { Location: '/game' }); res.end(); return; }
      if (req.url === '/missing.js') { res.writeHead(404, { 'Content-Type': 'text/html', 'X-Content-Type-Options': 'nosniff' }); res.end('<h1>Missing</h1>'); return; }
      if (req.url === '/restricted') { res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; script-src 'self'"); res.setHeader('X-Frame-Options', 'DENY'); }
      res.setHeader('Content-Type', req.url.endsWith('.js') ? 'application/javascript' : 'text/html');
      res.end(req.url.endsWith('.js') ? 'window.fixtureLoaded=true;' : '<!doctype html><head><title>Fixture</title></head><body>Local fixture</body>');
    }).listen(0, '127.0.0.1', () => { remote = 'http://127.0.0.1:' + fixture.address().port; done(); });
  });
  after(done => { fixture.closeAllConnections(); fixture.close(done); });
  it('does not emit 308s for canonical or collapsed document/static-resource requests', async () => {
    for (const path of ['/', '/_next/static/app.js', '/_next/data/build/game.json']) {
      for (const base of [remote, remote.replace('://', ':/')]) {
        const res = await request(app).get('/proxy/' + base + path).expect(200);
        assert.equal(res.headers.location, undefined);
        assert.equal(received.at(-1), path);
      }
    }
  });
  it('preserves an upstream 308 status while rewriting its relative Location exactly once', async () => {
    const res = await request(app).get('/proxy/' + remote + '/redirect').expect(308);
    assert.equal(res.headers.location, '/proxy/' + remote + '/game');
    await request(app).get(res.headers.location).expect(200);
    assert.equal(received.at(-1), '/game');
  });
  it('keeps MIME blocking and third-party framing restrictions', async () => {
    const missing = await request(app).get('/proxy/' + remote + '/missing.js').expect(404);
    assert.match(missing.headers['content-type'], /text\/html/);
    assert.equal(missing.headers['x-content-type-options'], 'nosniff');
    const restricted = await request(app).get('/proxy/' + remote + '/restricted').expect(200);
    assert.equal(restricted.headers['x-frame-options'], 'DENY');
    assert.equal(restricted.headers['content-security-policy'], "frame-ancestors 'none'; script-src 'self'");
  });
});

describe('Sanitized development diagnostics and error classification', () => {
  const optIn = { NODE_ENV: 'development', HEAVENLY_DEV_DIAGNOSTICS: '1', VERCEL: undefined };
  it('classifies DNS, temporary DNS, connection, TLS, timeout, response and unknown errors distinctly', () => {
    const cases = { ENOTFOUND: ['dns', 502], EAI_AGAIN: ['dns', 502], ECONNREFUSED: ['connection', 502], ECONNRESET: ['connection', 502], CERT_HAS_EXPIRED: ['tls', 502], ERR_SSL_WRONG_VERSION_NUMBER: ['tls', 502], ETIMEDOUT: ['timeout', 504], EACCES: ['unknown', 502] };
    for (const [code, [phase, status]] of Object.entries(cases)) assert.deepEqual([diagnostics.classify({ code }).phase, diagnostics.classify({ code }).status], [phase, status]);
    assert.notEqual(diagnostics.classify({ code: 'EAI_AGAIN' }).category, diagnostics.classify({ code: 'ENOTFOUND' }).category);
  });
  for (const env of [ { ...optIn, NODE_ENV: 'production' }, { ...optIn, HEAVENLY_DEV_DIAGNOSTICS: undefined }, { ...optIn, VERCEL: '1' }, { ...optIn, NODE_ENV: undefined } ]) {
    it('rejects diagnostics access unless explicitly enabled on a local development server: ' + JSON.stringify(env), () => withEnv(env, async () => {
      await request(app).get('/__heavenly/dev-diagnostics.js?debug=1').set('Cookie', 'developer=true').expect(404);
      const html = app.renderHeavenlyErrorPage({ statusCode: 502, diagnostics: { secret: 'sentinel' } });
      assert(!html.includes('Developer Details')); assert(!html.includes('sentinel'));
    }));
  }
  it('serves the dev asset without caching and sanitizes copied metadata with an allowlist', () => withEnv(optIn, async () => {
    const res = await request(app).get('/__heavenly/dev-diagnostics.js').expect(200);
    assert.equal(res.headers['cache-control'], 'no-store');
    const opts = { statusCode: 502, errorType: 'Proxy Connection Error', targetUrl: 'https://user:password@example.test/private-token?access_token=secret#token', code: 'UNCLASSIFIED', phase: 'unknown', requestPath: '/proxy/https:/example.test/private-token?secret=value', headers: { authorization: 'Bearer credential' } };
    const snapshot = JSON.stringify(diagnostics.snapshot(opts));
    for (const secret of ['password', 'private-token', 'access_token', 'secret', 'credential', 'user:']) assert(!snapshot.includes(secret), secret);
    assert(snapshot.includes('example.test')); assert(snapshot.includes('path omitted'));
    assert.equal(diagnostics.snapshot(opts).collapsedSchemeReceived, true);
    const html = app.renderHeavenlyErrorPage(opts);
    assert(html.includes('<details id="heavenly-dev-details"')); assert(html.includes('Copy Diagnostics'));
  }));
  it('does not render arbitrary exception messages and retries only on explicit action', () => {
    let html;
    app.heavenlyErrorMiddleware({ message: 'secret-token /private/server/path', code: 'UNKNOWN' }, { originalUrl: '/proxy/https://example.test/' }, { status() {}, setHeader() {}, send(body) { html = body; } }, () => {});
    assert(!html.includes('secret-token')); assert(!html.includes('/private/server/path'));
    assert(html.includes('<a href="" class="btn-action btn-primary">'));
    assert(!/setTimeout|http-equiv="refresh"/.test(html));
    assert(html.includes('target="_blank" rel="noopener"'));
  });
  it('captures no events without tab opt-in, and bounds sanitized events across reloads', () => {
    const code = fs.readFileSync(require.resolve('../lib/dev-diagnostics-client.js'), 'utf8');
    function run(active) {
      const saved = { heavenly_dev_diagnostics: String(active), heavenly_dev_events: '[{"kind":"script-error","time":1,"message":"private-token"}]' };
      const events = {};
      const sandbox = { sessionStorage: { getItem: key => saved[key], setItem: (key, value) => saved[key] = value }, document: { readyState: 'complete', getElementById() { return null; } }, addEventListener: (name, fn) => events[name] = fn };
      sandbox.window = sandbox;
      vm.runInNewContext(code, sandbox);
      for (let i=0; i<50; i++) if (events.error) events.error({ target: sandbox, message: 'secret', filename: 'https://user:password@test/private?token=x' });
      return { saved, events };
    }
    assert.deepEqual(Object.keys(run(false).events), []);
    const result = run(true);
    const entries = JSON.parse(result.saved.heavenly_dev_events);
    assert.equal(entries.length, 30);
    assert(entries.every(entry => Object.keys(entry).sort().join(',') === 'kind,time'));
    assert(!result.saved.heavenly_dev_events.includes('private-token'));
  });
});

describe('Heavenly route ownership and wrapper controls', () => {
  it('serves Home, Settings and own assets with a proxied Referer', async () => {
    const referer = 'http://heavenly.test/proxy/https://fmhy.net/video';
    for (const path of ['/', '/index.html', '/settings.html', '/browse.html', '/assets/heavenly-icons.js']) {
      const response = await request(app).get(path).set('Host', 'heavenly.test').set('Referer', referer).expect(200);
      assert.equal(response.headers.location, undefined);
      if (path.endsWith('.js')) assert.match(response.headers['content-type'], /javascript/);
      else assert.match(response.text, /Heavenly|heavenly/);
    }
  });
  it('accepts Home messages only from the registered same-origin frame', () => {
    const win = blankWindow();
    const wrapper = navigation.mountWrapper(win, 'https://heavenly.test/proxy/https://fmhy.net/video', {});
    wrapper.frame.contentWindow = {};
    for (const event of [{ source: {}, origin: 'https://heavenly.test', data: 'heavenly:home' }, { source: wrapper.frame.contentWindow, origin: 'https://other.test', data: 'heavenly:home' }]) win.listeners.message(event);
    assert.equal(win.location.href, 'about:blank');
    win.listeners.message({ source: wrapper.frame.contentWindow, origin: 'https://heavenly.test', data: 'heavenly:home' });
    assert.equal(win.location.href, 'https://heavenly.test/');
  });
  it('commits an initially empty blank document once before mounting, without rewriting its address', () => {
    const opener = blankWindow(), blank = blankWindow();
    const timers = [], navigationCalls = [];
    blank.history = { length: 0 };
    blank.location.replace = value => navigationCalls.push(value);
    opener.open = () => blank; opener.setTimeout = fn => timers.push(fn);
    navigation.openBlank(opener, 'https://heavenly.test/proxy/https://example.test/', {});
    assert.deepEqual(navigationCalls, ['about:blank']);
    assert.equal(blank.document.getElementById('heavenly-wrapper-frame'), undefined);
    blank.listeners.load(); timers.forEach(fn => fn());
    assert.equal(blank.document.body.children.filter(child => child.tagName === 'IFRAME').length, 1);
    assert.equal(blank.location.href, 'about:blank');
  });
});

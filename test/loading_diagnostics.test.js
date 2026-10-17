'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(require.resolve('../lib/dev-diagnostics-client'), 'utf8');

function fixture(active) {
  const storage = { heavenly_dev_diagnostics: String(active) }, listeners = {};
  let writes = 0, printed = 0, observed = 0;
  const response = { ok: true, status: 200 }, opaque = { ok: false, status: 0, type: 'opaque' }, rejected = new Error('private-body');
  const nativeFetch = (input, options) => input === 'reject' ? Promise.reject(rejected) : Promise.resolve(input === 'fail' ? { ok: false, status: 404 } : input === 'opaque' ? opaque : response);
  const nativeError = () => printed++;
  let observer;
  const sandbox = {
    sessionStorage: { getItem: k => storage[k], setItem(k, v) { writes++; storage[k] = v; } },
    document: { readyState: 'complete', getElementById() { return null; }, querySelectorAll() { return []; } },
    addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
    console: { error: nativeError }, fetch: nativeFetch,
    PerformanceObserver: class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe() { observed++; }
      takeRecords() { return []; }
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox); vm.runInContext(code, sandbox);
  return { sandbox, storage, response, opaque, rejected, nativeFetch, nativeError, observer,
    emit(name, event) {
      if (event.target === sandbox) event.target = vm.runInContext('window', sandbox);
      for (const fn of listeners[name] || []) fn(event);
    },
    get writes() { return writes; }, get printed() { return printed; }, get observed() { return observed; } };
}

describe('Opt-in development loading diagnostics', () => {
  it('installs no instrumentation or loading view without the tab opt-in', () => {
    const f = fixture(false);
    assert.equal(f.sandbox.fetch, f.nativeFetch);
    assert.equal(f.sandbox.console.error, f.nativeError);
    assert.equal(f.sandbox.__heavenlyDevDiagnostics, undefined);
    assert.equal(f.observed, 0); assert.equal(f.writes, 0);
  });
  it('counts an error flood with a fixed storage budget and never suppresses console calls', () => {
    const f = fixture(true);
    for (let i = 0; i < 11000; i++) f.sandbox.console.error('private-token /server/path', { cookie: 'private-cookie' });
    assert.equal(f.printed, 11000);
    assert(f.writes <= 30);
    const snapshot = f.sandbox.__heavenlyDevDiagnostics.snapshot();
    assert.equal(snapshot.counts['console-error'], 10000);
    assert.equal(snapshot.events.length, 30);
    assert(!JSON.stringify(f.storage).includes('private'));
    assert(!f.sandbox.__heavenlyDevDiagnostics.report().includes('private'));
  });
  it('preserves successful fetch responses, HTTP errors and rejection identity', async () => {
    const f = fixture(true), fetch = f.sandbox.fetch;
    assert.equal(await fetch('ok', { method: 'POST', body: 'private-body' }), f.response);
    assert.equal((await fetch('fail')).ok, false);
    assert.equal(await fetch('opaque'), f.opaque);
    await assert.rejects(fetch('reject'), error => error === f.rejected);
    const data = f.sandbox.__heavenlyDevDiagnostics.snapshot();
    assert.equal(data.counts['http-error'], 1); assert.equal(data.counts['fetch-error'], 1);
    assert(!JSON.stringify(data).includes('private-body'));
  });
  it('reports only bounded coarse resource observations, never resource names', () => {
    const f = fixture(true);
    const entries = Array.from({ length: 100 }, (_, i) => ({ name: 'https://user:password@private.test/private-path?token=' + i }));
    f.observer.callback({ getEntries: () => entries });
    f.observer.callback({ getEntries: () => entries.slice(0, 3) });
    const data = f.sandbox.__heavenlyDevDiagnostics.snapshot();
    assert.equal(data.sampledRequests, 103); assert.equal(data.repeatedRequests, 3); assert.equal(data.sampledUniqueLimit, 64);
    const report = f.sandbox.__heavenlyDevDiagnostics.report();
    for (const secret of ['private.test', 'private-path', 'password', '?token=']) assert(!report.includes(secret));
    assert(report.includes('not proof of duplicate downloads'));
    assert.equal(data.interactiveGameplay, 'Unavailable');
  });
  it('distinguishes subsequent frame loads from errors without inferring an unexpected redirect', () => {
    const f = fixture(true), target = { tagName: 'IFRAME', src: 'https://private.test/?token=private' };
    f.emit('load', { target }); f.emit('load', { target }); f.emit('error', { target });
    const data = f.sandbox.__heavenlyDevDiagnostics.snapshot();
    assert.equal(data.counts['frame-load'], 2); assert.equal(data.counts['subsequent-frame-load'], 1); assert.equal(data.counts['frame-error'], 1);
    assert(!JSON.stringify(data).includes('private'));
  });
  it('does not install another wrapper, observer or listener when loaded twice', () => {
    const f = fixture(true), fetch = f.sandbox.fetch, error = f.sandbox.console.error;
    vm.runInContext(code, f.sandbox);
    assert.equal(f.sandbox.fetch, fetch); assert.equal(f.sandbox.console.error, error); assert.equal(f.observed, 1);
    f.emit('error', { target: f.sandbox });
    assert.equal(f.sandbox.__heavenlyDevDiagnostics.snapshot().counts['script-error'], 1);
  });
  it('inspects at most eight immediate frames and allowlists copied child counters', () => {
    const f = fixture(true);
    const child = { querySelectorAll: () => [1], defaultView: { __heavenlyDevDiagnostics: { counters: () => ({ 'console-error': 2, 'private-token': 999, 'resource-error': 'secret' }) } } };
    f.sandbox.document.querySelectorAll = tag => tag === 'iframe' ? Array.from({ length: 100 }, () => ({ contentDocument: child })) : [];
    const data = f.sandbox.__heavenlyDevDiagnostics.snapshot();
    assert.equal(data.frames, 100); assert.equal(data.inspectedFrames, 8); assert.equal(data.canvases, 8); assert.equal(data.childCounts['console-error'], 16);
    assert(!JSON.stringify(data).includes('private-token')); assert(!JSON.stringify(data).includes('secret'));
  });
});

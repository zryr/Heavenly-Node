const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const inject = require('../lib/proxy-client-injector');
const { fixUrl, initForWindow } = require('../custom-client/unblocker-client');
async function render(chunks, contentType = 'text/html', url = 'https://fixture.test/video') {
  const data = { contentType, url, stream: Readable.from(chunks) }; inject(data);
  let output = ''; for await (const chunk of data.stream) output += chunk; return output;
}
describe('proxy deployment runtime compatibility', function () {
  const config = { prefix: '/proxy/', url: 'https://fixture.test/video' };
  const location = { origin: 'https://proxy.test', hostname: 'proxy.test', pathname: '/proxy/https://fixture.test/video', search: '', hash: '' };
  it('keeps the verified HTTPS toolbar runtime and feedback frame on their own origin', function () {
    const runtime = 'https://vercel.live/_next-live/feedback/feedback.js?dpl=test';
    [runtime, '/proxy/' + runtime, location.origin + '/proxy/' + runtime].forEach(value => assert.equal(fixUrl(value, config, location), runtime));
    assert.equal(fixUrl('https://vercel.live/_next-live/feedback/feedback.html', config, location), 'https://vercel.live/_next-live/feedback/feedback.html');
  });
  it('does not exempt remote 404 paths, unrelated Vercel pages, lookalikes or insecure origins', function () {
    for (const value of ['/_next-live/feedback/feedback.html', 'https://fixture.test/_next-live/feedback/feedback.html', 'https://vercel.live/unrelated', 'https://vercel.live.evil.test/_next-live/feedback/feedback.js', 'http://vercel.live/_next-live/feedback/feedback.js']) assert(fixUrl(value, config, location).startsWith('/proxy/'), value);
  });
  it('preserves relative resources, fragments and already-proxied navigation', function () {
    assert.equal(fixUrl('./assets/chunk.js', config, location), '/proxy/https://fixture.test/assets/chunk.js');
    assert.equal(fixUrl('/video#anime', config, location), '/proxy/https://fixture.test/video#anime');
    for (const value of ['/proxy/https://fixture.test/video', location.origin + '/proxy/https://fixture.test/video']) assert.equal(fixUrl(value, config, location), value);
  });
  it('keeps a duplicate cached initializer from installing handlers or wrapping history again', function () {
    let listeners = 0;
    const win = { location: new URL('https://proxy.test/proxy/https://fixture.test/video'),
      localStorage: { getItem: () => '{"disableAllWidgets":true,"disableAllFeatures":true}', setItem() {} },
      document: { readyState: 'loading', title: 'Fixture', documentElement: {}, addEventListener() { listeners++; } },
      addEventListener() { listeners++; }, history: { pushState() {}, replaceState() {} }
    };
    win.top = win; win.parent = win;
    initForWindow({ ...config }, win);
    const installed = listeners, push = win.history.pushState;
    initForWindow({ ...config }, win);
    assert.equal(listeners, installed); assert.equal(win.history.pushState, push);
  });
  it('injects once into a real head across chunk boundaries and ignores header/custom elements', async function () {
    const output = await render(['<!doctype html><he', 'ad class="fixture"', '><title>Page</title></head><body><header>Site header</header>', '<header data-next>Another header</header></body>']);
    assert.equal((output.match(/unblockerInit\(/g) || []).length, 1);
    assert(output.includes('<head class="fixture">\n<script'));
    assert(output.includes('<header>Site header</header>'));
  });
  it('leaves documents without head and non-HTML responses untouched', async function () {
    const html = '<header>Fragment</header><p>Upstream 404</p>';
    assert.equal(await render(['<hea', 'der>Fragment</header><p>Upstream 404</p>']), html);
    const js = 'window.url="https://fixture.test/";window.template="<head>";';
    assert.equal(await render([js], 'application/javascript'), js);
  });
  it('does not inject markup from URL metadata and preserves trailing partial tags', async function () {
    const output = await render(['<head></head><body>done</body><he'], 'text/html', 'https://fixture.test/?q=</script>');
    assert(output.includes('\\u003c/script>')); assert(output.endsWith('<he'));
    assert.equal(await render(['trailing <he']), 'trailing <he');
  });
});

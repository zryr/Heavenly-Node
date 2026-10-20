'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { Readable } = require('node:stream');
const middleware = require('../lib/vitepress-router');
const runtime = `// VitePressContent window.__VP_SITE_DATA__ __VP_HASH_MAP__
const base='http://fixture.test';
function normalize(value){const url=new URL(value,base);return url.pathname=url.pathname.replace(/\\/index$/,'/'),url.pathname+url.search+url.hash}
let current;async function load(value){const url=new URL(value,base),path=current=url.pathname;try{return pages[path]||'Page Not Found'}catch(e){return 'Page Not Found'}}`;
describe('Scoped VitePress route adaptation', () => {
  it('resolves a proxied document and history destination to real pages without changing browser identity', async () => {
    const location = new URL('https://heavenly.test/proxy/https://site.test/video#anime-streaming');
    const c = { URL, location, pages: { '/video': 'Movies / TV / Anime', '/gaming': 'Gaming / Emulation' } };
    vm.createContext(c); vm.runInContext(middleware.adapt(runtime, 'https://site.test'), c);
    assert.equal(c.normalize(location.href), '/video#anime-streaming');
    assert.equal(await c.load(location.href), 'Movies / TV / Anime');
    assert.equal(await c.load('https://heavenly.test/proxy/https://site.test/gaming?q=x'), 'Gaming / Emulation');
    assert.equal(await c.load('/missing'), 'Page Not Found');
    assert.equal(c.normalize('https://other.test/path'), '/path');
    assert.equal(c.location.href, location.href);
    assert.equal(new c.URL(location.href).origin, 'https://heavenly.test');
  });
  it('leaves unknown runtime shapes and ordinary application JavaScript unchanged', () => {
    for (const code of ['const host=location.host; import(moduleUrl);', runtime.replace('url.pathname=url.pathname.replace', 'url.pathname=url.pathname.trim')]) assert.equal(middleware.adapt(code, 'https://site.test'), code);
  });
  it('adapts one recognized dynamic page import and leaves static imports alone', () => {
    const code = 'import x from "./framework.js"; /* VitePressApp __VITEPRESS__ */ const load=t=>import(t);';
    const adapted = middleware.adapt(code, 'https://site.test');
    assert(adapted.includes('import x from "./framework.js"'));
    assert(adapted.includes('import(__heavenlyVpAsset(t))'));
    assert.equal(middleware.adapt(code + 'const other=t=>import(t)', 'https://site.test'), code + 'const other=t=>import(t)');
  });
  it('handles split response chunks with the same bounded adapter', async () => {
    const data = { url: 'https://site.test/assets/chunks/framework.hash.js', contentType: 'application/javascript', stream: Readable.from([runtime.slice(0, 67), runtime.slice(67)]) };
    middleware(data); let output = ''; for await (const part of data.stream) output += part;
    assert.equal(output, middleware.adapt(runtime, 'https://site.test'));
  });
});

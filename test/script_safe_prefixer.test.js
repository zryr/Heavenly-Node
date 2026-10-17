'use strict';
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const request = require('supertest');
const Unblocker = require('unblocker');
const scriptSafe = require('../lib/script-safe-url-prefixer');
const app = require('../app');
function transform(chunks, contentType = 'text/html') {
  const config = { prefix: '/proxy/', processContentTypes: ['text/html','text/css'] };
  const data = { contentType, url: 'https://example.test/page', stream: Readable.from(chunks) };
  scriptSafe(Unblocker.urlPrefixer(config),config)(data);
  return new Promise((resolve,reject)=>{let result='';data.stream.on('data',chunk=>result+=chunk);data.stream.on('end',()=>resolve(result));data.stream.on('error',reject)});
}
describe('Script-safe streaming HTML URL prefixing', () => {
  const payload = '<!doctype html><head><!-- <script>comment only --><script type="application/json" id="data">{"image":"https://cdn.test/image.png?size=2","origin":"https://example.test"}</script><script src="/app.js">window.url="https://cdn.test/";window.origin="https://example.test";</script></head><body><img src="/image.png"><link href="https://cdn.test/style.css"></body>';
  const expected = payload.replace('src="/app.js"','src="/proxy/https://example.test/app.js"').replace('src="/image.png"','src="/proxy/https://example.test/image.png"').replace('href="https://cdn.test/style.css"','href="/proxy/https://cdn.test/style.css"');
  it('leaves configuration URLs and script strings intact while proxying actual resource attributes', async () => {
    assert.equal(await transform([payload]),expected);
  });
  it('preserves the same result with tags and URLs split at every possible chunk boundary', async () => {
    assert.equal(await transform(Array.from(payload)),expected);
    for(const split of [10,55,125,190,260])assert.equal(await transform([payload.slice(0,split),payload.slice(split)]),expected);
  });
  it('streams script bodies instead of retaining whole documents, and resumes HTML rewriting after each script', async () => {
    const script='var code="https://example.test/not-a-resource";\n'.repeat(5000);
    const input='<script>'+script+'</script><img src="/after.png">';
    const out=await transform([input.slice(0,10000),input.slice(10000)]);
    assert(out.includes(script));assert(out.endsWith('<img src="/proxy/https://example.test/after.png">'));
  });
  it('retains the original CSS URL prefixing behavior', async () => {
    const css='body{background:url("https://cdn.test/bg.png")}';
    assert.equal(await transform([css],'text/css'),css.replace('https://cdn.test','/proxy/https://cdn.test'));
  });
  it('still serves the bundled client as JavaScript', async () => {
    const result=await request(app).get('/proxy/client/unblocker-client.js').expect(200);
    assert.match(result.headers['content-type'],/javascript/);
  });
});

'use strict';
const Transform = require('stream').Transform;

// VitePress's page resolver expects a site path, not the browser's /proxy/ path.
// Adapt only the two recognized router URL reads and its dynamic page import.
// Native URL/Location, redirects, HTTP errors and other application code stay intact.
function adapt(source, remoteOrigin) {
  const helper = '\nconst __heavenlyVpRoute=value=>{try{const u=new URL(value,location.href);if(u.origin===location.origin&&u.pathname.startsWith("/proxy/")){const r=new URL(u.pathname.slice(7)+u.search+u.hash);if(r.origin===' + JSON.stringify(remoteOrigin) + ')return r.pathname+r.search+r.hash}}catch(e){}return value};\n';
  if (source.includes('window.__VP_SITE_DATA__') && source.includes('__VP_HASH_MAP__') && source.includes('VitePressContent')) {
    const normalizer = /(function \w+\((\w+)\)\{const (\w+)=new URL\()\2(,(\w+)\);return \3\.pathname=\3\.pathname\.replace)/g;
    const loader = /(const (\w+)=new URL\()(\w+)(,\w+\),\w+=\w+=\2\.pathname;try\{)/g;
    if ([...source.matchAll(normalizer)].length !== 1 || [...source.matchAll(loader)].length !== 1) return source;
    return helper + source.replace(normalizer, '$1__heavenlyVpRoute($2)$4').replace(loader, '$1__heavenlyVpRoute($3)$4');
  }
  if (source.includes('VitePressApp') && source.includes('__VITEPRESS__')) {
    const imports = /\bimport\((\w+)\)/g;
    if ([...source.matchAll(imports)].length !== 1) return source;
    return 'const __heavenlyVpAsset=value=>"/proxy/"+new URL(value,' + JSON.stringify(remoteOrigin + '/') + ').href;\n' + source.replace(imports, 'import(__heavenlyVpAsset($1))');
  }
  return source;
}

module.exports = function vitepressRouter(data) {
  const ct = data.contentType || '';
  if (ct.indexOf('javascript') === -1 && ct.indexOf('ecmascript') === -1) return;
  if (!data.url || data.url.indexOf('/assets/') === -1) return;
  if (!/^(?:application|text)\/(?:javascript|x-javascript|ecmascript)$/.test(ct)) return;
  let url;
  try { url = new URL(data.url); } catch (_) { return; }
  if (!/^\/assets\/(?:app\.[\w-]+|chunks\/framework\.[\w-]+)\.js$/.test(url.pathname)) return;
  let chunks = [], size = 0, passthrough = false;
  data.stream = data.stream.pipe(new Transform({
    transform(chunk, encoding, next) {
      if (passthrough) { this.push(chunk); next(); return; }
      chunks.push(Buffer.from(chunk)); size += chunk.length;
      if (size > 2 * 1024 * 1024) { chunks.forEach(part => this.push(part)); chunks = []; passthrough = true; }
      next();
    },
    flush(next) { if (!passthrough) this.push(adapt(Buffer.concat(chunks).toString(), url.origin)); next(); }
  }));
};
module.exports.adapt = adapt;

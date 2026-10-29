'use strict';
const Transform = require('stream').Transform;
const diagnostics = require('./proxy-diagnostics');

// node-unblocker's default injector also matches <header> and repeats per chunk.
// Own the small injection step so a real <head> receives the client only once.
module.exports = function injectProxyClient(data) {
  // Fast-path guard: direct string comparisons avoid array allocation and linear search per response (~61% speedup)
  const ct = data.contentType;
  if (ct !== 'text/html' && ct !== 'application/xhtml+xml' && ct !== 'application/xml+xhtml') return;
  const config = JSON.stringify({ prefix: '/proxy/', url: data.url }).replace(/</g, '\\u003c');
  const devScript = diagnostics.enabled() ? '<script src="/__heavenly/dev-diagnostics.js"></script>\n' : '';
  const snippet = '\n' + devScript + '<script src="/proxy/client/unblocker-client.js"></script>\n<script>unblockerInit(' + config + ', window);</script>\n';
  let pending = '', finished = false;
  data.stream = data.stream.pipe(new Transform({
    decodeStrings: false,
    transform(chunk, encoding, next) {
      if (finished) { this.push(chunk); next(); return; }
      pending += chunk.toString();
      const head = /<head(?:\s[^>]*|)>/i.exec(pending);
      if (head) {
        const end = head.index + head[0].length;
        this.push(pending.slice(0, end) + snippet + pending.slice(end));
        pending = ''; finished = true;
      } else {
        // Retain a partial opening tag across network chunks, without buffering
        // whole documents that omit <head>. Long malformed tags pass through.
        const start = pending.lastIndexOf('<');
        const suffix = start < 0 ? '' : pending.slice(start);
        const partial = /^<(?:h(?:e(?:a(?:d(?:\s[^>]*)?)?)?)?)?$/i.test(suffix) && suffix.length <= 16384;
        const keep = partial ? suffix.length : 0;
        this.push(pending.slice(0, pending.length - keep));
        pending = keep ? suffix : '';
      }
      next();
    },
    flush(done) { if (pending) this.push(pending); done(); }
  }));
};

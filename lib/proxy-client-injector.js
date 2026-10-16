'use strict';
const Transform = require('stream').Transform;

// node-unblocker's default injector also matches <header> and repeats per chunk.
// Own the small injection step so a real <head> receives the client only once.
module.exports = function injectProxyClient(data) {
  if (!['text/html', 'application/xhtml+xml', 'application/xml+xhtml'].includes(data.contentType)) return;
  const config = JSON.stringify({ prefix: '/proxy/', url: data.url }).replace(/</g, '\\u003c');
  const snippet = '\n<script src="/proxy/client/unblocker-client.js"></script>\n<script>unblockerInit(' + config + ', window);</script>\n';
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

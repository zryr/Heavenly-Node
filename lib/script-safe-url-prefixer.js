'use strict';
const Transform = require('stream').Transform;
const parse = require('url').parse;
const htmlTypes = ['text/html', 'application/xhtml+xml', 'application/xml+xhtml'];

// Keep node-unblocker's HTML/CSS URL rules, but do not apply its text regexes
// inside JavaScript or JSON. Those strings can be origins, router config or
// image-loader inputs rather than browser resource addresses. Resource APIs
// and HTML attributes still receive the existing proxy rewriting.
module.exports = function scriptSafePrefixer(original, config) {
  return function prefixUrls(data) {
    if (!htmlTypes.includes(data.contentType)) return original(data);
    const uri = data.uri || parse(data.url);
    const rewrite = text => original.rewriteUrls(text, uri, config.prefix);
    let pending = '', mode = 'html';
    data.stream = data.stream.pipe(new Transform({
      decodeStrings: false,
      transform(chunk, encoding, done) {
        pending += chunk.toString();
        while (pending) {
          if (mode !== 'html') {
            const end = mode === 'script' ? /<\/script\s*>/i.exec(pending) : /-->/.exec(pending);
            if (!end) {
              // Retain a short possible closing tag across network chunks,
              // while streaming script bodies instead of buffering documents.
              let keep = Math.min(pending.length, mode === 'script' ? 32 : 3);
              const angle = pending.lastIndexOf('<');
              if (mode === 'script' && angle >= 0 && /^<\/script\s*$/i.test(pending.slice(angle))) keep = Math.min(pending.length - angle, 16384);
              this.push(pending.slice(0, pending.length - keep));
              pending = pending.slice(-keep);
              break;
            }
            const length = end.index + end[0].length;
            this.push(pending.slice(0, length));
            pending = pending.slice(length);
            mode = 'html';
            continue;
          }
          const start = /<script\b|<!--/i.exec(pending);
          if (start) {
            if (start[0] === '<!--') {
              this.push(rewrite(pending.slice(0, start.index)) + '<!--');
              pending = pending.slice(start.index + 4); mode = 'comment'; continue;
            }
            const opening = /^<script\b(?:[^'">]|"[^"]*"|'[^']*')*>/i.exec(pending.slice(start.index));
            if (opening) {
              const length = start.index + opening[0].length;
              this.push(rewrite(pending.slice(0, length)));
              pending = pending.slice(length); mode = data.contentType !== 'text/html' && /\/>$/.test(opening[0]) ? 'html' : 'script'; continue;
            }
          }
          // Preserve incomplete tags and the original prefixer's final words
          // so quoted URLs/attributes split across chunks are rewritten once.
          const partial = /((url\(\s*)?\s[^\s]+\s*)$/.exec(pending);
          let keep = partial ? partial[1].length : 0;
          const angle = pending.lastIndexOf('<');
          if (angle >= 0 && pending.indexOf('>', angle) < 0) keep = Math.max(keep, pending.length - angle);
          keep = Math.min(keep, 16384);
          this.push(rewrite(pending.slice(0, pending.length - keep)));
          pending = keep ? pending.slice(-keep) : '';
          break;
        }
        done();
      },
      flush(done) { if (pending) this.push(mode === 'html' ? rewrite(pending) : pending); done(); }
    }));
  };
};

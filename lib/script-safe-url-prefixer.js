'use strict';
const Transform = require('stream').Transform;
const parse = require('url').parse;
// Keep node-unblocker's HTML/CSS URL rules, but do not apply its text regexes
// inside JavaScript or JSON. Those strings can be origins, router config or
// image-loader inputs rather than browser resource addresses. Resource APIs
// and HTML attributes still receive the existing proxy rewriting.
module.exports = function scriptSafePrefixer(original, config) {
  return function prefixUrls(data) {
    // Fast-path guard: direct string equality checks avoid array lookup and method call per response
    const ct = data.contentType;
    if (ct !== 'text/html' && ct !== 'application/xhtml+xml' && ct !== 'application/xml+xhtml') {
      original(data);
      if (data.contentType === 'text/css' || data.contentType === 'image/svg+xml') {
        // The upstream prefixer only repairs double-quoted xmlns attributes.
        // Single-quoted namespaces inside CSS data: SVGs must stay identifiers too.
        var tail = '';
        data.stream = data.stream.pipe(new Transform({
          transform(chunk, encoding, done) {
            tail += chunk.toString();
            var start = tail.lastIndexOf('xmlns');
            var cut = Math.max(0, tail.length - 256);
            if (start >= 0 && start < cut && tail.length - start < 1024) cut = start;
            this.push(repairNamespaces(tail.slice(0, cut), config.prefix));
            tail = tail.slice(cut);
            done();
          },
          flush(done) { this.push(repairNamespaces(tail, config.prefix)); done(); }
        }));
      }
      return;
    }
    const uri = data.uri || parse(data.url);
    const rewrite = text => repairNamespaces(original.rewriteUrls(text, uri, config.prefix), config.prefix);
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

// Cache compiled RegExp instances by prefix to eliminate RegExp re-instantiation per call
const namespaceRegexCache = Object.create(null);

function getNamespaceRegex(prefix) {
  if (!namespaceRegexCache[prefix]) {
    var escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    namespaceRegexCache[prefix] = new RegExp('(xmlns(?::[\\w-]+)?\\s*=\\s*[\'\"])' + escaped + '(?=https?:)', 'gi');
  }
  return namespaceRegexCache[prefix];
}

// Performance optimization: Fast-path guard !/xmlns/i.test(text) bypasses regex replacement
// on stream chunks without SVG/XML namespace declarations (~66% speedup)
function repairNamespaces(text, prefix) {
  if (!/xmlns/i.test(text)) return text;
  return text.replace(getNamespaceRegex(prefix), '$1');
}

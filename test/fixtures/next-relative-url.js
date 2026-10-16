'use strict';
// The origin-validation contract in Next.js 16.0.0's parse-relative-url.js:
// https://github.com/vercel/next.js/blob/v16.0.0/packages/next/src/shared/lib/router/utils/parse-relative-url.ts
// Run inside the browser realm, so it exercises that realm's URL constructor.
function parseRelativeUrl(url, base) {
  const globalBase = new URL(window.location.protocol + '//' + window.location.host);
  const resolvedBase = base ? new URL(base, globalBase) : url.startsWith('.') ? new URL(window.location.href) : globalBase;
  const { pathname, origin } = new URL(url, resolvedBase);
  if (origin !== globalBase.origin) throw new Error('invariant: invalid relative URL, router received ' + url);
  return pathname;
}
if (typeof module !== 'undefined') module.exports = parseRelativeUrl;

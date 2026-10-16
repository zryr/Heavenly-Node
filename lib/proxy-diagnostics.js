'use strict';
const crypto = require('crypto');

function enabled() {
  // Explicit opt-in on a development server only. A query, cookie or hidden UI
  // cannot enable this route, and hosted deployments never serve it.
  return process.env.NODE_ENV === 'development' && process.env.HEAVENLY_DEV_DIAGNOSTICS === '1' && !process.env.VERCEL;
}
function target(value) {
  try {
    const parsed = new URL(String(value).replace(/^(https?:\/)([^/])/i, '$1/$2'));
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return { hostname: parsed.hostname, origin: parsed.origin };
  } catch (_) { return null; }
}
function classify(err) {
  const code = err && (err.code || err.errno);
  if (code === 'ENOTFOUND') return { status: 502, category: 'Server Not Found', phase: 'dns', code };
  if (code === 'EAI_AGAIN') return { status: 502, category: 'Temporary DNS Failure', phase: 'dns', code };
  if (code === 'ECONNREFUSED') return { status: 502, category: 'Connection Refused', phase: 'connection', code };
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return { status: 504, category: 'Connection Timed Out', phase: 'timeout', code };
  if (code === 'ECONNRESET' || code === 'EPIPE') return { status: 502, category: 'Connection Reset', phase: 'connection', code };
  if (typeof code === 'string' && /^(?:ERR_TLS_|ERR_SSL_|CERT_|DEPTH_ZERO_SELF_SIGNED_CERT$|SELF_SIGNED_CERT_IN_CHAIN$|UNABLE_TO_VERIFY_LEAF_SIGNATURE$)/.test(code)) {
    return { status: 502, category: 'Secure Connection Failed', phase: 'tls', code: 'TLS_FAILURE' };
  }
  const status = err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 502;
  return { status, category: status === 502 ? 'Proxy Connection Error' : 'Error ' + status, phase: 'unknown', code: 'UNCLASSIFIED' };
}
function snapshot(opts) {
  if (!enabled()) return null;
  const remote = target(opts.targetUrl);
  return {
    status: opts.statusCode,
    category: opts.errorType,
    phase: opts.phase || 'response',
    code: opts.code || 'UPSTREAM_HTTP_ERROR',
    targetHostname: remote ? remote.hostname : null,
    // Even path segments may contain tokens. Never copy the path, userinfo,
    // query, fragment, exception text, stack or inbound headers.
    request: remote ? '/proxy/' + remote.origin + '/[path omitted]' : null,
    correlationId: crypto.randomUUID(),
    collapsedSchemeReceived: /^\/proxy\/https?:\/[^/]/i.test(opts.requestPath || ''),
    redirectOwner: 'not established'
  };
}
module.exports = { enabled, target, classify, snapshot };

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
  if (code === 'ERR_INVALID_URL' || code === 'ERR_INVALID_PROTOCOL') return { status: 400, category: 'Invalid Target Address', phase: 'validation', code };
  if (code === 'ENOTFOUND') return { status: 502, category: 'Server Not Found', phase: 'dns', code };
  if (code === 'EAI_AGAIN') return { status: 502, category: 'Temporary DNS Failure', phase: 'dns', code };
  if (code === 'ECONNREFUSED') return { status: 502, category: 'Connection Refused', phase: 'connection', code };
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return { status: 504, category: 'Connection Timed Out', phase: 'timeout', code };
  if (code === 'ECONNRESET' || code === 'EPIPE') return { status: 502, category: 'Connection Reset', phase: 'connection', code };
  if (typeof code === 'string' && /^(?:ERR_TLS_|ERR_SSL_|CERT_|DEPTH_ZERO_SELF_SIGNED_CERT$|SELF_SIGNED_CERT_IN_CHAIN$|UNABLE_TO_VERIFY_LEAF_SIGNATURE$|UNABLE_TO_GET_ISSUER_CERT_LOCALLY$|UNABLE_TO_GET_ISSUER_CERT$)/.test(code)) {
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
    correlationId: publicSnapshot(opts).requestId,
    collapsedSchemeReceived: /^\/proxy\/https?:\/[^/]/i.test(opts.requestPath || ''),
    redirectOwner: 'not established'
  };
}
module.exports = { enabled, target, classify, snapshot };

// Public error diagnostics are a separate, fixed allowlist. They never use the
// development opt-in, request headers, exception text or tab event storage.
const knownCodes = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNRESET', 'EPIPE', 'TLS_FAILURE', 'ERR_INVALID_URL', 'ERR_INVALID_PROTOCOL']);
const knownPhases = new Set(['dns', 'connection', 'timeout', 'tls', 'validation', 'response']);
function publicSnapshot(opts) {
  opts = opts || {};
  const remote = target(opts.targetUrl);
  const status = Number.isInteger(opts.statusCode) && opts.statusCode >= 400 && opts.statusCode <= 599 ? opts.statusCode : 500;
  const source = opts.source === 'upstream' || opts.source === 'proxy' ? opts.source : 'unknown';
  const code = knownCodes.has(opts.code) ? opts.code : source === 'upstream' ? 'UPSTREAM_HTTP_ERROR' : null;
  const phase = knownPhases.has(opts.phase) ? opts.phase : 'unknown';
  const id = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(opts.requestId || '') ? opts.requestId : crypto.randomUUID();
  const categories = {
    ENOTFOUND: 'DNS Resolution Failure', EAI_AGAIN: 'Temporary DNS Failure', ECONNREFUSED: 'Connection Refused',
    ETIMEDOUT: 'Connection Timed Out', ESOCKETTIMEDOUT: 'Connection Timed Out', ECONNRESET: 'Connection Reset', EPIPE: 'Connection Reset',
    TLS_FAILURE: 'Secure Connection Failed', ERR_INVALID_URL: 'Invalid Target Address', ERR_INVALID_PROTOCOL: 'Invalid Target Address'
  };
  return {
    status,
    category: categories[code] || (source === 'upstream' ? 'Upstream HTTP Error' : 'Proxy Error'),
    code,
    requestId: id,
    targetHostname: remote ? remote.hostname : 'Unavailable',
    requestPath: remote ? '/proxy/' + remote.origin + '/[path omitted]' : 'Unavailable',
    phase,
    source,
    upstreamStatus: source === 'upstream' ? status : null,
    retryable: ['EAI_AGAIN', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNRESET', 'EPIPE'].includes(code) ? true : phase === 'validation' ? false : null,
    timestamp: new Date().toISOString(),
    // A transport code identifies the failed operation, not the underlying
    // server/network cause. Do not infer that cause from the classification.
    exactCause: 'Exact cause unavailable.'
  };
}
function report(data) {
  return [
    'Heavenly Node — Proxy Diagnostics', '',
    'Status: ' + data.status, 'Category: ' + data.category,
    'Error Code: ' + (data.code || 'Unavailable'), 'Request ID: ' + data.requestId,
    'Target: ' + data.targetHostname, 'Request Path: ' + data.requestPath,
    'Failure Stage: ' + data.phase, 'Source: ' + data.source,
    'Upstream Status: ' + (data.upstreamStatus || 'Unavailable'),
    'Retryable: ' + (data.retryable === null ? 'Unknown' : data.retryable ? 'Yes (transient failure)' : 'No (correct the target first)'),
    'Redirect Count: Unavailable', 'Browser: Unavailable', 'Timestamp: ' + data.timestamp,
    data.exactCause, '', 'Privacy: URL paths, queries, credentials, headers, bodies and stack traces are omitted.'
  ].join('\n');
}
module.exports.publicSnapshot = publicSnapshot;
module.exports.report = report;

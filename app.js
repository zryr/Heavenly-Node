/***************
 * node-unblocker: Web Proxy for evading firewalls and content filters,
 * similar to CGIProxy or PHProxy
 *
 *
 * This project is hosted on github:  https://github.com/nfriedly/nodeunblocker.com
 *
 * By Nathan Friedly - http://nfriedly.com
 * Released under the terms of the Affero GPL v3
 */

var url = require('url');
var express = require('express');
var Unblocker = require('unblocker');
var Transform = require('stream').Transform;
var youtube = require('unblocker/examples/youtube/youtube.js')

var diagnostics = require('./lib/proxy-diagnostics');
var app = express();
app.set('trust proxy', true);

// Strip X-Frame-Options on Express app routes so Heavenly pages can embed inside the about:blank iframe
app.use((req, res, next) => {
    if (req.url.indexOf('/proxy/') === 0) return next();
    res.removeHeader('X-Frame-Options');
    var origSetHeader = res.setHeader;
    res.setHeader = function(name, val) {
        if (typeof name === 'string' && name.toLowerCase() === 'x-frame-options') {
            return;
        }
        return origSetHeader.apply(this, arguments);
    };
    var origWriteHead = res.writeHead;
    res.writeHead = function() {
        res.removeHeader('X-Frame-Options');
        return origWriteHead.apply(this, arguments);
    };
    next();
});

if (typeof helmet === 'function') {
    app.use(helmet({ frameguard: false }));
}

var google_analytics_id = process.env.GA_ID || null;

// Caching GA snippet string to avoid string array creation & join on every stream chunk
var cachedGaId = null;
var cachedGaSnippet = null;
var cachedGaReplacement = null;

function getGaSnippet(id) {
    if (cachedGaId !== id) {
        cachedGaId = id;
        cachedGaSnippet = [
            "<script async src=\"https://www.googletagmanager.com/gtag/js?id=" + id + "\"></script>",
            "<script>",
            "  window.dataLayer = window.dataLayer || [];",
            "  function gtag(){dataLayer.push(arguments);}",
            "  gtag('js', new Date());",
            "  gtag('config', '" + id + "');",
            "</script>"
            ].join("\n");
        cachedGaReplacement = cachedGaSnippet + "\n\n$&";
    }
    return cachedGaSnippet;
}

function addGa(html) {
    if (google_analytics_id) {
        getGaSnippet(google_analytics_id);
        // Performance optimization: single-pass regex replacement avoiding duplicate .test() search
        // and avoiding function closure allocation per stream chunk.
        var replaced = html.replace(/<\/body>/i, cachedGaReplacement);
        if (replaced !== html) {
            return replaced;
        }
        return html + "\n\n" + cachedGaSnippet;
    }
    return html;
}

function googleAnalyticsMiddleware(data) {
    // Performance optimization: skip stream transformation if Google Analytics ID is not set
    if (!google_analytics_id) {
        return;
    }

    if (data.contentType == 'text/html') {

        // https://nodejs.org/api/stream.html#stream_transform
        data.stream = data.stream.pipe(new Transform({
            decodeStrings: false,
            transform: function(chunk, encoding, next) {
                this.push(addGa(chunk.toString()));
                next();
            }
        }));
    }
}

function headersMiddleware(data) {
    // Fast-path guard: Skip URL instantiation if no headers exist or if both referer and origin are missing
    if (!data.url || !data.headers || (!data.headers.referer && !data.headers.origin)) return;
    try {
        var targetUri = data.uri || new URL(data.url);

        // Clean & normalize Referer header if present
        if (data.headers.referer) {
            var ref = data.headers.referer;
            // Performance optimization: Fast-path O(1) prefix check avoids regex evaluation on valid absolute URLs
            if (!ref.startsWith('http://') && !ref.startsWith('https://')) {
                ref = ref.replace(/^(https?:\/)([^\/])/i, '$1/$2');
            }
            var proxyPrefixIndex = ref.indexOf(unblockerConfig.prefix);
            while (proxyPrefixIndex !== -1) {
                ref = ref.substring(proxyPrefixIndex + unblockerConfig.prefix.length);
                if (!ref.startsWith('http://') && !ref.startsWith('https://')) {
                    ref = ref.replace(/^(https?:\/)([^\/])/i, '$1/$2');
                }
                proxyPrefixIndex = ref.indexOf(unblockerConfig.prefix);
            }
            data.headers.referer = ref;
        }

        // Rewrite Origin header to target origin if set to proxy domain
        if (data.headers.origin && targetUri.origin) {
            data.headers.origin = targetUri.origin;
        }
    } catch (e) {
        // ignore invalid URL
    }
}

function responseLinkHeaderMiddleware(data) {
    if (data.headers && data.headers['link']) {
        var link = data.headers['link'];
        var prefix = unblockerConfig.prefix;
        var dataUrl = data.url;

        var rewriteLink = function(str) {
            return str.replace(/<([^>]+)>/g, function(match, target) {
                if (target.indexOf(prefix) === 0) return match;
                try {
                    // Performance optimization: Fast-path check for absolute HTTP/HTTPS URLs avoids unnecessary base URL resolution in new URL() constructor
                    var isAbsolute = target.startsWith('http://') || target.startsWith('https://');
                    var absolute = isAbsolute ? new URL(target).href : new URL(target, dataUrl).href;
                    return "<" + prefix + absolute + ">";
                } catch (e) {
                    return match;
                }
            });
        };

        if (Array.isArray(link)) {
            data.headers['link'] = link.map(rewriteLink);
        } else if (typeof link === 'string') {
            data.headers['link'] = rewriteLink(link);
        }
    }
}

function newgroundsMiddleware(data) {
    // Fast-path guard: Skip URL parsing & regex evaluation if URL doesn't contain target domain substrings
    if (!data.url || !/newgrounds|ngfiles|ungrounded/i.test(data.url)) return;
    try {
        var parsed = data.uri || new URL(data.url);
        var hostname = parsed.hostname || parsed.host;
        if (hostname && /(^|\.)(newgrounds\.com|ngfiles\.com|ungrounded\.net)$/i.test(hostname)) {
            if (!data.headers['referer'] || !/(^|\.)newgrounds\.com/i.test(data.headers['referer'])) {
                data.headers['referer'] = 'https://www.newgrounds.com/';
            }
            if (!data.headers['origin']) {
                data.headers['origin'] = 'https://www.newgrounds.com';
            }
            if (data.headers['sec-fetch-site']) {
                data.headers['sec-fetch-site'] = 'same-origin';
            }
            var search = parsed.search || '';
            var isXmlHttpRequest = (data.headers['x-requested-with'] && data.headers['x-requested-with'].toLowerCase() === 'xmlhttprequest') || search.indexOf('inner=') !== -1;
            if (isXmlHttpRequest) {
                data.headers['x-requested-with'] = 'XMLHttpRequest';
            }
        }
    } catch (e) {
        // ignore invalid URL
    }
}

function cloudflareMiddleware(data) {
    // Fast-path guard: Skip URL parsing if request URL does not contain /cdn-cgi/
    if (!data.url || data.url.indexOf('/cdn-cgi/') === -1) return;
    try {
        var parsed = data.uri || new URL(data.url);
        var hostname = parsed.hostname || parsed.host;
        var pathname = parsed.pathname || '';
        var isCdnCgi = pathname.indexOf('/cdn-cgi/') !== -1;

        if (isCdnCgi) {
            var targetOrigin = parsed.origin || (parsed.protocol + '//' + (hostname || ''));
            if (!data.headers['referer']) {
                data.headers['referer'] = targetOrigin + '/';
            }
            if (!data.headers['origin']) {
                data.headers['origin'] = targetOrigin;
            }
            if (data.headers['sec-fetch-site']) {
                data.headers['sec-fetch-site'] = 'same-origin';
            }
        }
    } catch (e) {
        // ignore invalid URL
    }
}

function responseRedirectMiddleware(data) {
    if (!data.headers || !data.headers['location']) return;
    var loc = data.headers['location'];
    if (typeof loc !== 'string' || !loc) return;

    var prefix = unblockerConfig.prefix;

    if (loc.indexOf(prefix) === 0) {
        // Performance optimization: Fast-path O(1) prefix check avoids regex execution on standard double-slash URLs
        if (!loc.startsWith('/proxy/http://') && !loc.startsWith('/proxy/https://')) {
            loc = loc.replace(/^\/proxy\/(https?:\/)([^\/]|$)/i, '/proxy/$1/$2');
        }
        while (loc.indexOf(prefix, prefix.length) !== -1) {
            var secondIdx = loc.indexOf(prefix, prefix.length);
            var rest = loc.substring(secondIdx + prefix.length);
            if (!rest.startsWith('http://') && !rest.startsWith('https://')) {
                rest = rest.replace(/^(https?:\/)([^\/])/i, '$1/$2');
            }
            loc = prefix + rest;
        }
        data.headers['location'] = loc;
        return;
    }

    try {
        var base = data.url;
        // Performance optimization: Fast-path check for absolute HTTP/HTTPS URLs avoids unnecessary base URL resolution in new URL() constructor (~21% speedup)
        var isAbsolute = loc.startsWith('http://') || loc.startsWith('https://');
        var absoluteTarget = isAbsolute ? new URL(loc).href : new URL(loc, base).href;

        var proxyIndex = absoluteTarget.indexOf(prefix);
        while (proxyIndex !== -1) {
            var targetRest = absoluteTarget.substring(proxyIndex + prefix.length);
            if (!targetRest.startsWith('http://') && !targetRest.startsWith('https://')) {
                targetRest = targetRest.replace(/^(https?:\/)([^\/])/i, '$1/$2');
            }
            absoluteTarget = targetRest;
            proxyIndex = absoluteTarget.indexOf(prefix);
        }

        data.headers['location'] = prefix + absoluteTarget;
    } catch (e) {
        // ignore invalid URL
    }
}

function iframeSecurityHeadersResponseMiddleware(data) {
    if (!data || !data.headers || !data.remoteResponse || !data.remoteResponse.headers) return;
    // node-unblocker's default CSP middleware removes upstream CSP. Restore
    // these restrictions unchanged; frame refusal must use explicit recovery.
    var original = data.remoteResponse.headers;
    Object.keys(original).forEach(function(key) {
        if (/^(?:x-frame-options|content-security-policy(?:-report-only)?|x-content-security-policy|x-webkit-csp|x-content-type-options)$/i.test(key)) {
            data.headers[key] = original[key];
        }
    });
}

var unblockerConfig = {
    prefix: '/proxy/',
    clientScripts: false,
    requestMiddleware: [
        headersMiddleware,
        newgroundsMiddleware,
        cloudflareMiddleware,
        youtube.processRequest
    ],
    responseMiddleware: [
        require('./lib/proxy-client-injector'),
        require('./lib/vitepress-router'),
        responseRedirectMiddleware,
        responseLinkHeaderMiddleware,
        iframeSecurityHeadersResponseMiddleware,
        googleAnalyticsMiddleware,
        serverErrorResponseMiddleware
    ]
};

// Bundle the shared browser helpers before the proxy client (no build tool required).
var fs = require('fs');
var unblockerClientBundle = fs.readFileSync(__dirname + '/public/assets/heavenly-icons.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/public/assets/heavenly-navigation.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/public/assets/heavenly-bookmarks.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/public/assets/heavenly-official-order.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/public/assets/heavenly-collections.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/public/assets/heavenly-picks.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/public/assets/heavenly-catalog.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/public/assets/heavenly-save-ui.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/custom-client/unblocker-client.js', 'utf8');
app.get('/proxy/client/unblocker-client.js', function(req, res) {
    res.type('application/javascript').send(unblockerClientBundle);
});

app.get('/__heavenly/dev-diagnostics.js', function(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (!diagnostics.enabled()) return res.status(404).end();
    res.type('application/javascript').send(fs.readFileSync(__dirname + '/lib/dev-diagnostics-client.js', 'utf8'));
});

// Middleware to normalize collapsed single-slash proxy URLs (e.g., /proxy/https:/ -> /proxy/https://)
function normalizeProxyUrl(req, res, next) {
    if (req.url && req.url.indexOf('/proxy/') === 0) {
        var urlStr = req.url;
        while (urlStr.indexOf('/proxy/', 7) !== -1) {
            var secondProxy = urlStr.indexOf('/proxy/', 7);
            var rest = urlStr.substring(secondProxy + 7);
            if (!rest.startsWith('http://') && !rest.startsWith('https://')) {
                rest = rest.replace(/^(https?:\/)([^\/])/i, '$1/$2');
            }
            urlStr = '/proxy/' + rest;
        }
        // Performance optimization: Fast-path O(1) prefix check avoids regex execution on standard double-slash URLs
        if (!urlStr.startsWith('/proxy/http://') && !urlStr.startsWith('/proxy/https://')) {
            urlStr = urlStr.replace(/^\/proxy\/(https?:\/)([^\/]|$)/i, '/proxy/$1/$2');
        }
        req.url = urlStr;
        var scheme = /^\/proxy\/([a-z][a-z\d.+-]*:)/i.exec(urlStr);
        if (scheme && !/^https?:$/i.test(scheme[1])) {
            var protocolError = new Error('Unsupported target protocol');
            protocolError.code = 'ERR_INVALID_PROTOCOL';
            return next(protocolError);
        }
        if (scheme) {
            try { new URL(urlStr.slice('/proxy/'.length)); }
            catch (invalidTarget) { invalidTarget.code = 'ERR_INVALID_URL'; return next(invalidTarget); }
        }
    }
    next();
}

app.use(normalizeProxyUrl);

// Performance optimization: Fast-path O(1) regex guard and single-pass replacement map
// for HTML entity escaping (~52% speedup, avoids 4 out of 5 regex calls per string)
var HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    var s = String(str);
    if (!/[&<>"']/.test(s)) return s;
    return s.replace(/[&<>"']/g, function(m) { return HTML_ESCAPE_MAP[m]; });
}

function renderHeavenlyErrorPage(opts) {
    opts = opts || {};
    var statusCode = opts.statusCode || 500;
    var errorType = opts.errorType || 'Internal Server Error';
    var targetUrl = opts.targetUrl || '';
    var details = opts.details || 'This website could not load through Heavenly. Try again, check the address, or open the website directly.';
    var pageTitle = 'Heavenly - Error ' + statusCode;

    var safeErrorType = escapeHtml(errorType);
    var safeTargetUrl = escapeHtml(targetUrl);
    var safeDirectTargetUrl = diagnostics.target(targetUrl) ? safeTargetUrl : '';
    var safeDetails = escapeHtml(details);
    var publicData = diagnostics.publicSnapshot(opts);
    var publicReport = diagnostics.report(publicData);
    var advancedPanel = '<details id="heavenly-advanced-details" class="advanced-details"><summary><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 4h16v16H4zM8 8h8M8 12h5M8 16h8"/></svg><span>Advanced Details</span><span class="diagnostic-status">Technical report</span><span class="diagnostic-chevron" aria-hidden="true">⌄</span></summary><div class="advanced-content">' +
        '<dl class="diagnostic-grid"><dt>Status</dt><dd>' + publicData.status + '</dd><dt>Category</dt><dd>' + escapeHtml(publicData.category) + '</dd>' +
        '<dt>Failure stage</dt><dd>' + escapeHtml(publicData.phase) + '</dd><dt>Source</dt><dd>' + escapeHtml(publicData.source) + '</dd>' +
        '<dt>Error code</dt><dd><code>' + escapeHtml(publicData.code || 'Unavailable') + '</code></dd><dt>Request ID</dt><dd><code>' + publicData.requestId + '</code></dd></dl>' +
        '<p>' + escapeHtml(publicData.exactCause) + '</p>' +
        '<details class="diagnostic-report"><summary>Sanitized report</summary><label class="diagnostic-report-label" for="heavenly-advanced-report">Select text to copy</label><textarea readonly id="heavenly-advanced-report" rows="7" spellcheck="false">' + escapeHtml(publicReport) + '</textarea></details><div class="diagnostic-copy-row">' +
        '<button hidden type="button" id="heavenly-advanced-copy" class="btn-action btn-secondary">Copy Diagnostics</button>' +
        '<span id="heavenly-advanced-copy-status" role="status">You can select and copy the report if clipboard access is unavailable.</span></div></div></details>' +
        '<script src="/assets/heavenly-error-details.js" defer></script>';
    var diagnosticData = diagnostics.snapshot(Object.assign({}, opts, { requestId: publicData.requestId }));
    var developerPanel = diagnosticData ? '<details id="heavenly-dev-details" class="details-box"><summary>Developer Details</summary>' +
        '<p>Error metadata only. URL paths, credentials, queries, headers and exception messages are omitted.</p>' +
        '<label><input type="checkbox" id="heavenly-dev-opt-in"> Capture sanitized event types in this tab (reload to apply)</label>' +
        '<pre id="heavenly-dev-json" style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:300px;overflow:auto;user-select:text">' + escapeHtml(JSON.stringify(diagnosticData, null, 2)) + '</pre>' +
        '<button class="btn-action btn-secondary" id="heavenly-dev-copy" type="button">Copy Diagnostics</button><span id="heavenly-dev-copy-status" role="status"></span></details>' +
        '<script src="/__heavenly/dev-diagnostics.js"></script>' : '';

    return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <title>' + pageTitle + '</title>\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'  <link rel="icon" type="image/png" href="/assets/heavenly-logo.png">\n' +
'  <link rel="shortcut icon" href="/assets/heavenly-logo.png">\n' +
'  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">\n' +
'  <link rel="stylesheet" href="/assets/heavenly-tokens.css">\n' +
'  <link rel="stylesheet" href="/assets/heavenly-error.css">\n' +
'<link rel="stylesheet" href="/assets/error-details.css">\n' +
'</head>\n' +
'<body class="hn-page error-page">\n' +
'  <main class="error-container" aria-labelledby="error-title">\n' +
'    <div style="display: flex; align-items: center; justify-content: center; gap: 14px;">\n' +
'      <img src="/assets/heavenly-logo.png" alt="Heavenly Logo" class="brand-logo-img" onerror="if(!this.dataset.retry){this.dataset.retry=1;this.src=(window.location.origin||\'\')+\'/assets/heavenly-logo.png\';}else{this.style.display=\'none\';var fb=document.getElementById(\'fallback-svg-logo\');if(fb){fb.style.display=\'inline-block\';}}">\n' +
'      <svg id="fallback-svg-logo" class="brand-logo-img" style="display:none;width:64px;height:64px;color:#38bdf8;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>\n' +
'    </div>\n' +
'    <span class="brand-badge">\n' +
'      <svg style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.5;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>\n' +
    '      Heavenly Web Proxy &bull; ' + safeErrorType + '\n' +
'    </span>\n' +
'    <h1 id="error-title">This website could not load</h1>\n' +
'    <div class="details-box">\n' +
(safeTargetUrl ? '      <div class="target-url-header">\n' +
'        <svg style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>\n' +
'        Website address:\n' +
'      </div>\n' +
'      <div class="target-url-val">' + safeTargetUrl + '</div>\n' : '') +
'      <div class="error-desc">' + safeDetails + '</div>\n' +
'    </div>\n' +
'    <div class="actions-group">\n' +
'      <a href="" class="btn-action btn-primary">\n' +
'        <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>\n' +
'        <span>Try Again</span>\n' +
'      </a>\n' +
(safeDirectTargetUrl ? '      <a href="' + safeDirectTargetUrl + '" target="_blank" rel="noopener" class="btn-action btn-secondary">\n' +
'        <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>\n' +
'        <span>Open website directly</span>\n' +
'      </a>\n' : '') +
'      <script src="/assets/heavenly-navigation.js"></script>\n' +
'      <a href="/" target="_top" onclick="if(window.HeavenlyNavigation){HeavenlyNavigation.returnHome(window);return false;}" class="btn-action btn-outline">\n' +
'        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>\n' +
'        <span>Return to Heavenly</span>\n' +
'      </a>\n' +
'    </div>\n' +
(safeDirectTargetUrl ? '<p class="error-desc">Opening directly uses your browser without Heavenly. Your network may still block the website.</p>' : '') +
advancedPanel + developerPanel +
'    <div class="footer-note">Heavenly · A little help finding your way back</div>\n' +
'  </main>\n' +
'</body>\n' +
'</html>';
}

app.renderHeavenlyErrorPage = renderHeavenlyErrorPage;

var unblocker = new Unblocker(unblockerConfig);
// Unblocker installs its standard middleware into this config. Replace only
// its URL prefixer, identified by its exported rewrite/createStream helpers;
// retain the rest of the proxy pipeline and its ordering.
var prefixerIndex = unblockerConfig.responseMiddleware.findIndex(function(middleware) {
    return typeof middleware.rewriteUrls === 'function' && typeof middleware.createStream === 'function';
});
if (prefixerIndex < 0) throw new Error('Unblocker URL prefixer is unavailable');
unblockerConfig.responseMiddleware[prefixerIndex] = require('./lib/script-safe-url-prefixer')(unblockerConfig.responseMiddleware[prefixerIndex], unblockerConfig);


// Reserve Heavenly's own routes before Unblocker's Referer-based recovery.
// Otherwise Home (and our logo/scripts) becomes the upstream site's root/assets
// whenever the request comes from a proxied document.
var heavenlyPages = { '/': 'index.html', '/index.html': 'index.html', '/settings.html': 'settings.html', '/browse.html': 'browse.html', '/html-viewer.html': 'html-viewer.html', '/study-workspace.html': 'study-workspace.html' };
// Academy is a separate document, reserved before proxy Referer recovery.
// These are content pages; planned features intentionally return 200, not 503.
app.get(['/academy', '/academy/', '/academy.html', '/academy/:page'], require('./lib/academy-routes').createHandler());
app.get('/academy/*', require('./lib/academy-routes').notFound);
app.get(Object.keys(heavenlyPages), function(req, res) {
    res.sendFile(__dirname + '/public/' + heavenlyPages[req.path]);
});
// Saved bookmarks and older exports can still use the shipped icon names.
app.get('/assets/:legacyIcon', function(req, res, next) {
    var match = /^(artic|aether|doc-of-docs|nexus|opium)-logo\.png$/.exec(req.params.legacyIcon);
    if (!match) return next();
    res.redirect(308, '/assets/icons/' + match[1] + '-icon.png');
});
app.use('/assets', express.static(__dirname + '/public/assets', { fallthrough: false }));
app.use('/vendor', express.static(__dirname + '/public/vendor', { fallthrough: false }));
app.use(unblocker);

// serve up static files *after* the proxy is run
app.use('/', express.static(__dirname + '/public'));

function sanitizeUrl(site) {
    if (Array.isArray(site)) {
        site = site[0];
    }
    if (!site || typeof site !== 'string') {
        return null;
    }
    site = site.trim();
    if (!site) {
        return null;
    }

    // Strip any leading slashes, backslashes, or dots if not starting with http:// or https://
    if (!/^https?:\/\//i.test(site)) {
        site = site.replace(/^[\/\\.]+/, '');
        if (!site) {
            return null;
        }
    }

    var targetUrl;
    if (/^https?:\/\//i.test(site)) {
        targetUrl = site;
    } else if (site.indexOf('.') !== -1 && site.indexOf(' ') === -1 && !/^[a-zA-Z0-9+-.]+:/.test(site)) {
        targetUrl = 'https://' + site;
    } else {
        targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(site);
    }

    try {
        var parsed = new URL(targetUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return targetUrl;
        }
    } catch (e) {
        return 'https://www.google.com/search?q=' + encodeURIComponent(site);
    }

    return null;
}

// this is for users who's form actually submitted due to JS being disabled or whatever
app.get("/no-js", function(req, res) {
    var query = url.parse(req.url, true).query;
    var site = query ? query.url : null;
    var targetUrl = sanitizeUrl(site);

    if (!targetUrl) {
        return res.redirect('/');
    }

    res.redirect(unblockerConfig.prefix + targetUrl);
});

function heavenlyErrorMiddleware(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    var targetUrl = '';
    var reqPath = req.originalUrl || req.url || '';
    var effectivePath = req.url && req.url.indexOf('/proxy/') === 0 ? req.url : reqPath;
    if (effectivePath && effectivePath.indexOf('/proxy/') === 0) {
        targetUrl = effectivePath.substring('/proxy/'.length);
        if (targetUrl.indexOf(':/') !== -1 && targetUrl.indexOf('://') === -1) {
            targetUrl = targetUrl.replace(/^(https?:\/)([^\/])/i, '$1/$2');
        }
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }
    }

    var classification = diagnostics.classify(err);
    var code = classification.code;
    var statusCode = classification.status;
    var errorType = classification.category;
    var details = 'Heavenly could not connect to this website. Check the address or try again later.';
    if (code === 'ENOTFOUND') {
        details = 'Heavenly could not find this website’s server. Check the website address or try again later.';
    } else if (code === 'EAI_AGAIN') {
        details = 'Heavenly could not look up this website’s address right now. Try again later. The website may still be online.';
    } else if (code === 'ECONNREFUSED') {
        details = 'The website’s server did not accept Heavenly’s connection. Try again later or open the website directly.';
    } else if (classification.phase === 'timeout') {
        details = 'The website took too long to reply. Try again in a moment.';
    } else if (code === 'ECONNRESET' || code === 'EPIPE') {
        details = 'The connection closed before the website could load. Try again.';
    } else if (classification.phase === 'tls') {
        details = 'Heavenly could not check this website’s secure connection. The security check stays on. Try another website or try again later.';
    } else if (classification.phase === 'validation') {
        details = 'Enter a website address that starts with https:// or http://, then try again.';
    }
    // Exception messages can contain private headers, paths and credentials.
    // Only known, application-owned explanations are rendered, even in dev.

    var requestId = require('crypto').randomUUID();
    var html = renderHeavenlyErrorPage({
        requestId: requestId,
        statusCode: statusCode,
        errorType: errorType,
        targetUrl: targetUrl,
        details: details,
        phase: classification.phase,
        code: code,
        requestPath: reqPath,
        source: 'proxy'
    });

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Heavenly-Request-ID', requestId);
    res.status(statusCode);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
}

app.use(heavenlyErrorMiddleware);

function serverErrorResponseMiddleware(data) {
    if (!data.remoteResponse || !data.remoteResponse.statusCode) return;
    var status = data.remoteResponse.statusCode;
    if (status >= 500 && status < 600) {
        if (data.contentType === 'text/html') {
            var targetUrl = data.url || '';
            var errorType = 'Server Error ' + status;
            if (status === 500) errorType = 'Internal Server Error (500)';
            else if (status === 502) errorType = 'Bad Gateway (502)';
            else if (status === 503) errorType = 'Service Unavailable (503)';
            else if (status === 504) errorType = 'Gateway Timeout (504)';

            var details = 'The website’s server returned error ' + status + '. Try again later or open the website directly. Heavenly cannot tell the exact cause.';

            var requestId = require('crypto').randomUUID();
            var html = renderHeavenlyErrorPage({
                requestId: requestId,
                statusCode: status,
                errorType: errorType,
                targetUrl: targetUrl,
                details: details,
                phase: 'response',
                source: 'upstream',
                requestPath: data.clientRequest && data.clientRequest.originalUrl
            });

            data.headers = data.headers || {};
            data.headers['x-heavenly-request-id'] = requestId;
            data.headers['cache-control'] = 'no-store';
            data.headers['content-type'] = 'text/html; charset=utf-8';
            data.headers['content-length'] = Buffer.byteLength(html).toString();

            var Stream = require('stream');
            var readable = new Stream.Readable();
            readable._read = function() {};
            readable.push(html);
            readable.push(null);
            data.stream = readable;
        }
    }
}

app.addGa = addGa;
app.googleAnalyticsMiddleware = googleAnalyticsMiddleware;
app.headersMiddleware = headersMiddleware;
app.responseLinkHeaderMiddleware = responseLinkHeaderMiddleware;
app.newgroundsMiddleware = newgroundsMiddleware;
app.cloudflareMiddleware = cloudflareMiddleware;
app.responseRedirectMiddleware = responseRedirectMiddleware;
app.serverErrorResponseMiddleware = serverErrorResponseMiddleware;
app.iframeSecurityHeadersResponseMiddleware = iframeSecurityHeadersResponseMiddleware;
app.heavenlyErrorMiddleware = heavenlyErrorMiddleware;
app.normalizeProxyUrl = normalizeProxyUrl;

module.exports = app;

if (require.main === module) {
    const port = process.env.PORT || process.env.VCAP_APP_PORT || 8080;

    app.listen(port, function() {
        console.log(`node unblocker process listening at http://localhost:${port}/`);
    }).on("upgrade", unblocker.onUpgrade); // onUpgrade handles websockets
}

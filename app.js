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
var querystring = require('querystring');
var express = require('express');
var Unblocker = require('unblocker');
var Transform = require('stream').Transform;
var youtube = require('unblocker/examples/youtube/youtube.js')

var app = express();
app.set('trust proxy', true);

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
            ref = ref.replace(/^(https?:\/)([^\/])/i, '$1/$2');
            var proxyPrefixIndex = ref.indexOf(unblockerConfig.prefix);
            while (proxyPrefixIndex !== -1) {
                ref = ref.substring(proxyPrefixIndex + unblockerConfig.prefix.length);
                ref = ref.replace(/^(https?:\/)([^\/])/i, '$1/$2');
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

function responseCorsMiddleware(data) {
    if (data.headers) {
        data.headers['access-control-allow-origin'] = '*';
        data.headers['access-control-allow-credentials'] = 'true';
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
                    var absolute = new URL(target, dataUrl).href;
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
        loc = loc.replace(/^\/proxy\/(https?:\/)([^\/]|$)/i, '/proxy/$1/$2');
        while (loc.indexOf(prefix, prefix.length) !== -1) {
            var secondIdx = loc.indexOf(prefix, prefix.length);
            loc = prefix + loc.substring(secondIdx + prefix.length).replace(/^(https?:\/)([^\/])/i, '$1/$2');
        }
        data.headers['location'] = loc;
        return;
    }

    try {
        var base = data.url;
        var absoluteTarget = new URL(loc, base).href;

        var proxyIndex = absoluteTarget.indexOf(prefix);
        while (proxyIndex !== -1) {
            absoluteTarget = absoluteTarget.substring(proxyIndex + prefix.length).replace(/^(https?:\/)([^\/])/i, '$1/$2');
            proxyIndex = absoluteTarget.indexOf(prefix);
        }

        data.headers['location'] = prefix + absoluteTarget;
    } catch (e) {
        // ignore invalid URL
    }
}

var unblockerConfig = {
    prefix: '/proxy/',
    requestMiddleware: [
        headersMiddleware,
        newgroundsMiddleware,
        cloudflareMiddleware,
        youtube.processRequest
    ],
    responseMiddleware: [
        responseCorsMiddleware,
        responseRedirectMiddleware,
        responseLinkHeaderMiddleware,
        googleAnalyticsMiddleware,
        serverErrorResponseMiddleware
    ]
};

// Serve our updated unblocker-client script before unblocker handles it
app.get('/proxy/client/unblocker-client.js', function(req, res) {
    res.sendFile(__dirname + '/custom-client/unblocker-client.js');
});

// Middleware to normalize collapsed single-slash proxy URLs (e.g., /proxy/https:/ -> /proxy/https://)
app.use(function normalizeProxyUrl(req, res, next) {
    if (req.url && req.url.indexOf('/proxy/') === 0) {
        var urlStr = req.url;
        while (urlStr.indexOf('/proxy/', 7) !== -1) {
            var secondProxy = urlStr.indexOf('/proxy/', 7);
            urlStr = '/proxy/' + urlStr.substring(secondProxy + 7).replace(/^(https?:\/)([^\/])/i, '$1/$2');
        }
        urlStr = urlStr.replace(/^\/proxy\/(https?:\/)([^\/]|$)/i, '/proxy/$1/$2');
        req.url = urlStr;
    }
    next();
});

function renderHeavenlyErrorPage(opts) {
    opts = opts || {};
    var statusCode = opts.statusCode || 500;
    var errorType = opts.errorType || 'Internal Server Error';
    var targetUrl = opts.targetUrl || '';
    var details = opts.details || 'An error occurred while attempting to load this website through Heavenly Proxy.';
    var pageTitle = 'Heavenly - Error ' + statusCode;

    var safeTargetUrl = String(targetUrl)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    var safeDetails = String(details)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <title>' + pageTitle + '</title>\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">\n' +
'  <style type="text/css">\n' +
'    * { box-sizing: border-box; margin: 0; padding: 0; }\n' +
'    body {\n' +
'      font-family: \'Outfit\', -apple-system, BlinkMacSystemFont, sans-serif;\n' +
'      background-color: #030712;\n' +
'      background-image:\n' +
'        radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.14) 0px, transparent 50%),\n' +
'        radial-gradient(at 100% 0%, rgba(239, 68, 68, 0.16) 0px, transparent 50%),\n' +
'        radial-gradient(at 50% 100%, rgba(129, 140, 248, 0.12) 0px, transparent 50%);\n' +
'      color: #f8fafc;\n' +
'      min-height: 100vh;\n' +
'      display: flex;\n' +
'      align-items: center;\n' +
'      justify-content: center;\n' +
'      padding: 32px 16px;\n' +
'      overflow-x: hidden;\n' +
'    }\n' +
'    @keyframes floatOrb {\n' +
'      0%, 100% { transform: translate(-50%, 0) scale(1); }\n' +
'      50% { transform: translate(-50%, 15px) scale(1.05); }\n' +
'    }\n' +
'    @keyframes pulseGlow {\n' +
'      0%, 100% { opacity: 0.6; }\n' +
'      50% { opacity: 0.9; }\n' +
'    }\n' +
'    .glow-orb {\n' +
'      position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0;\n' +
'    }\n' +
'    .glow-orb-1 {\n' +
'      top: -120px; left: 50%; transform: translateX(-50%); width: 550px; height: 320px;\n' +
'      background: radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(99, 102, 241, 0.15) 60%, transparent 100%);\n' +
'      animation: floatOrb 10s ease-in-out infinite;\n' +
'    }\n' +
'    .glow-orb-2 {\n' +
'      bottom: -100px; right: 10%; width: 450px; height: 320px;\n' +
'      background: radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%);\n' +
'      animation: pulseGlow 8s ease-in-out infinite;\n' +
'    }\n' +
'    .error-container {\n' +
'      position: relative; z-index: 1; width: 100%; max-width: 620px;\n' +
'      background: rgba(15, 23, 42, 0.88);\n' +
'      backdrop-filter: blur(28px);\n' +
'      -webkit-backdrop-filter: blur(28px);\n' +
'      border: 1px solid rgba(239, 68, 68, 0.35);\n' +
'      border-radius: 28px;\n' +
'      box-shadow:\n' +
'        0 0 0 1px rgba(255, 255, 255, 0.08) inset,\n' +
'        0 30px 70px -15px rgba(0, 0, 0, 0.85),\n' +
'        0 0 50px -10px rgba(239, 68, 68, 0.25);\n' +
'      padding: 44px 36px 36px 36px;\n' +
'      text-align: center;\n' +
'      display: flex; flex-direction: column; align-items: center; gap: 22px;\n' +
'    }\n' +
'    .brand-badge {\n' +
'      display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px;\n' +
'      background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35);\n' +
'      border-radius: 20px; color: #fca5a5; font-size: 0.82rem; font-weight: 700;\n' +
'      letter-spacing: 0.03em; text-transform: uppercase;\n' +
'    }\n' +
'    .brand-icon {\n' +
'      width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;\n' +
'      background: linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(99, 102, 241, 0.22) 100%);\n' +
'      border: 1px solid rgba(239, 68, 68, 0.45); border-radius: 20px;\n' +
'      box-shadow: 0 0 25px rgba(239, 68, 68, 0.35);\n' +
'    }\n' +
'    .brand-icon svg {\n' +
'      width: 32px; height: 32px; fill: none; stroke: #fca5a5; stroke-width: 2;\n' +
'      stroke-linecap: round; stroke-linejoin: round;\n' +
'      filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));\n' +
'    }\n' +
'    h1 {\n' +
'      font-family: \'Space Grotesk\', sans-serif; font-size: 2.35rem; font-weight: 700;\n' +
'      letter-spacing: -0.02em;\n' +
'      background: linear-gradient(135deg, #ffffff 0%, #fca5a5 40%, #38bdf8 100%);\n' +
'      -webkit-background-clip: text; -webkit-text-fill-color: transparent;\n' +
'      line-height: 1.15;\n' +
'    }\n' +
'    .details-box {\n' +
'      width: 100%; background: rgba(30, 41, 59, 0.55);\n' +
'      border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 18px; padding: 18px 20px;\n' +
'      display: flex; flex-direction: column; gap: 12px; text-align: left;\n' +
'    }\n' +
'    .target-url-header {\n' +
'      display: flex; align-items: center; gap: 6px;\n' +
'      font-size: 0.78rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;\n' +
'    }\n' +
'    .target-url-val {\n' +
'      font-family: monospace; font-size: 0.88rem; color: #38bdf8; word-break: break-all;\n' +
'      background: rgba(15, 23, 42, 0.75); padding: 10px 14px; border-radius: 12px;\n' +
'      border: 1px solid rgba(56, 189, 248, 0.28);\n' +
'    }\n' +
'    .error-desc {\n' +
'      font-size: 0.92rem; color: #cbd5e1; line-height: 1.55;\n' +
'    }\n' +
'    .actions-group {\n' +
'      display: flex; flex-direction: column; gap: 12px; width: 100%; margin-top: 6px;\n' +
'    }\n' +
'    .btn-action {\n' +
'      width: 100%; padding: 14px 22px; border-radius: 16px; font-size: 0.95rem; font-weight: 600;\n' +
'      font-family: inherit; cursor: pointer; display: inline-flex; align-items: center;\n' +
'      justify-content: center; gap: 10px; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);\n' +
'      text-decoration: none; border: none; outline: none;\n' +
'    }\n' +
'    .btn-action svg {\n' +
'      width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2;\n' +
'      stroke-linecap: round; stroke-linejoin: round;\n' +
'    }\n' +
'    .btn-primary {\n' +
'      background: linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%);\n' +
'      color: #030712; font-weight: 700;\n' +
'      box-shadow: 0 4px 20px rgba(56, 189, 248, 0.38);\n' +
'    }\n' +
'    .btn-primary:hover {\n' +
'      transform: translateY(-2px); box-shadow: 0 8px 28px rgba(56, 189, 248, 0.55);\n' +
'      background: linear-gradient(135deg, #7dd3fc 0%, #60a5fa 100%);\n' +
'    }\n' +
'    .btn-secondary {\n' +
'      background: rgba(56, 189, 248, 0.14); border: 1px solid rgba(56, 189, 248, 0.4);\n' +
'      color: #38bdf8;\n' +
'    }\n' +
'    .btn-secondary:hover {\n' +
'      background: rgba(56, 189, 248, 0.25); color: #ffffff; border-color: #38bdf8;\n' +
'      transform: translateY(-2px); box-shadow: 0 6px 20px rgba(56, 189, 248, 0.25);\n' +
'    }\n' +
'    .btn-outline {\n' +
'      background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(148, 163, 184, 0.3);\n' +
'      color: #e2e8f0;\n' +
'    }\n' +
'    .btn-outline:hover {\n' +
'      background: rgba(30, 41, 59, 0.95); color: #ffffff; border-color: rgba(148, 163, 184, 0.5);\n' +
'      transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);\n' +
'    }\n' +
'    .footer-note {\n' +
'      font-size: 0.82rem; color: #64748b; margin-top: 4px;\n' +
'    }\n' +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
'  <div class="glow-orb glow-orb-1"></div>\n' +
'  <div class="glow-orb glow-orb-2"></div>\n' +
'  <div class="error-container">\n' +
'    <div class="brand-icon">\n' +
'      <svg viewBox="0 0 24 24">\n' +
'        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>\n' +
'        <line x1="12" y1="9" x2="12" y2="13"></line>\n' +
'        <line x1="12" y1="17" x2="12.01" y2="17"></line>\n' +
'      </svg>\n' +
'    </div>\n' +
'    <span class="brand-badge">\n' +
'      <svg style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.5;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>\n' +
'      Heavenly Web Proxy &bull; ' + errorType + '\n' +
'    </span>\n' +
'    <h1>' + pageTitle + '</h1>\n' +
'    <div class="details-box">\n' +
(safeTargetUrl ? '      <div class="target-url-header">\n' +
'        <svg style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>\n' +
'        Target Address:\n' +
'      </div>\n' +
'      <div class="target-url-val">' + safeTargetUrl + '</div>\n' : '') +
'      <div class="error-desc">' + safeDetails + '</div>\n' +
'    </div>\n' +
'    <div class="actions-group">\n' +
'      <button type="button" onclick="window.location.reload();" class="btn-action btn-primary">\n' +
'        <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>\n' +
'        <span>Try Again</span>\n' +
'      </button>\n' +
(safeTargetUrl ? '      <a href="' + safeTargetUrl + '" target="_blank" rel="noopener" class="btn-action btn-secondary">\n' +
'        <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>\n' +
'        <span>Test Direct Connection (No Proxy)</span>\n' +
'      </a>\n' : '') +
'      <button type="button" onclick="window.location.href=window.location.origin + \'/\'; return false;" class="btn-action btn-outline">\n' +
'        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>\n' +
'        <span>Return to Heavenly Home</span>\n' +
'      </button>\n' +
'    </div>\n' +
'    <div class="footer-note">Heavenly Web Proxy &bull; Ethereal &bull; Streamlined</div>\n' +
'  </div>\n' +
'</body>\n' +
'</html>';
}

app.renderHeavenlyErrorPage = renderHeavenlyErrorPage;

var unblocker = new Unblocker(unblockerConfig);

// this line must appear before any express.static calls (or anything else that sends responses)
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
    if (reqPath && reqPath.indexOf('/proxy/') === 0) {
        targetUrl = reqPath.substring('/proxy/'.length);
        if (targetUrl.indexOf(':/') !== -1 && targetUrl.indexOf('://') === -1) {
            targetUrl = targetUrl.replace(/^(https?:\/)([^\/])/i, '$1/$2');
        }
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }
    }

    var code = (err && (err.code || err.errno)) || '';
    var statusCode = 502;
    var errorType = 'Server Not Found';
    var details = 'An error occurred while connecting to the requested website through Heavenly Proxy.';

    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        statusCode = 502;
        errorType = 'Server Not Found';
        details = 'Heavenly could not connect or resolve the server address at ' + (targetUrl || 'this website') + '. Check that the website address is typed correctly.';
    } else if (code === 'ECONNREFUSED') {
        statusCode = 502;
        errorType = 'Connection Refused';
        details = 'The target server at ' + (targetUrl || 'this website') + ' refused the connection. The server may be offline or down for maintenance.';
    } else if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
        statusCode = 504;
        errorType = 'Connection Timed Out';
        details = 'The connection to ' + (targetUrl || 'this website') + ' timed out before a response was received.';
    } else if (code === 'ECONNRESET' || code === 'EPIPE') {
        statusCode = 502;
        errorType = 'Connection Reset';
        details = 'The connection to the target website was unexpectedly reset.';
    } else if (err && err.status && err.status >= 400 && err.status < 600) {
        statusCode = err.status;
        errorType = 'Error ' + err.status;
        details = err.message || details;
    } else if (err && err.message) {
        details = err.message;
    }

    var html = renderHeavenlyErrorPage({
        statusCode: statusCode,
        errorType: errorType,
        targetUrl: targetUrl,
        details: details
    });

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

            var details = 'The target server at ' + (targetUrl || 'this website') + ' returned a ' + status + ' error response. The remote website is currently experiencing server issues.';

            var html = renderHeavenlyErrorPage({
                statusCode: status,
                errorType: errorType,
                targetUrl: targetUrl,
                details: details
            });

            data.headers = data.headers || {};
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
app.responseCorsMiddleware = responseCorsMiddleware;
app.responseLinkHeaderMiddleware = responseLinkHeaderMiddleware;
app.newgroundsMiddleware = newgroundsMiddleware;
app.cloudflareMiddleware = cloudflareMiddleware;
app.responseRedirectMiddleware = responseRedirectMiddleware;
app.serverErrorResponseMiddleware = serverErrorResponseMiddleware;
app.heavenlyErrorMiddleware = heavenlyErrorMiddleware;

module.exports = app;

if (require.main === module) {
    const port = process.env.PORT || process.env.VCAP_APP_PORT || 8080;

    app.listen(port, function() {
        console.log(`node unblocker process listening at http://localhost:${port}/`);
    }).on("upgrade", unblocker.onUpgrade); // onUpgrade handles websockets
}

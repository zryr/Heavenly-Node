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
    if (!data.url) return;
    try {
        var targetUri = data.uri || new URL(data.url);

        // Clean & normalize Referer header if present
        if (data.headers && data.headers.referer) {
            var ref = data.headers.referer;
            ref = ref.replace(/^(https?:\/)([^\/])/i, '$1/$2');
            var proxyPrefixIndex = ref.indexOf(unblockerConfig.prefix);
            if (proxyPrefixIndex !== -1) {
                ref = ref.substring(proxyPrefixIndex + unblockerConfig.prefix.length);
                ref = ref.replace(/^(https?:\/)([^\/])/i, '$1/$2');
            }
            data.headers.referer = ref;
        }

        // Rewrite Origin header to target origin if set to proxy domain
        if (data.headers && data.headers.origin && targetUri.origin) {
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
    if (!data.url) return;
    try {
        var parsed = data.uri || new URL(data.url);
        var hostname = parsed.hostname || parsed.host;
        if (hostname && /(^|\.)(newgrounds\.com|ngfiles\.com|ungrounded\.net)$/i.test(hostname)) {
            data.headers['referer'] = 'https://www.newgrounds.com/';
            data.headers['origin'] = 'https://www.newgrounds.com';
        }
    } catch (e) {
        // ignore invalid URL
    }
}

var unblockerConfig = {
    prefix: '/proxy/',
    requestMiddleware: [
        headersMiddleware,
        newgroundsMiddleware,
        youtube.processRequest
    ],
    responseMiddleware: [
        responseLinkHeaderMiddleware,
        googleAnalyticsMiddleware
    ]
};

// Serve our updated unblocker-client script before unblocker handles it
app.get('/proxy/client/unblocker-client.js', function(req, res) {
    res.sendFile(__dirname + '/custom-client/unblocker-client.js');
});

// Middleware to normalize collapsed single-slash proxy URLs (e.g., /proxy/https:/ -> /proxy/https://)
app.use(function normalizeProxyUrl(req, res, next) {
    if (req.url && req.url.indexOf('/proxy/') === 0) {
        req.url = req.url.replace(/^\/proxy\/(https?:\/)([^\/]|$)/i, '/proxy/$1/$2');
    }
    next();
});

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

app.addGa = addGa;
app.googleAnalyticsMiddleware = googleAnalyticsMiddleware;
app.headersMiddleware = headersMiddleware;
app.responseLinkHeaderMiddleware = responseLinkHeaderMiddleware;
app.newgroundsMiddleware = newgroundsMiddleware;

module.exports = app;

if (require.main === module) {
    const port = process.env.PORT || process.env.VCAP_APP_PORT || 8080;

    app.listen(port, function() {
        console.log(`node unblocker process listening at http://localhost:${port}/`);
    }).on("upgrade", unblocker.onUpgrade); // onUpgrade handles websockets
}

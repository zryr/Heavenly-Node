var app = require('./app');

function unoptimized(data) {
    if (!data || !data.headers) return;

    for (var key in data.headers) {
        if (key.toLowerCase() === 'x-frame-options') {
            delete data.headers[key];
        }
    }

    var cleanCspDirectives = function(str) {
        if (typeof str !== 'string') return str;
        var directives = str.split(';');
        var filtered = [];
        for (var i = 0; i < directives.length; i++) {
            var trimmed = directives[i].trim();
            if (trimmed.length > 0 && !/^frame-ancestors(\s|$)/i.test(trimmed)) {
                filtered.push(trimmed);
            }
        }
        return filtered.join('; ');
    };

    var cspHeaders = [
        'content-security-policy',
        'content-security-policy-report-only',
        'x-content-security-policy',
        'x-webkit-csp'
    ];
    for (var h in data.headers) {
        if (cspHeaders.indexOf(h.toLowerCase()) !== -1) {
            var val = data.headers[h];
            if (Array.isArray(val)) {
                var cleanedList = val.map(cleanCspDirectives).filter(function(v) { return v && v.length > 0; });
                if (cleanedList.length > 0) {
                    data.headers[h] = cleanedList;
                } else {
                    delete data.headers[h];
                }
            } else if (typeof val === 'string') {
                var cleanedStr = cleanCspDirectives(val);
                if (cleanedStr) {
                    data.headers[h] = cleanedStr;
                } else {
                    delete data.headers[h];
                }
            }
        }
    }
}

const sampleHeaders = [
    { 'content-type': 'text/html', 'server': 'nginx', 'cache-control': 'max-age=3600', 'x-frame-options': 'SAMEORIGIN', 'content-security-policy': "default-src 'self'; frame-ancestors 'none';" },
    { 'content-type': 'text/css', 'server': 'cloudflare', 'content-security-policy': "default-src 'self';" },
    { 'content-type': 'application/javascript', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' },
    { 'content-type': 'image/png', 'accept-ranges': 'bytes', 'etag': '12345' }
];

const N = 500000;

console.time('unoptimized');
for (let i = 0; i < N; i++) {
    const h = Object.assign({}, sampleHeaders[i % sampleHeaders.length]);
    unoptimized({ headers: h });
}
console.timeEnd('unoptimized');

console.time('optimized');
for (let i = 0; i < N; i++) {
    const h = Object.assign({}, sampleHeaders[i % sampleHeaders.length]);
    app.iframeSecurityHeadersResponseMiddleware({ headers: h });
}
console.timeEnd('optimized');

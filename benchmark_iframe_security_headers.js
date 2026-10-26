var app = require('./app');

function unoptimized(data) {
    if (!data || !data.headers || !data.remoteResponse || !data.remoteResponse.headers) return;
    var original = data.remoteResponse.headers;
    Object.keys(original).forEach(function(key) {
        if (/^(?:x-frame-options|content-security-policy(?:-report-only)?|x-content-security-policy|x-webkit-csp|x-content-type-options)$/i.test(key)) {
            data.headers[key] = original[key];
        }
    });
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
    const h = sampleHeaders[i % sampleHeaders.length];
    unoptimized({ headers: {}, remoteResponse: { headers: h } });
}
console.timeEnd('unoptimized');

console.time('optimized');
for (let i = 0; i < N; i++) {
    const h = sampleHeaders[i % sampleHeaders.length];
    app.iframeSecurityHeadersResponseMiddleware({ headers: {}, remoteResponse: { headers: h } });
}
console.timeEnd('optimized');

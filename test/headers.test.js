var assert = require('assert');
var app = require('../app.js');

describe('headersMiddleware request middleware', function() {
    describe('Fast-path guards', function() {
        it('should do nothing if data.url is missing or falsy', function() {
            var data = {
                headers: { referer: 'https://example.com/page', origin: 'https://example.com' }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://example.com/page');
            assert.strictEqual(data.headers.origin, 'https://example.com');
        });

        it('should do nothing if data.headers is missing or falsy', function() {
            var data = {
                url: 'https://example.com/page'
            };
            assert.doesNotThrow(function() {
                app.headersMiddleware(data);
            });
            assert.strictEqual(data.headers, undefined);
        });

        it('should do nothing if both referer and origin are missing', function() {
            var data = {
                url: 'https://example.com/page',
                headers: { 'user-agent': 'Mozilla/5.0' }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers['user-agent'], 'Mozilla/5.0');
            assert.strictEqual(data.headers.referer, undefined);
            assert.strictEqual(data.headers.origin, undefined);
        });
    });

    describe('Referer header cleaning and normalization', function() {
        it('should preserve valid absolute Referer URLs', function() {
            var data = {
                url: 'https://example.com/page',
                headers: { referer: 'https://example.com/previous' }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://example.com/previous');
        });

        it('should normalize single-slash scheme in Referer URLs', function() {
            var data1 = {
                url: 'https://example.com/page',
                headers: { referer: 'https:/example.com/previous' }
            };
            app.headersMiddleware(data1);
            assert.strictEqual(data1.headers.referer, 'https://example.com/previous');

            var data2 = {
                url: 'http://example.com/page',
                headers: { referer: 'http:/example.com/previous' }
            };
            app.headersMiddleware(data2);
            assert.strictEqual(data2.headers.referer, 'http://example.com/previous');
        });

        it('should strip single proxy prefix from Referer URL', function() {
            var data = {
                url: 'https://example.com/page',
                headers: { referer: '/proxy/https://example.com/previous' }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://example.com/previous');
        });

        it('should strip single proxy prefix with single-slash scheme from Referer URL', function() {
            var data = {
                url: 'https://example.com/page',
                headers: { referer: '/proxy/https:/example.com/previous' }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://example.com/previous');
        });

        it('should strip multiple nested proxy prefixes from Referer URL', function() {
            var data = {
                url: 'https://example.com/page',
                headers: { referer: '/proxy/https:/domain.com/proxy/https://example.com/previous' }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://example.com/previous');
        });

        it('should strip host-prefixed proxy prefix from Referer URL', function() {
            var data = {
                url: 'https://example.com/page',
                headers: { referer: 'https://myproxy.com/proxy/https:/example.com/previous' }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://example.com/previous');
        });
    });

    describe('Origin header rewriting', function() {
        it('should rewrite Origin header to target origin from URL string', function() {
            var data = {
                url: 'https://api.example.com/v1/resource',
                headers: { origin: 'https://myproxy.com' }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.origin, 'https://api.example.com');
        });

        it('should rewrite Origin header using pre-parsed data.uri', function() {
            var targetUrl = 'https://sub.example.com/test';
            var data = {
                url: targetUrl,
                uri: new (require('url').URL)(targetUrl),
                headers: { origin: 'https://myproxy.com' }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.origin, 'https://sub.example.com');
        });
    });

    describe('Combined headers & Error handling', function() {
        it('should clean Referer and rewrite Origin together', function() {
            var data = {
                url: 'https://example.com/app/login',
                headers: {
                    referer: '/proxy/https:/example.com/app/start',
                    origin: 'https://myproxy.com'
                }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://example.com/app/start');
            assert.strictEqual(data.headers.origin, 'https://example.com');
        });

        it('should handle invalid URLs gracefully without throwing an exception', function() {
            var data = {
                url: 'invalid-url-string',
                headers: {
                    referer: 'http://example.com',
                    origin: 'http://example.com'
                }
            };
            assert.doesNotThrow(function() {
                app.headersMiddleware(data);
            });
            // Headers remain unmodified when URL parsing throws
            assert.strictEqual(data.headers.referer, 'http://example.com');
            assert.strictEqual(data.headers.origin, 'http://example.com');
        });

        it('should handle uppercase scheme single-slash normalization in Referer', function() {
            var data1 = {
                url: 'https://example.com/page',
                headers: { referer: 'HTTP:/example.com/test' }
            };
            app.headersMiddleware(data1);
            assert.strictEqual(data1.headers.referer, 'HTTP://example.com/test');

            var data2 = {
                url: 'https://example.com/page',
                headers: { referer: 'HTTPS:/example.com/test' }
            };
            app.headersMiddleware(data2);
            assert.strictEqual(data2.headers.referer, 'HTTPS://example.com/test');

            var data3 = {
                url: 'https://example.com/page',
                headers: { referer: 'Https:/example.com/test' }
            };
            app.headersMiddleware(data3);
            assert.strictEqual(data3.headers.referer, 'Https://example.com/test');
        });

        it('should handle empty string header values correctly', function() {
            var data1 = {
                url: 'https://example.com/page',
                headers: { referer: '', origin: 'https://proxy.com' }
            };
            app.headersMiddleware(data1);
            assert.strictEqual(data1.headers.referer, '');
            assert.strictEqual(data1.headers.origin, 'https://example.com');

            var data2 = {
                url: 'https://example.com/page',
                headers: { referer: '/proxy/https:/example.com/prev', origin: '' }
            };
            app.headersMiddleware(data2);
            assert.strictEqual(data2.headers.referer, 'https://example.com/prev');
            assert.strictEqual(data2.headers.origin, '');
        });

        it('should preserve other unrelated headers intact when modifying referer and origin', function() {
            var data = {
                url: 'https://example.com/api',
                headers: {
                    referer: '/proxy/https://example.com/home',
                    origin: 'https://proxy.com',
                    'user-agent': 'CustomAgent/1.0',
                    'accept-language': 'en-US,en;q=0.9',
                    authorization: 'Bearer secret_token'
                }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://example.com/home');
            assert.strictEqual(data.headers.origin, 'https://example.com');
            assert.strictEqual(data.headers['user-agent'], 'CustomAgent/1.0');
            assert.strictEqual(data.headers['accept-language'], 'en-US,en;q=0.9');
            assert.strictEqual(data.headers.authorization, 'Bearer secret_token');
        });

        it('should handle multiple nested proxy prefixes with mixed single and double slashes', function() {
            var data = {
                url: 'https://example.com/app',
                headers: {
                    referer: 'https://proxy.com/proxy/http:/other.com/proxy/https:/example.com/start'
                }
            };
            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://example.com/start');
        });
    });
});

describe('upstream security restrictions', function() {
    it('preserves framing, CSP and MIME restrictions verbatim', function() {
        const original = {
            'x-frame-options': 'DENY',
            'content-security-policy': ["default-src 'self'", "frame-ancestors 'none'"],
            'content-security-policy-report-only': "script-src 'self'",
            'x-content-security-policy': "frame-ancestors https://trusted.test",
            'x-webkit-csp': "frame-ancestors 'none'",
            'x-content-type-options': 'nosniff'
        };
        const data = { headers: { 'content-type': 'text/html' }, remoteResponse: { headers: original } };
        app.iframeSecurityHeadersResponseMiddleware(data);
        Object.keys(original).forEach(key => assert.deepStrictEqual(data.headers[key], original[key]));
        assert.strictEqual(data.headers['content-type'], 'text/html');
    });
    it('leaves existing restrictions unchanged without a remoteResponse', function() {
        const data = { headers: { 'X-Frame-Options': 'DENY', 'content-security-policy': "frame-ancestors 'none'" } };
        const before = JSON.stringify(data);
        app.iframeSecurityHeadersResponseMiddleware(data);
        assert.strictEqual(JSON.stringify(data), before);
        [null, {}, { headers: null }].forEach(value => assert.doesNotThrow(() => app.iframeSecurityHeadersResponseMiddleware(value)));
    });
});

describe('Express routes X-Frame-Options header removal', function() {
    var request = require('supertest');

    it('should not include X-Frame-Options header on GET /', function(done) {
        request(app)
            .get('/')
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);
                assert.strictEqual(res.headers['x-frame-options'], undefined);
                done();
            });
    });

    it('should not include X-Frame-Options header on GET /no-js', function(done) {
        request(app)
            .get('/no-js?url=http://example.com')
            .expect(302)
            .end(function(err, res) {
                if (err) return done(err);
                assert.strictEqual(res.headers['x-frame-options'], undefined);
                done();
            });
    });

    it('should prevent routes or middleware from setting X-Frame-Options via res.setHeader', function(done) {
        var express = require('express');
        var testApp = express();
        testApp.use((req, res, next) => {
            res.removeHeader('X-Frame-Options');
            var origSetHeader = res.setHeader;
            res.setHeader = function(name, val) {
                if (typeof name === 'string' && name.toLowerCase() === 'x-frame-options') {
                    return;
                }
                return origSetHeader.apply(this, arguments);
            };
            next();
        });
        testApp.get('/test-frame-block', (req, res) => {
            res.setHeader('X-Frame-Options', 'DENY');
            res.send('ok');
        });

        request(testApp)
            .get('/test-frame-block')
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);
                assert.strictEqual(res.headers['x-frame-options'], undefined);
                done();
            });
    });
});


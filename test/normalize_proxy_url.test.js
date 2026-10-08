var assert = require('assert');
var request = require('supertest');
var app = require('../app.js');

describe('normalizeProxyUrl middleware', function() {
    describe('Unit Tests - Direct invocation with mock objects', function() {
        it('should do nothing and call next() if req.url is missing or undefined', function() {
            var req = {};
            var res = {};
            var nextCalled = false;

            app.normalizeProxyUrl(req, res, function next() {
                nextCalled = true;
            });

            assert.strictEqual(nextCalled, true);
            assert.strictEqual(req.url, undefined);
        });

        it('should do nothing and call next() if req.url is an empty string', function() {
            var req = { url: '' };
            var res = {};
            var nextCalled = false;

            app.normalizeProxyUrl(req, res, function next() {
                nextCalled = true;
            });

            assert.strictEqual(nextCalled, true);
            assert.strictEqual(req.url, '');
        });

        it('should leave non-proxy URLs intact and call next()', function() {
            var nonProxyUrls = [
                '/',
                '/index.html',
                '/settings.html',
                '/api/v1/test',
                '/proxied/https/example.com'
            ];

            nonProxyUrls.forEach(function(urlStr) {
                var req = { url: urlStr };
                var res = {};
                var nextCalled = false;

                app.normalizeProxyUrl(req, res, function next() {
                    nextCalled = true;
                });

                assert.strictEqual(nextCalled, true);
                assert.strictEqual(req.url, urlStr);
            });
        });

        it('should leave standard double-slash proxied URLs unmodified', function() {
            var validProxyUrls = [
                '/proxy/https://example.com',
                '/proxy/http://example.com/page?param=1',
                '/proxy/https://sub.domain.org:8080/path/to/resource'
            ];

            validProxyUrls.forEach(function(urlStr) {
                var req = { url: urlStr };
                var res = {};
                var nextCalled = false;

                app.normalizeProxyUrl(req, res, function next() {
                    nextCalled = true;
                });

                assert.strictEqual(nextCalled, true);
                assert.strictEqual(req.url, urlStr);
            });
        });

        it('should normalize single-slash scheme in proxied URLs', function() {
            var testCases = [
                { input: '/proxy/https:/example.com', expected: '/proxy/https://example.com' },
                { input: '/proxy/http:/example.com/path', expected: '/proxy/http://example.com/path' },
                { input: '/proxy/https:/domain.com:443/test?q=1', expected: '/proxy/https://domain.com:443/test?q=1' }
            ];

            testCases.forEach(function(tc) {
                var req = { url: tc.input };
                var res = {};
                var nextCalled = false;

                app.normalizeProxyUrl(req, res, function next() {
                    nextCalled = true;
                });

                assert.strictEqual(nextCalled, true);
                assert.strictEqual(req.url, tc.expected);
            });
        });

        it('should handle case-insensitive scheme single-slash normalization', function() {
            var testCases = [
                { input: '/proxy/HTTPS:/example.com', expected: '/proxy/HTTPS://example.com' },
                { input: '/proxy/Http:/example.com/page', expected: '/proxy/Http://example.com/page' },
                { input: '/proxy/HtTpS:/test.org', expected: '/proxy/HtTpS://test.org' }
            ];

            testCases.forEach(function(tc) {
                var req = { url: tc.input };
                var res = {};
                var nextCalled = false;

                app.normalizeProxyUrl(req, res, function next() {
                    nextCalled = true;
                });

                assert.strictEqual(nextCalled, true);
                assert.strictEqual(req.url, tc.expected);
            });
        });

        it('should strip nested proxy prefixes and normalize remaining URL', function() {
            var testCases = [
                {
                    input: '/proxy/https://proxy.com/proxy/https://example.com/page',
                    expected: '/proxy/https://example.com/page'
                },
                {
                    input: '/proxy/http:/first.com/proxy/https:/second.com/resource',
                    expected: '/proxy/https://second.com/resource'
                },
                {
                    input: '/proxy/https://a.com/proxy/http://b.com/proxy/https:/c.com/end',
                    expected: '/proxy/https://c.com/end'
                }
            ];

            testCases.forEach(function(tc) {
                var req = { url: tc.input };
                var res = {};
                var nextCalled = false;

                app.normalizeProxyUrl(req, res, function next() {
                    nextCalled = true;
                });

                assert.strictEqual(nextCalled, true);
                assert.strictEqual(req.url, tc.expected);
            });
        });

        it('should handle trailing incomplete single-slash scheme ending in slash', function() {
            var testCases = [
                { input: '/proxy/https:/', expected: '/proxy/https://' },
                { input: '/proxy/http:/', expected: '/proxy/http://' }
            ];

            testCases.forEach(function(tc) {
                var req = { url: tc.input };
                var res = {};
                var nextCalled = false;

                app.normalizeProxyUrl(req, res, function next() {
                    nextCalled = true;
                });

                assert.strictEqual(nextCalled, true);
                assert.strictEqual(req.url, tc.expected);
            });
        });
    });

    describe('Integration Tests - Express app request flow', function() {
        it('should run normalizeProxyUrl in the middleware pipeline when handling requests', function(done) {
            request(app)
                .get('/index.html')
                .expect(200, done);
        });
    });
});

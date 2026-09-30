var assert = require('assert');
var supertest = require('supertest');
var app = require('../app.js');
var client = require('../custom-client/unblocker-client.js');

describe('Duckmath request middleware & iframe safety', function() {
    describe('duckmathMiddleware', function() {
        it('should inject referer and origin headers for duckmath.org main domain', function() {
            var data = {
                url: 'https://duckmath.org/assets/game.js',
                uri: new (require('url').URL)('https://duckmath.org/assets/game.js'),
                headers: {}
            };

            app.duckmathMiddleware(data);
            assert.strictEqual(data.headers['referer'], 'https://duckmath.org/');
            assert.strictEqual(data.headers['origin'], 'https://duckmath.org');
        });

        it('should inject referer and origin headers for duckmath.org subdomains (e.g. db2.duckmath.org)', function() {
            var data = {
                url: 'https://db2.duckmath.org/games/subway-surfers/index.html',
                uri: new (require('url').URL)('https://db2.duckmath.org/games/subway-surfers/index.html'),
                headers: {}
            };

            app.duckmathMiddleware(data);
            assert.strictEqual(data.headers['referer'], 'https://duckmath.org/');
            assert.strictEqual(data.headers['origin'], 'https://duckmath.org');
        });

        it('should preserve existing duckmath domain referer when set', function() {
            var data = {
                url: 'https://db2.duckmath.org/games/subway-surfers/build.js',
                uri: new (require('url').URL)('https://db2.duckmath.org/games/subway-surfers/build.js'),
                headers: { 'referer': 'https://db2.duckmath.org/games/subway-surfers/' }
            };

            app.duckmathMiddleware(data);
            assert.strictEqual(data.headers['referer'], 'https://db2.duckmath.org/games/subway-surfers/');
            assert.strictEqual(data.headers['origin'], 'https://duckmath.org');
        });

        it('should normalize sec-fetch-site header when present', function() {
            var data = {
                url: 'https://duckmath.org/api/data',
                uri: new (require('url').URL)('https://duckmath.org/api/data'),
                headers: {
                    'sec-fetch-site': 'cross-site'
                }
            };

            app.duckmathMiddleware(data);
            assert.strictEqual(data.headers['sec-fetch-site'], 'same-origin');
        });

        it('should not modify headers for non-duckmath URLs', function() {
            var data = {
                url: 'https://example.com/test',
                uri: new (require('url').URL)('https://example.com/test'),
                headers: {
                    'referer': 'https://example.com/'
                }
            };

            app.duckmathMiddleware(data);
            assert.strictEqual(data.headers['referer'], 'https://example.com/');
            assert.strictEqual(data.headers['origin'], undefined);
            assert.strictEqual(data.headers['sec-fetch-site'], undefined);
        });
    });

    describe('Single-slash URL normalization middleware with req.originalUrl', function() {
        it('should normalize /proxy/https:/db2.duckmath.org/ to /proxy/https://db2.duckmath.org/', function(done) {
            supertest(app)
                .get('/proxy/https:/db2.duckmath.org/')
                .expect(function(res) {
                    assert.notStrictEqual(res.status, 404);
                })
                .end(done);
        });
    });

    describe('Client initForWindow with restricted iframe localStorage (SecurityError)', function() {
        it('should initialize without throwing exceptions when window.localStorage throws SecurityError', function() {
            var mockWindow = {
                location: {
                    pathname: '/proxy/https://db2.duckmath.org/',
                    search: '',
                    hash: '',
                    origin: 'http://localhost:8080',
                    hostname: 'localhost',
                    protocol: 'http:',
                    host: 'localhost:8080'
                },
                document: {
                    readyState: 'complete',
                    head: {
                        appendChild: function() {},
                        querySelectorAll: function() { return []; },
                        getElementById: function() { return null; }
                    },
                    body: { appendChild: function() {} },
                    documentElement: {
                        clientWidth: 1024,
                        clientHeight: 768,
                        scrollWidth: 1024,
                        scrollHeight: 768,
                        addEventListener: function() {}
                    },
                    createElement: function() {
                        return {
                            appendChild: function() {},
                            setAttribute: function() {},
                            style: {}
                        };
                    },
                    getElementById: function() { return null; },
                    getElementsByTagName: function() { return []; },
                    querySelectorAll: function() { return []; },
                    addEventListener: function() {}
                },
                addEventListener: function() {},
                removeEventListener: function() {}
            };

            Object.defineProperty(mockWindow, 'localStorage', {
                get: function() {
                    throw new Error('SecurityError: Access to localStorage is denied for this document');
                },
                configurable: true
            });

            assert.doesNotThrow(function() {
                client.initForWindow({ prefix: '/proxy/', url: 'https://db2.duckmath.org/' }, mockWindow);
            });
        });
    });
});

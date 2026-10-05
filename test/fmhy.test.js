var assert = require('assert');
var supertest = require('supertest');
var app = require('../app.js');
var client = require('../custom-client/unblocker-client.js');

describe('fmhy.net & proxy fixes', function() {
    describe('Express trust proxy configuration', function() {
        it('should have trust proxy enabled on Express app', function() {
            assert.strictEqual(app.get('trust proxy'), true);
        });
    });

    describe('Single-slash URL normalization middleware', function() {
        it('should normalize /proxy/https:/fmhy.net to /proxy/https://fmhy.net', function(done) {
            supertest(app)
                .get('/proxy/https:/fmhy.net/')
                .set('X-Forwarded-Proto', 'https')
                .expect(function(res) {
                    // express should have handled /proxy/https:/ as /proxy/https://
                    // and not returned 404
                    assert.notStrictEqual(res.status, 404);
                })
                .end(done);
        });
    });

    describe('headersMiddleware request header sanitization', function() {
        it('should normalize single-slash referer and set origin header', function() {
            var data = {
                url: 'https://fmhy.net/assets/style.C1ZV90s5.css',
                uri: new (require('url').URL)('https://fmhy.net/assets/style.C1ZV90s5.css'),
                headers: {
                    referer: 'https://heavenly-node.vercel.app/proxy/https:/fmhy.net/',
                    origin: 'https://heavenly-node.vercel.app'
                }
            };

            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://fmhy.net/');
            assert.strictEqual(data.headers.origin, 'https://fmhy.net');
        });

        it('should preserve already valid referer and origin headers', function() {
            var data = {
                url: 'https://fmhy.net/assets/app.js',
                uri: new (require('url').URL)('https://fmhy.net/assets/app.js'),
                headers: {
                    referer: 'https://fmhy.net/',
                    origin: 'https://fmhy.net'
                }
            };

            app.headersMiddleware(data);
            assert.strictEqual(data.headers.referer, 'https://fmhy.net/');
            assert.strictEqual(data.headers.origin, 'https://fmhy.net');
        });
    });

    describe('responseLinkHeaderMiddleware', function() {
        it('should rewrite relative URLs in HTTP Link header', function() {
            var data = {
                url: 'https://fmhy.net/',
                headers: {
                    'link': '</assets/style.C1ZV90s5.css>; rel="preload stylesheet"; as=style, </vp-icons.css>; rel="preload stylesheet"; as=style'
                }
            };

            app.responseLinkHeaderMiddleware(data);
            assert.strictEqual(
                data.headers['link'],
                '</proxy/https://fmhy.net/assets/style.C1ZV90s5.css>; rel="preload stylesheet"; as=style, </proxy/https://fmhy.net/vp-icons.css>; rel="preload stylesheet"; as=style'
            );
        });

        it('should handle array of Link headers', function() {
            var data = {
                url: 'https://fmhy.net/',
                headers: {
                    'link': [
                        '</assets/chunks/theme.js>; rel="modulepreload"',
                        '</assets/chunks/framework.js>; rel="modulepreload"'
                    ]
                }
            };

            app.responseLinkHeaderMiddleware(data);
            assert.deepStrictEqual(data.headers['link'], [
                '</proxy/https://fmhy.net/assets/chunks/theme.js>; rel="modulepreload"',
                '</proxy/https://fmhy.net/assets/chunks/framework.js>; rel="modulepreload"'
            ]);
        });
    });

    describe('client fixUrl single-slash normalization', function() {
        it('should fix single-slash urlStr input', function() {
            var config = { prefix: '/proxy/' };
            var mockLocation = {
                pathname: '/proxy/https://fmhy.net/',
                search: '',
                hash: '',
                origin: 'https://heavenly-node.vercel.app',
                hostname: 'heavenly-node.vercel.app'
            };

            var res = client.fixUrl('https:/fmhy.net/test.png', config, mockLocation);
            assert.strictEqual(res, '/proxy/https://fmhy.net/test.png');
        });

        it('should fix single-slash location.pathname', function() {
            var config = { prefix: '/proxy/' };
            var mockLocation = {
                pathname: '/proxy/https:/fmhy.net/',
                search: '',
                hash: '',
                origin: 'https://heavenly-node.vercel.app',
                hostname: 'heavenly-node.vercel.app'
            };

            var res = client.fixUrl('assets/chunks/theme.js', config, mockLocation);
            assert.strictEqual(res, '/proxy/https://fmhy.net/assets/chunks/theme.js');
        });

        it('should perform fast-path root-relative URL rewriting', function() {
            var config = { prefix: '/proxy/' };
            var mockLocation = {
                pathname: '/proxy/https://fmhy.net/beginners-guide',
                search: '',
                hash: '',
                origin: 'https://heavenly-node.vercel.app',
                hostname: 'heavenly-node.vercel.app'
            };

            var res = client.fixUrl('/gaming', config, mockLocation);
            assert.strictEqual(res, '/proxy/https://fmhy.net/gaming');
        });
    });

    describe('stripIntegrityMiddleware & stripFrameHeadersMiddleware (Server-side)', function() {
        it('should strip X-Frame-Options header in stripFrameHeadersMiddleware', function() {
            var data = {
                headers: {
                    'x-frame-options': 'DENY',
                    'content-type': 'text/html'
                }
            };
            app.stripFrameHeadersMiddleware(data);
            assert.strictEqual(data.headers['x-frame-options'], undefined);
        });

        it('should transform HTML stream to strip integrity attributes', function(done) {
            var Stream = require('stream');
            var readable = new Stream.Readable();
            readable._read = function() {};

            var data = {
                contentType: 'text/html',
                stream: readable
            };

            app.stripIntegrityMiddleware(data);

            var result = '';
            data.stream.on('data', function(chunk) {
                result += chunk.toString();
            });
            data.stream.on('end', function() {
                assert.strictEqual(result, '<script src="/proxy/https://fmhy.net/app.js"></script>');
                done();
            });

            readable.push('<script src="/proxy/https://fmhy.net/app.js" integrity="sha512-12345"></script>');
            readable.push(null);
        });
    });

    describe('Client SPA Route Un-Proxying & Attribute Un-Proxying', function() {
        it('unfixAttributeUrl should extract relative route paths', function() {
            var config = { prefix: '/proxy/' };
            assert.strictEqual(
                client.unfixAttributeUrl('/proxy/https://fmhy.net/beginners-guide', config),
                '/beginners-guide'
            );
            assert.strictEqual(
                client.unfixAttributeUrl('/proxy/https://fmhy.net/', config),
                '/'
            );
        });

        it('initLocationPrototype should un-proxy Location properties and memoize target URL object', function() {
            var config = { prefix: '/proxy/' };
            function MockLocation() {
                this._pathname = '/proxy/https://fmhy.net/beginners-guide';
                this._search = '?q=1';
                this._hash = '#section';
            }
            Object.defineProperty(MockLocation.prototype, 'pathname', {
                get: function() { return this._pathname; },
                set: function(val) { this._pathname = val; },
                configurable: true
            });
            Object.defineProperty(MockLocation.prototype, 'search', {
                get: function() { return this._search; },
                configurable: true
            });
            Object.defineProperty(MockLocation.prototype, 'hash', {
                get: function() { return this._hash; },
                configurable: true
            });

            var mockWin = {
                Location: MockLocation,
                location: new MockLocation()
            };

            client.initLocationPrototype(config, mockWin);

            var loc = mockWin.location;
            assert.strictEqual(loc.pathname, '/beginners-guide');
            assert.strictEqual(loc.href, 'https://fmhy.net/beginners-guide?q=1#section');
            assert.strictEqual(loc.origin, 'https://fmhy.net');
            assert.strictEqual(loc.host, 'fmhy.net');
            assert.strictEqual(loc.hostname, 'fmhy.net');

            // Verify memoization
            assert.ok(loc._heavenlyTargetObj);
            assert.strictEqual(loc._heavenlyTargetCacheKey, '/proxy/https://fmhy.net/beginners-guide|?q=1|#section');
        });

        it('initDocumentPrototypes should un-proxy Document URL, documentURI, and baseURI', function() {
            var config = { prefix: '/proxy/' };
            function MockDocument() {}
            MockDocument.prototype = {};

            var mockWin = {
                Document: MockDocument,
                location: {
                    pathname: '/proxy/https://fmhy.net/beginners-guide',
                    search: '',
                    hash: ''
                }
            };

            client.initDocumentPrototypes(config, mockWin);

            var doc = new MockDocument();
            assert.strictEqual(doc.URL, 'https://fmhy.net/beginners-guide');
            assert.strictEqual(doc.documentURI, 'https://fmhy.net/beginners-guide');
            assert.strictEqual(doc.baseURI, 'https://fmhy.net/beginners-guide');
        });

        it('initURLConstructor should wrap window.URL constructor while preserving static methods', function() {
            var config = { prefix: '/proxy/' };
            var NativeURL = global.URL;
            NativeURL.createObjectURL = function() { return 'blob:test'; };
            NativeURL.revokeObjectURL = function() {};

            var mockWin = {
                URL: NativeURL,
                location: {
                    pathname: '/proxy/https://fmhy.net/',
                    search: '',
                    hash: ''
                }
            };

            client.initURLConstructor(config, mockWin);

            var parsed = new mockWin.URL('/proxy/https://fmhy.net/beginners-guide');
            assert.strictEqual(parsed.href, 'https://fmhy.net/beginners-guide');
            assert.strictEqual(parsed.pathname, '/beginners-guide');

            assert.strictEqual(typeof mockWin.URL.createObjectURL, 'function');
            assert.strictEqual(mockWin.URL.createObjectURL(), 'blob:test');
        });

        it('initElementPrototypes should neutralize integrity properties and setAttribute', function() {
            var config = { prefix: '/proxy/' };
            var removedAttr = '';
            var storedAttr = {};

            function MockElement() {}
            MockElement.prototype = {
                removeAttribute: function(name) { removedAttr = name; delete storedAttr[name]; },
                setAttribute: function(name, val) { storedAttr[name] = val; },
                getAttribute: function(name) { return storedAttr[name] || null; }
            };

            function MockScript() {}
            Object.setPrototypeOf(MockScript.prototype, MockElement.prototype);

            var mockWin = {
                HTMLScriptElement: MockScript,
                Element: MockElement,
                location: { pathname: '/proxy/https://fmhy.net/' },
                addEventListener: function() {},
                document: { readyState: 'complete', documentElement: { addEventListener: function() {} } }
            };

            client.initForWindow(config, mockWin);

            var script = new MockScript();
            script.integrity = 'sha512-abcdef';
            assert.strictEqual(script.integrity, '');
            assert.strictEqual(removedAttr, 'integrity');

            script.setAttribute('integrity', 'sha512-xyz');
            assert.strictEqual(removedAttr, 'integrity');
            assert.strictEqual(script.getAttribute('integrity'), null);
        });
    });
});

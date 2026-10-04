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
    });

    describe('Client Location.prototype wrapping and SRI attribute stripping', function() {
        it('should return target URL pathname and origin via Location.prototype getters', function() {
            function MockLocation(pathname, search, hash) {
                this._pathname = pathname;
                this.search = search || '';
                this.hash = hash || '';
            }
            MockLocation.prototype = {};
            Object.defineProperty(MockLocation.prototype, 'pathname', { get: function() { return this._pathname; }, set: function(v) { this._pathname = v; }, configurable: true });
            Object.defineProperty(MockLocation.prototype, 'href', { get: function() { return 'https://heavenly-node.vercel.app' + this._pathname; }, set: function(v) { this._pathname = v; }, configurable: true });
            Object.defineProperty(MockLocation.prototype, 'origin', { get: function() { return 'https://heavenly-node.vercel.app'; }, configurable: true });
            Object.defineProperty(MockLocation.prototype, 'host', { get: function() { return 'heavenly-node.vercel.app'; }, configurable: true });
            Object.defineProperty(MockLocation.prototype, 'hostname', { get: function() { return 'heavenly-node.vercel.app'; }, configurable: true });

            var mockWin = {
                Location: MockLocation
            };

            client.initForWindow({ prefix: '/proxy/', url: 'https://fmhy.net/' }, mockWin);

            var locInstance = new MockLocation('/proxy/https://fmhy.net/beginners-guide', '', '');
            assert.strictEqual(locInstance.pathname, '/beginners-guide');
            assert.strictEqual(locInstance.origin, 'https://fmhy.net');
            assert.strictEqual(locInstance.hostname, 'fmhy.net');
            assert.strictEqual(locInstance.href, 'https://fmhy.net/beginners-guide');
        });

        it('should strip integrity attribute via Element.prototype.setAttribute', function() {
            function MockElement() {
                this.attributes = {};
            }
            MockElement.prototype.setAttribute = function(name, val) {
                this.attributes[name] = val;
            };
            MockElement.prototype.removeAttribute = function(name) {
                delete this.attributes[name];
            };

            function MockScript() { MockElement.call(this); }
            MockScript.prototype = Object.create(MockElement.prototype);

            function MockLink() { MockElement.call(this); }
            MockLink.prototype = Object.create(MockElement.prototype);

            var mockWin = {
                Element: MockElement,
                HTMLScriptElement: MockScript,
                HTMLLinkElement: MockLink,
                location: {
                    pathname: '/proxy/https://fmhy.net/',
                    search: '',
                    hash: '',
                    origin: 'https://heavenly-node.vercel.app',
                    hostname: 'heavenly-node.vercel.app'
                }
            };

            client.initForWindow({ prefix: '/proxy/', url: 'https://fmhy.net/' }, mockWin);

            var script = new MockScript();
            script.setAttribute('src', 'https://static.cloudflareinsights.com/beacon.min.js');
            script.setAttribute('integrity', 'sha512-iIg7k2xntmwu6');

            assert.strictEqual(script.attributes['integrity'], undefined);
            assert.strictEqual(script.integrity, '');
        });
    });
});

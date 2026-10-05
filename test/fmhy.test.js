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

    describe('FMHY default bookmark entries in public/index.html and public/settings.html', function() {
        it('should contain FMHY: Movies at top of Movies/Shows category', function() {
            var fs = require('fs');
            var indexContent = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');
            var match = indexContent.match(/var DEFAULT_BOOKMARK_DATA = (\{[\s\S]*?\n    \});/);
            assert.ok(match, 'DEFAULT_BOOKMARK_DATA should exist in public/index.html');
            var data = eval('(' + match[1] + ')');

            var moviesBms = data.bookmarks.filter(function(b) { return b.categoryId === 'cat_movies'; });
            moviesBms.sort(function(a, b) { return a.order - b.order; });

            assert.strictEqual(moviesBms[0].id, 'bm_fmhy_movies');
            assert.strictEqual(moviesBms[0].title, 'FMHY: Movies');
            assert.strictEqual(moviesBms[0].url, 'https://fmhy.net/video');
        });

        it('should contain FMHY: Anime directly below EverythingMoe in Anime category', function() {
            var fs = require('fs');
            var indexContent = fs.readFileSync(__dirname + '/../public/index.html', 'utf8');
            var match = indexContent.match(/var DEFAULT_BOOKMARK_DATA = (\{[\s\S]*?\n    \});/);
            assert.ok(match, 'DEFAULT_BOOKMARK_DATA should exist in public/index.html');
            var data = eval('(' + match[1] + ')');

            var animeBms = data.bookmarks.filter(function(b) { return b.categoryId === 'cat_anime'; });
            animeBms.sort(function(a, b) { return a.order - b.order; });

            assert.strictEqual(animeBms[0].id, 'bm_everythingmoe');
            assert.strictEqual(animeBms[1].id, 'bm_fmhy_anime');
            assert.strictEqual(animeBms[1].title, 'FMHY: Anime');
            assert.strictEqual(animeBms[1].url, 'https://fmhy.net/video#anime-streaming');
        });
    });

    describe('FMHY link interception', function() {
        it('should intercept external links on fmhy.net pages', function() {
            var fmhyConfig = { prefix: '/proxy/', url: 'https://fmhy.net/video' };
            var fmhyLoc = {
                origin: 'http://localhost:8080',
                hostname: 'localhost',
                pathname: '/proxy/https://fmhy.net/video',
                search: '',
                hash: ''
            };

            var clickHandler = null;
            var modalCreated = false;
            var createdModalId = '';

            var mockWindow = {
                location: fmhyLoc,
                addEventListener: function(type, handler) {
                    if (type === 'click') clickHandler = handler;
                },
                document: {
                  readyState: 'complete',
                  documentElement: { addEventListener: function() {} },
                  getElementById: function() { return null; },
                  createElement: function(tag) {
                    var el = {
                      tagName: tag.toUpperCase(),
                      style: {},
                      appendChild: function(child) {
                        if (child && child.id) createdModalId = child.id;
                      },
                      remove: function() {}
                    };
                    if (tag === 'div') {
                      el.id = '';
                    }
                    return el;
                  },
                  body: {
                    appendChild: function(node) {
                      modalCreated = true;
                      if (node && node.id) createdModalId = node.id;
                    }
                  }
                },
                localStorage: { getItem: function() { return '{}'; } }
            };

            client.initForWindow(fmhyConfig, mockWindow);

            var externalAnchor = {
                tagName: 'A',
                getAttribute: function(name) {
                    if (name === 'href') return 'https://example-streaming.com/watch/123';
                    return null;
                },
                setAttribute: function() {}
            };

            var defaultPrevented = false;
            var event = {
                target: externalAnchor,
                preventDefault: function() { defaultPrevented = true; },
                stopPropagation: function() {}
            };

            assert.strictEqual(typeof clickHandler, 'function');
            clickHandler(event);

            assert.strictEqual(defaultPrevented, true);
            assert.strictEqual(modalCreated, true);
            assert.strictEqual(createdModalId, 'heavenly-fmhy-link-modal');
        });

        it('should NOT intercept internal fmhy.net links or search bar clicks', function() {
            var fmhyConfig = { prefix: '/proxy/', url: 'https://fmhy.net/video' };
            var fmhyLoc = {
                origin: 'http://localhost:8080',
                hostname: 'localhost',
                pathname: '/proxy/https://fmhy.net/video',
                search: '',
                hash: ''
            };

            var clickHandler = null;
            var modalCreated = false;

            var mockWindow = {
                location: fmhyLoc,
                addEventListener: function(type, handler) {
                    if (type === 'click') clickHandler = handler;
                },
                document: {
                  readyState: 'complete',
                  documentElement: { addEventListener: function() {} },
                  getElementById: function() { return null; },
                  createElement: function(tag) {
                    return { tagName: tag.toUpperCase(), style: {}, appendChild: function() {}, remove: function() {} };
                  },
                  body: {
                    appendChild: function() { modalCreated = true; }
                  }
                },
                localStorage: { getItem: function() { return '{}'; } }
            };

            client.initForWindow(fmhyConfig, mockWindow);

            // 1. Internal link test
            var internalAnchor = {
                tagName: 'A',
                getAttribute: function(name) {
                    if (name === 'href') return 'https://fmhy.net/gaming';
                    return null;
                },
                setAttribute: function() {}
            };
            var event1 = {
                target: internalAnchor,
                preventDefault: function() {},
                stopPropagation: function() {}
            };
            clickHandler(event1);
            assert.strictEqual(modalCreated, false);

            // 2. Search bar container click test with external URL
            var searchAnchor = {
                tagName: 'A',
                getAttribute: function(name) {
                    if (name === 'href') return 'https://external-search-result.com/';
                    return null;
                },
                setAttribute: function() {},
                closest: function(sel) {
                    if (sel.includes('.shell')) return true;
                    return null;
                }
            };
            var event2 = {
                target: searchAnchor,
                preventDefault: function() {},
                stopPropagation: function() {}
            };
            clickHandler(event2);
            assert.strictEqual(modalCreated, false);
        });
    });
});

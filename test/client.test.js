var assert = require('assert');
var unblockerClient = require('../custom-client/unblocker-client.js');

describe('unblocker-client.js fixUrl', function () {
    var fixUrl = unblockerClient.fixUrl;

    describe('Nullish and type handling', function () {
        it('returns null when urlStr is null', function () {
            var config = { prefix: '/proxy/', url: 'https://example.com/' };
            var loc = { pathname: '/proxy/https://example.com/', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost' };
            assert.strictEqual(fixUrl(null, config, loc), null);
        });

        it('returns undefined when urlStr is undefined', function () {
            var config = { prefix: '/proxy/', url: 'https://example.com/' };
            var loc = { pathname: '/proxy/https://example.com/', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost' };
            assert.strictEqual(fixUrl(undefined, config, loc), undefined);
        });

        it('coerces object values with toString()', function () {
            var config = { prefix: '/proxy/', url: 'https://example.com/' };
            var loc = { pathname: '/proxy/https://example.com/', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost' };
            var objUrl = { toString: function () { return 'https://example.com/page'; } };
            assert.strictEqual(fixUrl(objUrl, config, loc), '/proxy/https://example.com/page');
        });
    });

    describe('Early returns and fast-paths', function () {
        var config = { prefix: '/proxy/', url: 'https://example.com/' };
        var loc = { pathname: '/proxy/https://example.com/', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost' };

        it('returns already proxied root-relative URLs unmodified', function () {
            assert.strictEqual(fixUrl('/proxy/https://example.com/sub', config, loc), '/proxy/https://example.com/sub');
        });

        it('returns javascript: URIs unmodified', function () {
            assert.strictEqual(fixUrl('javascript:void(0)', config, loc), 'javascript:void(0)');
        });

        it('returns data: URIs unmodified', function () {
            assert.strictEqual(fixUrl('data:image/png;base64,iVBORw0KGgo...', config, loc), 'data:image/png;base64,iVBORw0KGgo...');
        });

        it('returns about: URIs unmodified', function () {
            assert.strictEqual(fixUrl('about:blank', config, loc), 'about:blank');
        });

        it('returns blob: URIs unmodified', function () {
            assert.strictEqual(fixUrl('blob:https://example.com/1234-5678', config, loc), 'blob:https://example.com/1234-5678');
        });

        it('returns mailto: URIs unmodified', function () {
            assert.strictEqual(fixUrl('mailto:user@example.com', config, loc), 'mailto:user@example.com');
        });

        it('returns tel: URIs unmodified', function () {
            assert.strictEqual(fixUrl('tel:+1234567890', config, loc), 'tel:+1234567890');
        });
    });

    describe('Relative URL resolution', function () {
        it('resolves relative path when location.pathname is proxied', function () {
            var config = { prefix: '/proxy/', url: 'https://example.com/dir/' };
            var loc = {
                pathname: '/proxy/https://example.com/dir/index.html',
                search: '?query=1',
                hash: '#section1',
                origin: 'http://localhost:8080',
                hostname: 'localhost'
            };
            assert.strictEqual(fixUrl('page2.html', config, loc), '/proxy/https://example.com/dir/page2.html');
        });

        it('falls back to config.url when location.pathname is not proxied', function () {
            var config = { prefix: '/proxy/', url: 'https://example.com/fallback/app.js' };
            var loc = {
                pathname: '/unproxied/path/index.html',
                search: '',
                hash: '',
                origin: 'http://localhost:8080',
                hostname: 'localhost'
            };
            assert.strictEqual(fixUrl('relative.css', config, loc), '/proxy/https://example.com/fallback/relative.css');
        });

        it('handles query and hash parameters in relative inputs', function () {
            var config = { prefix: '/proxy/', url: 'https://example.com/' };
            var loc = { pathname: '/proxy/https://example.com/app', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost' };
            assert.strictEqual(fixUrl('?test=true#top', config, loc), '/proxy/https://example.com/app?test=true#top');
        });
    });

    describe('Absolute and host matching handling', function () {
        it('returns already proxied absolute URLs unmodified', function () {
            var config = { prefix: '/proxy/', url: 'https://example.com/' };
            var loc = { pathname: '/proxy/https://example.com/', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost' };
            var proxiedAbs = 'http://localhost:8080/proxy/https://example.com/asset.js';
            assert.strictEqual(fixUrl(proxiedAbs, config, loc), proxiedAbs);
        });

        it('returns non-HTTP/HTTPS URLs unmodified (e.g. ftp)', function () {
            var config = { prefix: '/proxy/', url: 'https://example.com/' };
            var loc = { pathname: '/proxy/https://example.com/', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost' };
            assert.strictEqual(fixUrl('ftp://ftp.example.com/file.zip', config, loc), 'ftp://ftp.example.com/file.zip');
        });

        it('rewrites host and protocol when url.hostname matches location.hostname', function () {
            var config = { prefix: '/proxy/', url: 'https://target-site.com:8443/app/index.html' };
            var loc = {
                pathname: '/proxy/https://target-site.com:8443/app/index.html',
                search: '',
                hash: '',
                origin: 'http://localhost:8080',
                hostname: 'localhost'
            };
            // e.g. web application constructed URL using location.hostname
            var urlWithProxyHost = 'http://localhost:8080/api/endpoint';
            assert.strictEqual(fixUrl(urlWithProxyHost, config, loc), '/proxy/https://target-site.com:8443/api/endpoint');
        });

        it('correctly proxies standard absolute HTTP and HTTPS URLs', function () {
            var config = { prefix: '/proxy/', url: 'https://example.com/' };
            var loc = { pathname: '/proxy/https://example.com/', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost' };
            assert.strictEqual(fixUrl('http://otherdomain.com/index.php', config, loc), '/proxy/http://otherdomain.com/index.php');
            assert.strictEqual(fixUrl('https://heavenly-node.vercel.app/', config, loc), '/proxy/https://heavenly-node.vercel.app/');
        });
    });
});

describe('unblocker-client.js Heavenly Widgets', function () {
    it('scroll lock toggle button toggles active state and updates UI', function () {
        var mockListeners = {};
        var elementsById = {};
        var appendedElements = [];

        var createMockElement = function (tagName) {
            var elListeners = {};
            var classListSet = new Set();
            var children = [];
            var elementsById = {};

            var element = {
                tagName: (tagName || 'DIV').toUpperCase(),
                style: {},
                classList: {
                    add: function (cls) { classListSet.add(cls); },
                    remove: function (cls) { classListSet.delete(cls); },
                    contains: function (cls) { return classListSet.has(cls); }
                },
                _innerHTML: '',
                appendChild: function (child) {
                    children.push(child);
                    if (child.id) elementsById[child.id] = child;
                    return child;
                },
                querySelector: function (selector) {
                    if (selector.startsWith('#')) {
                        var targetId = selector.substring(1);
                        if (elementsById[targetId]) return elementsById[targetId];
                        for (var i = 0; i < children.length; i++) {
                            var found = children[i].querySelector(selector);
                            if (found) return found;
                        }
                        var newEl = createMockElement(selector.includes('btn') ? 'BUTTON' : 'DIV');
                        newEl.id = targetId;
                        elementsById[targetId] = newEl;
                        return newEl;
                    }
                    if (selector.startsWith('.')) {
                        return createMockElement('DIV');
                    }
                    return null;
                },
                querySelectorAll: function () { return []; },
                addEventListener: function (evt, fn) {
                    elListeners[evt] = fn;
                },
                dispatchEvent: function (evtName, e) {
                    if (elListeners[evtName]) elListeners[evtName](e || { stopPropagation: function () {} });
                },
                attachShadow: function () {
                    return this;
                },
                getBoundingClientRect: function () {
                    return { left: 0, top: 0, width: 100, height: 40 };
                }
            };

            Object.defineProperty(element, 'innerHTML', {
                get: function () { return this._innerHTML; },
                set: function (val) {
                    this._innerHTML = val;
                    // Simple parse IDs in innerHTML string for mock DOM querySelector
                    var matches = val.matchAll(/id=["']([^"']+)["']/g);
                    for (var match of matches) {
                        var id = match[1];
                        if (!elementsById[id]) {
                            var childEl = createMockElement(id.includes('btn') ? 'BUTTON' : 'DIV');
                            childEl.id = id;
                            elementsById[id] = childEl;
                        }
                    }
                }
            });

            return element;
        };

        var mockDocument = {
            readyState: 'complete',
            head: createMockElement('HEAD'),
            body: {
                appendChild: function (el) {
                    appendedElements.push(el);
                    if (el.id) elementsById[el.id] = el;
                    return el;
                }
            },
            documentElement: {
                clientWidth: 1024,
                clientHeight: 768,
                scrollWidth: 1024,
                scrollHeight: 768
            },
            createElement: function (tagName) {
                return createMockElement(tagName);
            },
            getElementById: function (id) {
                return elementsById[id] || null;
            },
            getElementsByTagName: function (tag) {
                if (tag === 'head') return [this.head];
                return [];
            },
            querySelectorAll: function () { return []; }
        };

        var mockWindow = {
            location: { pathname: '/proxy/https://example.com/', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost', protocol: 'http:', host: 'localhost:8080' },
            document: mockDocument,
            addEventListener: function (evt, fn) {
                mockListeners[evt] = fn;
            },
            localStorage: {
                getItem: function () { return JSON.stringify({ useWidgetDock: false }); },
                setItem: function () {}
            },
            innerWidth: 1024,
            innerHeight: 768
        };
        mockWindow.top = mockWindow;

        unblockerClient.initForWindow({ prefix: '/proxy/', url: 'https://example.com/' }, mockWindow);

        var lockRoot = mockDocument.getElementById('heavenly-scroll-lock-root');
        assert.ok(lockRoot, 'Scroll lock root element should be injected');

        var toggleBtn = lockRoot.querySelector('#toggle-btn');
        assert.ok(toggleBtn, 'Toggle button should exist');

        // Initial state before click
        assert.strictEqual(toggleBtn.classList.contains('active'), false);

        // First click: turn ON
        toggleBtn.dispatchEvent('click', { stopPropagation: function () {} });
        assert.strictEqual(toggleBtn.classList.contains('active'), true);
        assert.strictEqual(toggleBtn.innerHTML, '<span>🔒 ON</span>');

        // Second click: turn OFF
        toggleBtn.dispatchEvent('click', { stopPropagation: function () {} });
        assert.strictEqual(toggleBtn.classList.contains('active'), false);
        assert.strictEqual(toggleBtn.innerHTML, '<span>🔓 OFF</span>');
    });
});

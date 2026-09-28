var assert = require('assert');
var unblockerClient = require('../custom-client/unblocker-client.js');

describe('unblocker-client.js Home Button Navigation', function () {
    it('fixUrl keeps external home page URL intact', function () {
        var fixUrl = unblockerClient.fixUrl;
        var config = { prefix: '/proxy/', url: 'https://example.com/' };
        var loc = { pathname: '/proxy/https://example.com/', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost' };
        var res = fixUrl('https://heavenly-node.vercel.app/', config, loc);
        assert.strictEqual(res, '/proxy/https://heavenly-node.vercel.app/');
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
                getItem: function () { return null; },
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

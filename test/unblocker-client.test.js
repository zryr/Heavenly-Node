const assert = require('assert');
const { fixUrl, fixSrcset, initForWindow } = require('../custom-client/unblocker-client.js');

describe('unblocker-client.js DOM element rewriting & click interception', function () {
  const config = {
    prefix: '/proxy/',
    url: 'https://www.newgrounds.com/games/popular'
  };
  const location = {
    origin: 'http://localhost:8080',
    hostname: 'localhost',
    pathname: '/proxy/https://www.newgrounds.com/games/popular',
    search: '',
    hash: ''
  };

  describe('Location & URL un-proxying', function () {
    it('should un-proxy Location prototype properties and URL constructor', function () {
      function MockLocation() {}
      Object.defineProperty(MockLocation.prototype, 'pathname', { value: '/proxy/https://fmhy.net/storage', writable: true, configurable: true });
      Object.defineProperty(MockLocation.prototype, 'search', { value: '?q=test', writable: true, configurable: true });
      Object.defineProperty(MockLocation.prototype, 'hash', { value: '#section', writable: true, configurable: true });
      Object.defineProperty(MockLocation.prototype, 'origin', { value: 'http://localhost:8080', writable: true, configurable: true });

      const mockLoc = new MockLocation();
      const mockWindow = {
        Location: MockLocation,
        URL: global.URL,
        location: mockLoc,
        addEventListener: function () {},
        document: {
          readyState: 'complete',
          documentElement: { addEventListener: function () {} }
        },
        localStorage: { getItem: function () { return '{}'; } }
      };

      initForWindow(config, mockWindow);

      assert.strictEqual(mockLoc.pathname, '/storage');
      assert.strictEqual(mockLoc.search, '?q=test');
      assert.strictEqual(mockLoc.hash, '#section');
      assert.strictEqual(mockLoc.origin, 'https://fmhy.net');
      assert.strictEqual(mockLoc.href, 'https://fmhy.net/storage?q=test#section');

      const parsedUrl = new mockWindow.URL('/proxy/https://fmhy.net/gaming');
      assert.strictEqual(parsedUrl.pathname, '/gaming');
      assert.strictEqual(parsedUrl.origin, 'https://fmhy.net');
    });
  });

  describe('fixUrl & fixSrcset', function () {
    it('should correctly proxy relative and absolute URLs', function () {
      assert.strictEqual(
        fixUrl('https://picon.ngfiles.com/card.webp', config, location),
        '/proxy/https://picon.ngfiles.com/card.webp'
      );
      assert.strictEqual(
        fixUrl('/portal/view/1000', config, location),
        '/proxy/https://www.newgrounds.com/portal/view/1000'
      );
    });

    it('should leave unproxied bypass URLs unmodified in fixUrl and window.open', function () {
      const bypassObj = new String('https://cpsgames.org/');
      bypassObj.__unproxiedBypass = true;
      assert.strictEqual(fixUrl(bypassObj, config, location), 'https://cpsgames.org/');

      let openedUrl = '';
      const mockWindow = {
        location: location,
        open: function (url) {
          openedUrl = url;
        },
        addEventListener: function () {},
        document: {
          readyState: 'complete',
          documentElement: { addEventListener: function () {} }
        },
        localStorage: { getItem: function () { return '{}'; } }
      };

      initForWindow(config, mockWindow);
      mockWindow.open(bypassObj);
      assert.strictEqual(openedUrl, 'https://cpsgames.org/');
    });

    it('should correctly proxy srcset candidates', function () {
      const srcset = 'https://picon.ngfiles.com/a.webp 1x, https://picon.ngfiles.com/b.webp 2x';
      const fixed = fixSrcset(srcset, config, location);

      assert.strictEqual(fixed.includes('/proxy/https://picon.ngfiles.com/a.webp 1x'), true);
      assert.strictEqual(fixed.includes('/proxy/https://picon.ngfiles.com/b.webp 2x'), true);
    });
  });

  describe('XMLHttpRequest & Fetch proxying', function () {
    it('should wrap window.XMLHttpRequest while preserving prototype and static constants', function () {
      let openedUrl = '';
      function FakeXHR() {}
      FakeXHR.prototype.open = function (method, targetUrl) {
        openedUrl = targetUrl;
      };
      FakeXHR.DONE = 4;
      FakeXHR.UNSENT = 0;

      const mockWindow = {
        location: location,
        XMLHttpRequest: FakeXHR,
        addEventListener: function () {},
        document: {
          readyState: 'complete',
          documentElement: { addEventListener: function () {} }
        },
        localStorage: { getItem: function () { return '{}'; } }
      };

      initForWindow(config, mockWindow);

      assert.strictEqual(mockWindow.XMLHttpRequest.DONE, 4);
      assert.strictEqual(mockWindow.XMLHttpRequest.prototype, FakeXHR.prototype);

      const xhr = new mockWindow.XMLHttpRequest();
      xhr.open('GET', '/portal/games/load_more?page=2');
      assert.strictEqual(openedUrl, '/proxy/https://www.newgrounds.com/portal/games/load_more?page=2');

      // Test calling prototype open directly
      openedUrl = '';
      FakeXHR.prototype.open.call(xhr, 'GET', '/portal/games/load_more?page=3');
      assert.strictEqual(openedUrl, '/proxy/https://www.newgrounds.com/portal/games/load_more?page=3');
    });

    it('should proxy fetch calls accepting URL objects', function () {
      let fetchedUrl = '';
      const mockWindow = {
        location: location,
        fetch: function (resource) {
          fetchedUrl = resource;
          return Promise.resolve();
        },
        addEventListener: function () {},
        document: {
          readyState: 'complete',
          documentElement: { addEventListener: function () {} }
        },
        localStorage: { getItem: function () { return '{}'; } }
      };

      initForWindow(config, mockWindow);

      const targetUrlObj = new (require('url').URL)('https://www.newgrounds.com/games/load_more?page=4');
      mockWindow.fetch(targetUrlObj);
      assert.strictEqual(fetchedUrl, '/proxy/https://www.newgrounds.com/games/load_more?page=4');
    });
  });

  describe('DOM element prototype getter/setter & click interception', function () {
    it('should proxy href getter and setAttribute for anchors', function () {
      let capturedHref = '';
      let clickHandler = null;

      const mockWindow = {
        location: location,
        HTMLAnchorElement: {
          prototype: {
            getAttribute: function (name) {
              if (name === 'href') return capturedHref;
              return null;
            },
            setAttribute: function (name, val) {
              if (name === 'href') capturedHref = val;
            }
          }
        },
        Element: {
          prototype: {
            setAttribute: function (name, val) {
              if (name === 'href') capturedHref = val;
            }
          }
        },
        addEventListener: function (type, handler, capture) {
          if (type === 'click') clickHandler = handler;
        },
        document: {
          readyState: 'complete',
          documentElement: { addEventListener: function () {} }
        },
        localStorage: { getItem: function () { return '{}'; } }
      };

      Object.defineProperty(mockWindow.HTMLAnchorElement.prototype, 'href', {
        get: function () { return capturedHref; },
        set: function (val) { capturedHref = val; },
        configurable: true
      });

      initForWindow(config, mockWindow);

      // Set raw href via prototype setter
      mockWindow.HTMLAnchorElement.prototype.href = 'https://www.newgrounds.com/portal/view/2000';
      assert.strictEqual(capturedHref, '/proxy/https://www.newgrounds.com/portal/view/2000');

      // Test click event handler rewriting
      capturedHref = 'https://www.newgrounds.com/portal/view/3000'; // Unproxied
      const mockAnchor = {
        tagName: 'A',
        getAttribute: function (name) { return name === 'href' ? capturedHref : null; },
        setAttribute: function (name, val) { if (name === 'href') capturedHref = val; }
      };
      const mockEvent = { target: mockAnchor };

      assert.strictEqual(typeof clickHandler, 'function');
      clickHandler(mockEvent);

      assert.strictEqual(capturedHref, '/proxy/https://www.newgrounds.com/portal/view/3000');
    });
  });

  describe('Heavenly Browsing History', function () {
    it('should save history up to 20 items and filter out cloaked preset titles', function () {
      let savedData = '';
      const mockWindow = {
        location: {
          pathname: '/proxy/https://www.newgrounds.com/',
          search: '',
          hash: ''
        },
        document: {
          title: 'Google Classroom',
          readyState: 'complete',
          head: {
            appendChild: function () {}
          },
          getElementById: function () { return null; },
          getElementsByTagName: function () { return []; },
          querySelectorAll: function () { return []; },
          documentElement: { addEventListener: function () {} }
        },
        __heavenlyOriginalTitle: 'Newgrounds: Everything by Everyone',
        addEventListener: function () {},
        localStorage: {
          getItem: function (key) {
            if (key === 'heavenly_settings') {
              return JSON.stringify({ autoCloak: true, selectedPreset: 'classroom' });
            }
            return '[]';
          },
          setItem: function (key, val) {
            if (key === 'heavenly_history') savedData = val;
          }
        }
      };
      mockWindow.top = mockWindow;

      initForWindow(config, mockWindow);

      assert.ok(savedData, 'savedData should not be empty');
      const parsed = JSON.parse(savedData);
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].url, 'https://www.newgrounds.com/');
      assert.strictEqual(parsed[0].title, 'Newgrounds: Everything by Everyone');
    });
  });

  describe('Touch Panic Default & Default Bookmark Icons', function () {
    function createMockElement(id) {
      const children = [];
      const el = {
        id: id || '',
        tagName: 'DIV',
        style: {},
        classList: { add: function () {}, remove: function () {} },
        appendChild: function (c) { children.push(c); return c; },
        addEventListener: function () {},
        removeEventListener: function () {},
        querySelector: function (sel) {
          return createMockElement(sel);
        },
        querySelectorAll: function () { return []; },
        attachShadow: function () {
          return createMockElement('shadow');
        },
        getBoundingClientRect: function () {
          return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
        }
      };
      return el;
    }

    it('should default touchPanic based on touch device detection when undefined', function () {
      let touchPanicInjected = false;
      const touchWindow = {
        location: location,
        ontouchstart: true,
        navigator: { maxTouchPoints: 1 },
        addEventListener: function () {},
        removeEventListener: function () {},
        document: {
          readyState: 'complete',
          body: { appendChild: function () {}, querySelectorAll: function () { return []; } },
          getElementById: function (id) {
            if (id === 'heavenly-touch-panic-root' && touchPanicInjected) return {};
            return null;
          },
          getElementsByTagName: function () { return []; },
          querySelectorAll: function () { return []; },
          createElement: function (tag) {
            const el = createMockElement();
            const originalAttach = el.attachShadow;
            el.attachShadow = function () {
              if (el.id === 'heavenly-touch-panic-root') {
                touchPanicInjected = true;
              }
              return originalAttach();
            };
            return el;
          },
          documentElement: { addEventListener: function () {} }
        },
        localStorage: { getItem: function () { return '{}'; } }
      };
      touchWindow.top = touchWindow;

      initForWindow(config, touchWindow);
      assert.strictEqual(touchPanicInjected, true, 'Touch Panic overlay should inject on touch device');

      let nonTouchPanicInjected = false;
      const nonTouchWindow = {
        location: location,
        navigator: { maxTouchPoints: 0 },
        addEventListener: function () {},
        removeEventListener: function () {},
        document: {
          readyState: 'complete',
          body: { appendChild: function () {}, querySelectorAll: function () { return []; } },
          getElementById: function (id) {
            if (id === 'heavenly-touch-panic-root' && nonTouchPanicInjected) return {};
            return null;
          },
          getElementsByTagName: function () { return []; },
          querySelectorAll: function () { return []; },
          createElement: function (tag) {
            const el = createMockElement();
            const originalAttach = el.attachShadow;
            el.attachShadow = function () {
              if (el.id === 'heavenly-touch-panic-root') {
                nonTouchPanicInjected = true;
              }
              return originalAttach();
            };
            return el;
          },
          documentElement: { addEventListener: function () {} }
        },
        localStorage: { getItem: function () { return '{}'; } }
      };
      nonTouchWindow.top = nonTouchWindow;

      initForWindow(config, nonTouchWindow);
      assert.strictEqual(nonTouchPanicInjected, false, 'Touch Panic overlay should NOT inject on non-touch desktop device');
    });

    it('should have non-empty icons for all default built-in bookmarks and sub-bookmarks', function () {
      const fs = require('fs');
      const indexHtml = fs.readFileSync(require('path').join(__dirname, '../public/index.html'), 'utf8');

      const match = indexHtml.match(/var DEFAULT_BOOKMARK_DATA = (\{[\s\S]*?\n    \};)/);
      assert.ok(match, 'DEFAULT_BOOKMARK_DATA should be present in index.html');

      let jsonStr = match[1].replace(/;\s*$/, '');
      const data = eval('(' + jsonStr + ')');
      assert.ok(data.bookmarks && data.bookmarks.length > 0);

      data.bookmarks.forEach(function (bm) {
        assert.ok(bm.icon && bm.icon.trim() !== '', 'Bookmark ' + bm.title + ' (' + bm.id + ') should have non-empty icon');
        if (bm.subBookmarks && bm.subBookmarks.length > 0) {
          bm.subBookmarks.forEach(function (sb) {
            assert.ok(sb.icon && sb.icon.trim() !== '', 'Sub-bookmark ' + sb.title + ' (' + sb.id + ') should have non-empty icon');
          });
        }
      });
    });
  });
});

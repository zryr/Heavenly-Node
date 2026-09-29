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
});

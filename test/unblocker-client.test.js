const assert = require('assert');
const { fixUrl, rewriteHtmlUrls, initForWindow } = require('../custom-client/unblocker-client.js');

describe('unblocker-client.js HTML rewriting and dynamic content interception', function () {
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

  describe('rewriteHtmlUrls', function () {
    it('should rewrite src and href attributes in raw HTML string', function () {
      const html = '<div class="card"><a href="https://www.newgrounds.com/portal/view/1000"><img src="https://picon.ngfiles.com/card.webp" data-src="https://picon.ngfiles.com/card.webp" /></a></div>';
      const rewritten = rewriteHtmlUrls(html, config, location);

      assert.strictEqual(
        rewritten.includes('href="/proxy/https://www.newgrounds.com/portal/view/1000"'),
        true,
        'href should be proxied'
      );
      assert.strictEqual(
        rewritten.includes('src="/proxy/https://picon.ngfiles.com/card.webp"'),
        true,
        'src should be proxied'
      );
      assert.strictEqual(
        rewritten.includes('data-src="/proxy/https://picon.ngfiles.com/card.webp"'),
        true,
        'data-src should be proxied'
      );
    });

    it('should rewrite srcset and data-srcset attributes in raw HTML string', function () {
      const html = '<img srcset="https://picon.ngfiles.com/a.webp 1x, https://picon.ngfiles.com/b.webp 2x" />';
      const rewritten = rewriteHtmlUrls(html, config, location);

      assert.strictEqual(
        rewritten.includes('/proxy/https://picon.ngfiles.com/a.webp 1x'),
        true
      );
      assert.strictEqual(
        rewritten.includes('/proxy/https://picon.ngfiles.com/b.webp 2x'),
        true
      );
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

      // Define property descriptor for href
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

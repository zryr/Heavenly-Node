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

  describe('Draggable Touch Panic Overlay', function () {
    it('should inject panic overlay, handle mouse & touch dragging, clamp bounds, and persist position', function () {
      let savedPanicPos = null;

      const mockElement = function (tag) {
        this.tagName = tag.toUpperCase();
        this.style = {};
        this.children = [];
        this.elementListeners = {};
        this.querySelector = (sel) => {
          if (sel === '#p-btn') return this.btn || this;
          return this;
        };
        this.attachShadow = () => this;
        this.appendChild = (child) => this.children.push(child);
        this.getBoundingClientRect = () => ({ left: 20, top: 200, width: 100, height: 40 });
        this.offsetWidth = 100;
        this.offsetHeight = 40;
        this.classList = {
          add: () => {},
          remove: () => {},
          contains: () => false
        };
        this.addEventListener = (evt, fn) => {
          this.elementListeners[evt] = fn;
        };
      };

      const mockDoc = {
        readyState: 'complete',
        body: new mockElement('body'),
        createElement: (tag) => new mockElement(tag),
        getElementById: (id) => null,
        getElementsByTagName: () => [],
        querySelectorAll: () => [],
        documentElement: { addEventListener: function () {} }
      };

      const windowListeners = {};
      const mockWindow = {
        innerWidth: 800,
        innerHeight: 600,
        location: { href: 'http://localhost/proxy/https://example.com' },
        document: mockDoc,
        addEventListener: function (evt, fn, capture) {
          if (!windowListeners[evt]) windowListeners[evt] = [];
          windowListeners[evt].push(fn);
        },
        removeEventListener: function (evt, fn, capture) {
          if (windowListeners[evt]) {
            windowListeners[evt] = windowListeners[evt].filter(f => f !== fn);
          }
        },
        localStorage: {
          getItem: function (key) {
            if (key === 'heavenly_settings') {
              return JSON.stringify({ touchPanic: true, panicUrl: 'https://classroom.google.com' });
            }
            return null;
          },
          setItem: function (key, val) {
            if (key === 'heavenly_panic_pos') savedPanicPos = val;
          }
        }
      };
      mockWindow.top = mockWindow;

      initForWindow(config, mockWindow);

      const panicRoot = mockDoc.body.children.find(c => c.id === 'heavenly-touch-panic-root');
      assert.ok(panicRoot, 'Panic root element should be injected');

      // Simulate mousedown / drag on panicRoot
      assert.ok(panicRoot.elementListeners['mousedown'], 'mousedown listener should be registered');
      panicRoot.elementListeners['mousedown']({ clientX: 20, clientY: 200 });

      assert.ok(windowListeners['mousemove'] && windowListeners['mousemove'].length > 0, 'mousemove window listener should be active during drag');
      windowListeners['mousemove'].forEach(fn => fn({ clientX: 120, clientY: 300 }));

      assert.strictEqual(panicRoot.style.left, '120px');
      assert.strictEqual(panicRoot.style.top, '300px');

      // Test upper clamp bound
      windowListeners['mousemove'].forEach(fn => fn({ clientX: 1000, clientY: 1000 }));
      assert.strictEqual(panicRoot.style.left, '700px'); // 800 - 100
      assert.strictEqual(panicRoot.style.top, '560px'); // 600 - 40

      // End drag
      assert.ok(windowListeners['mouseup'] && windowListeners['mouseup'].length > 0, 'mouseup window listener should be registered');
      windowListeners['mouseup'].forEach(fn => fn());

      assert.ok(savedPanicPos, 'Position should be saved to localStorage');
      const parsedPos = JSON.parse(savedPanicPos);
      assert.strictEqual(typeof parsedPos.left, 'number');
      assert.strictEqual(typeof parsedPos.top, 'number');
    });
  });

  describe('about:blank Tab Cloaking & Launcher', function () {
    const { openInAboutBlankWindow } = require('../custom-client/unblocker-client.js');

    it('should export openInAboutBlankWindow function', function () {
      assert.strictEqual(typeof openInAboutBlankWindow, 'function');
    });

    it('should open about:blank window, write full-screen iframe and apply cloaking preset', function () {
      let writtenHtml = '';
      let isDocOpened = false;
      let isDocClosed = false;

      const mockTargetWin = {
        document: {
          open: function () { isDocOpened = true; },
          write: function (html) { writtenHtml += html; },
          close: function () { isDocClosed = true; }
        }
      };

      let openedUrl = '';
      let openedTarget = '';

      const mockWindow = {
        open: function (url, target) {
          openedUrl = url;
          openedTarget = target;
          return mockTargetWin;
        },
        localStorage: {
          getItem: function (key) {
            if (key === 'heavenly_settings') {
              return JSON.stringify({
                selectedPreset: 'drive',
                openInAboutBlank: true
              });
            }
            return null;
          }
        }
      };

      const proxiedUrl = 'http://localhost:8080/proxy/https://example.com';
      const resultWin = openInAboutBlankWindow(proxiedUrl, mockWindow);

      assert.strictEqual(resultWin, mockTargetWin);
      assert.strictEqual(openedUrl, 'about:blank');
      assert.strictEqual(openedTarget, '_blank');
      assert.strictEqual(isDocOpened, true);
      assert.strictEqual(isDocClosed, true);

      assert.ok(writtenHtml.includes('<title>My Drive - Google Drive</title>'), 'Should include selected preset title');
      assert.ok(writtenHtml.includes('https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png'), 'Should include selected preset icon');
      assert.ok(writtenHtml.includes('<iframe src="http://localhost:8080/proxy/https://example.com" allowfullscreen'), 'Should include full-screen iframe pointing to proxied URL');
      assert.ok(writtenHtml.includes('width:100vw;height:100vh;border:none'), 'Should style iframe as full-screen');
    });

    it('should handle popup blocker gracefully when window.open returns null', function () {
      let alertMsg = '';
      const mockWindow = {
        open: function () { return null; },
        alert: function (msg) { alertMsg = msg; },
        localStorage: { getItem: function () { return '{}'; } }
      };

      const result = openInAboutBlankWindow('http://localhost:8080/proxy/https://example.com', mockWindow);
      assert.strictEqual(result, null);
      assert.ok(alertMsg.includes('Popup blocked'), 'Should alert user that popup was blocked');
    });

    it('should render about:blank action button in dock bar and floating navigation widget', function () {
      const mockDoc = {
        readyState: 'complete',
        body: {
          appendChild: function (child) { this.children.push(child); },
          children: []
        },
        createElement: function (tag) {
          const el = {
            tagName: tag.toUpperCase(),
            style: {},
            children: [],
            attachShadow: function () { return this; },
            appendChild: function (child) { this.children.push(child); },
            querySelector: function () { return null; },
            querySelectorAll: function () { return []; },
            getBoundingClientRect: function () { return { left: 0, top: 0, width: 100, height: 100 }; },
            classList: { add: function () {}, remove: function () {} },
            addEventListener: function () {}
          };
          return el;
        },
        getElementById: function () { return null; },
        getElementsByTagName: function () { return []; },
        querySelectorAll: function () { return []; },
        documentElement: { addEventListener: function () {} }
      };

      const mockWindow = {
        innerWidth: 800,
        innerHeight: 600,
        location: { href: 'http://localhost:8080/proxy/https://example.com', pathname: '/proxy/https://example.com', search: '', hash: '' },
        document: mockDoc,
        addEventListener: function () {},
        localStorage: {
          getItem: function (key) {
            if (key === 'heavenly_settings') {
              return JSON.stringify({
                useWidgetDock: true,
                dockPosition: 'bottom',
                showNavSearch: true,
                showNavBookmark: true,
                showNavHome: true
              });
            }
            return null;
          }
        }
      };
      mockWindow.top = mockWindow;

      initForWindow(config, mockWindow);

      const dockRoot = mockDoc.body.children.find(c => c.id === 'heavenly-dock-root');
      assert.ok(dockRoot, 'Dock root element should be injected');
      assert.ok(dockRoot.children && dockRoot.children.length > 0);

      // Verify that dock inner HTML includes about:blank button
      const dockWrapper = dockRoot.children.find(c => c.className && c.className.includes('dock-wrapper'));
      assert.ok(dockWrapper);
      const dockBar = dockWrapper.children.find(c => c.className === 'dock-bar');
      assert.ok(dockBar);
      assert.ok(dockBar.innerHTML.includes('id="dock-blank-btn"'), 'Dock bar should include dock-blank-btn button');
      assert.ok(dockBar.innerHTML.includes('<span>about:blank</span>'), 'Dock bar should include about:blank label');
    });
  });
});

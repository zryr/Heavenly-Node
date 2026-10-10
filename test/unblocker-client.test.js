const assert = require('assert');
const { fixUrl, fixSrcset, initForWindow, isTopOrAboutBlankIframe, openAboutBlankLauncher } = require('../custom-client/unblocker-client.js');

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

  describe('Live Page Icon Picker Resiliency & SPA Handling', function () {
    it('should normalize URLs with trailing slashes and /proxy/ prefixes for pending icon picker matching', function () {
      let savedBookmarks = null;

      const mockElement = function (tag) {
        this.tagName = tag.toUpperCase();
        this.style = {};
        this.children = [];
        this.attachShadow = () => this;
        this.appendChild = (child) => this.children.push(child);
        this.querySelector = (sel) => {
          if (sel === '#live-icon-img') return { src: '', onerror: null };
          if (sel === '#live-icon-text') return { textContent: '' };
          if (sel === '#close-picker-btn') return { onclick: null };
          if (sel === '#save-direct-btn') return { onclick: null };
          if (sel === '#save-proxied-btn') return { onclick: null };
          return this;
        };
      };

      const mockDoc = {
        readyState: 'interactive',
        body: new mockElement('body'),
        createElement: (tag) => new mockElement(tag),
        getElementById: (id) => null,
        head: { querySelectorAll: () => [] }
      };

      const mockWindow = {
        location: {
          origin: 'http://localhost:8080',
          pathname: '/proxy/https://games-b3749.web.app/',
          search: '',
          hash: ''
        },
        document: mockDoc,
        addEventListener: function () {},
        localStorage: {
          getItem: function (key) {
            if (key === 'heavenly_settings') return JSON.stringify({ disableAllWidgets: false });
            if (key === 'heavenly_manual_icon_pending') {
              return JSON.stringify({
                bookmarkId: 'bm_sitesdotcom',
                targetUrl: 'https://games-b3749.web.app', // No trailing slash, no /proxy/
                timestamp: Date.now()
              });
            }
            if (key === 'heavenly_bookmarks') {
              return JSON.stringify({ bookmarks: [{ id: 'bm_sitesdotcom', icon: '' }] });
            }
            return null;
          },
          removeItem: function (key) {},
          setItem: function (key, val) {
            if (key === 'heavenly_bookmarks') savedBookmarks = val;
          }
        }
      };
      mockWindow.top = mockWindow;

      initForWindow(config, mockWindow);

      const pickerRoot = mockDoc.body.children.find(c => c.id === 'heavenly-manual-icon-root');
      assert.ok(pickerRoot, 'Icon picker overlay should mount despite trailing slash or proxy prefix differences');
    });

    it('should retry mounting overlay until document.body is available on heavy async SPAs', function (done) {
      let bodyCreated = false;
      const mockElement = function (tag) {
        this.tagName = tag.toUpperCase();
        this.style = {};
        this.children = [];
        this.attachShadow = () => this;
        this.appendChild = (child) => this.children.push(child);
        this.querySelector = (sel) => {
          const childEl = new mockElement('div');
          childEl.addEventListener = () => {};
          childEl.classList = { add: () => {}, remove: () => {}, contains: () => false };
          return childEl;
        };
        this.addEventListener = () => {};
        this.classList = { add: () => {}, remove: () => {}, contains: () => false };
      };

      const mockDoc = {
        readyState: 'loading',
        body: null, // Initially null to simulate delayed DOM body creation on heavy SPA
        createElement: (tag) => new mockElement(tag),
        getElementById: (id) => (bodyCreated && mockDoc.body ? mockDoc.body.children.find(c => c.id === id) : null),
        head: { querySelectorAll: () => [] },
        querySelectorAll: () => [],
        getElementsByTagName: () => [],
        addEventListener: function (evt, fn) {
          if (evt === 'DOMContentLoaded') {
            setTimeout(() => {
              if (!mockDoc.body) {
                mockDoc.body = new mockElement('body');
                bodyCreated = true;
              }
              fn();
            }, 30);
          }
        }
      };

      const mockWindow = {
        location: {
          pathname: '/proxy/https://games-b3749.web.app/',
          search: '',
          hash: ''
        },
        document: mockDoc,
        addEventListener: function () {},
        localStorage: {
          getItem: function (key) {
            if (key === 'heavenly_settings') return JSON.stringify({ disableAllWidgets: false });
            if (key === 'heavenly_manual_icon_pending') {
              return JSON.stringify({
                bookmarkId: 'bm_sitesdotcom',
                targetUrl: 'https://games-b3749.web.app/',
                timestamp: Date.now()
              });
            }
            return null;
          },
          removeItem: function (key) {}
        }
      };
      mockWindow.top = mockWindow;

      initForWindow(config, mockWindow);

      setTimeout(() => {
        assert.ok(mockDoc.body, 'Document body should be created');
        const pickerRoot = mockDoc.body ? mockDoc.body.children.find(c => c.id === 'heavenly-manual-icon-root') : null;
        assert.ok(pickerRoot, 'Icon picker overlay should retry and mount once body is ready');
        done();
      }, 150);
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

  describe('about:blank Tab Cloaking Launcher & Wrapper Support', function () {
    describe('isTopOrAboutBlankIframe', function () {
      it('should return true for a top window', function () {
        const topWin = {};
        topWin.top = topWin;
        assert.strictEqual(isTopOrAboutBlankIframe(topWin), true);
      });

      it('should return true for an iframe embedded in an about:blank parent', function () {
        const topWin = {
          location: { href: 'about:blank', protocol: 'about:' }
        };
        const childWin = {
          top: topWin,
          parent: topWin
        };
        assert.strictEqual(isTopOrAboutBlankIframe(childWin), true);
      });

      it('should return false for an iframe inside a regular page', function () {
        const topWin = {
          location: { href: 'https://example.com/some/page', protocol: 'https:' }
        };
        const childWin = {
          top: topWin,
          parent: topWin
        };
        assert.strictEqual(isTopOrAboutBlankIframe(childWin), false);
      });

      it('should return false safely when cross-origin access throws an error', function () {
        const childWin = {
          get top() {
            throw new Error('Blocked a frame with origin from accessing a cross-origin frame');
          }
        };
        assert.strictEqual(isTopOrAboutBlankIframe(childWin), false);
      });
    });

    describe('openAboutBlankLauncher', function () {
      it('should open about:blank window and write full-screen cloaked iframe markup', function () {
        let openedUrl = null;
        let openedTarget = null;
        let writtenHtml = '';
        let docOpened = false;
        let docClosed = false;

        const mockBlankDoc = {
          open: function () { docOpened = true; },
          write: function (html) { writtenHtml += html; },
          close: function () { docClosed = true; }
        };

        const mockBlankWin = {
          document: mockBlankDoc
        };

        const mockWin = {
          open: function (url, target) {
            openedUrl = url;
            openedTarget = target;
            return mockBlankWin;
          }
        };

        const result = openAboutBlankLauncher('https://example.com/target', 'Google Docs', 'https://example.com/icon.ico', mockWin);
        assert.strictEqual(result, mockBlankWin);
        assert.strictEqual(openedUrl, 'about:blank');
        assert.strictEqual(openedTarget, '_blank');
        assert.strictEqual(docOpened, true);
        assert.strictEqual(docClosed, true);
        assert.ok(writtenHtml.includes('<title>Google Docs</title>'));
        assert.ok(writtenHtml.includes('<link rel="icon" type="image/x-icon" href="https://example.com/icon.ico">'));
        assert.ok(writtenHtml.includes('width: 100vw; height: 100vh; border: none;'));
        assert.ok(writtenHtml.includes('src="https://example.com/target"'));
      });

      it('should alert user when popups are blocked (window.open returns null)', function () {
        let alertedMsg = null;
        const mockWin = {
          open: function () {
            return null;
          },
          alert: function (msg) {
            alertedMsg = msg;
          }
        };

        const result = openAboutBlankLauncher('https://example.com/target', 'Google Docs', 'https://example.com/icon.ico', mockWin);
        assert.strictEqual(result, null);
        assert.ok(alertedMsg && alertedMsg.includes('Popup blocked!'));
      });
    });

    describe('Launcher Buttons in Dock & Nav Bar', function () {
      it('should include #dock-blank-btn in dock mode and trigger launcher on click', function () {
        let openedBlank = false;
        let writtenDoc = '';

        const mockBlankDoc = {
          open: () => {},
          write: (h) => { writtenDoc += h; },
          close: () => {}
        };
        const mockBlankWin = { document: mockBlankDoc };

        const mockElement = function (tag) {
          this.tagName = tag.toUpperCase();
          this.style = {};
          this.children = [];
          this.elementListeners = {};
          this.classList = {
            add: () => {},
            remove: () => {},
            contains: () => false
          };
          this.appendChild = (c) => this.children.push(c);
          this.attachShadow = () => this;
          this.addEventListener = (evt, fn) => {
            this.elementListeners[evt] = fn;
          };
          let innerHtmlVal = '';
          Object.defineProperty(this, 'innerHTML', {
            get: () => innerHtmlVal,
            set: (val) => {
              innerHtmlVal = val;
              const matches = val.matchAll(/id="([^"]+)"/g);
              for (const m of matches) {
                const child = new mockElement('div');
                child.id = m[1];
                this.children.push(child);
              }
            }
          });
          this.querySelector = (sel) => {
            if (this.id && '#' + this.id === sel) return this;
            if (sel === '#p-btn') return this;
            for (let c of this.children) {
              if (c.id && '#' + c.id === sel) return c;
              if (c.querySelector) {
                const found = c.querySelector(sel);
                if (found) return found;
              }
            }
            return null;
          };
          this.querySelectorAll = () => [];
        };

        const mockDoc = {
          readyState: 'complete',
          body: new mockElement('body'),
          createElement: (tag) => new mockElement(tag),
          getElementById: (id) => {
            return mockDoc.body.querySelector ? mockDoc.body.querySelector('#' + id) : null;
          },
          querySelector: (sel) => {
            return mockDoc.body.querySelector ? mockDoc.body.querySelector(sel) : null;
          },
          getElementsByTagName: () => [],
          querySelectorAll: () => [],
          documentElement: { addEventListener: function () {} }
        };

        const mockWindow = {
          innerWidth: 800,
          innerHeight: 600,
          location: {
            origin: 'http://localhost:8080',
            pathname: '/proxy/https://en.wikipedia.org/wiki/Main_Page',
            search: '',
            hash: '',
            href: 'http://localhost:8080/proxy/https://en.wikipedia.org/wiki/Main_Page'
          },
          document: mockDoc,
          addEventListener: function () {},
          open: function (url, target) {
            if (url === 'about:blank') {
              openedBlank = true;
              return mockBlankWin;
            }
            return null;
          },
          localStorage: {
            getItem: function (key) {
              if (key === 'heavenly_settings') {
                return JSON.stringify({
                  useWidgetDock: true,
                  selectedPreset: 'docs'
                });
              }
              return null;
            }
          }
        };
        mockWindow.top = mockWindow;

        initForWindow(config, mockWindow);

        // Find dock root
        const dockRoot = mockDoc.body.children.find(c => c.id === 'heavenly-dock-root');
        assert.ok(dockRoot, 'Dock root should be injected');

        const dockBlankBtn = dockRoot.querySelector('#dock-blank-btn');
        assert.ok(dockBlankBtn, 'Dock should contain #dock-blank-btn');

        // Click the dock launcher button
        assert.ok(dockBlankBtn.elementListeners['click'], 'dock-blank-btn should have click listener');
        dockBlankBtn.elementListeners['click']({ stopPropagation: () => {} });

        assert.strictEqual(openedBlank, true, 'Clicking #dock-blank-btn should open about:blank window');
        assert.ok(writtenDoc.includes('width: 100vw; height: 100vh; border: none;'), 'Should write cloaked iframe');
        assert.ok(writtenDoc.includes('Google Docs'), 'Should use active preset title');
      });

      it('should include #nav-blank-btn in floating nav mode and trigger launcher on click', function () {
        let openedBlank = false;
        let writtenDoc = '';

        const mockBlankDoc = {
          open: () => {},
          write: (h) => { writtenDoc += h; },
          close: () => {}
        };
        const mockBlankWin = { document: mockBlankDoc };

        const mockElement = function (tag) {
          this.tagName = tag.toUpperCase();
          this.style = {};
          this.children = [];
          this.elementListeners = {};
          this.classList = {
            add: () => {},
            remove: () => {},
            contains: () => false
          };
          this.appendChild = (c) => this.children.push(c);
          this.attachShadow = () => this;
          this.addEventListener = (evt, fn) => {
            this.elementListeners[evt] = fn;
          };
          let innerHtmlVal = '';
          Object.defineProperty(this, 'innerHTML', {
            get: () => innerHtmlVal,
            set: (val) => {
              innerHtmlVal = val;
              const matches = val.matchAll(/id="([^"]+)"/g);
              for (const m of matches) {
                const child = new mockElement('div');
                child.id = m[1];
                this.children.push(child);
              }
            }
          });
          this.querySelector = (sel) => {
            if (this.id && '#' + this.id === sel) return this;
            if (sel === '#p-btn') return this;
            for (let c of this.children) {
              if (c.id && '#' + c.id === sel) return c;
              if (c.querySelector) {
                const found = c.querySelector(sel);
                if (found) return found;
              }
            }
            return null;
          };
          this.querySelectorAll = () => [];
        };

        const mockDoc = {
          readyState: 'complete',
          body: new mockElement('body'),
          createElement: (tag) => new mockElement(tag),
          getElementById: (id) => {
            return mockDoc.body.querySelector ? mockDoc.body.querySelector('#' + id) : null;
          },
          querySelector: (sel) => {
            return mockDoc.body.querySelector ? mockDoc.body.querySelector(sel) : null;
          },
          getElementsByTagName: () => [],
          querySelectorAll: () => [],
          documentElement: { addEventListener: function () {} }
        };

        const mockWindow = {
          innerWidth: 800,
          innerHeight: 600,
          location: {
            origin: 'http://localhost:8080',
            pathname: '/proxy/https://en.wikipedia.org/wiki/Main_Page',
            search: '',
            hash: '',
            href: 'http://localhost:8080/proxy/https://en.wikipedia.org/wiki/Main_Page'
          },
          document: mockDoc,
          addEventListener: function () {},
          open: function (url, target) {
            if (url === 'about:blank') {
              openedBlank = true;
              return mockBlankWin;
            }
            return null;
          },
          localStorage: {
            getItem: function (key) {
              if (key === 'heavenly_settings') {
                return JSON.stringify({
                  useWidgetDock: false,
                  selectedPreset: 'sheets'
                });
              }
              return null;
            }
          }
        };
        mockWindow.top = mockWindow;

        initForWindow(config, mockWindow);

        // Find nav root
        const navRoot = mockDoc.body.children.find(c => c.id === 'heavenly-nav-root');
        assert.ok(navRoot, 'Floating nav root should be injected');

        const navBlankBtn = navRoot.querySelector('#nav-blank-btn');
        assert.ok(navBlankBtn, 'Nav root should contain #nav-blank-btn');

        // Click nav launcher button
        assert.ok(navBlankBtn.elementListeners['click'], 'nav-blank-btn should have click listener');
        navBlankBtn.elementListeners['click']({ stopPropagation: () => {} });

        assert.strictEqual(openedBlank, true, 'Clicking #nav-blank-btn should open about:blank window');
        assert.ok(writtenDoc.includes('width: 100vw; height: 100vh; border: none;'), 'Should write cloaked iframe');
      });
    });

    describe('Widget support inside about:blank iframe wrapper', function () {
      it('should initialize Heavenly widgets when running inside an about:blank iframe wrapper', function () {
        const topWin = {
          location: { href: 'about:blank', protocol: 'about:' }
        };

        const mockElement = function (tag) {
          this.tagName = tag.toUpperCase();
          this.style = {};
          this.children = [];
          this.elementListeners = {};
          this.classList = {
            add: () => {},
            remove: () => {},
            contains: () => false
          };
          this.appendChild = (c) => this.children.push(c);
          this.attachShadow = () => this;
          this.addEventListener = (evt, fn) => {
            this.elementListeners[evt] = fn;
          };
          let innerHtmlVal = '';
          Object.defineProperty(this, 'innerHTML', {
            get: () => innerHtmlVal,
            set: (val) => {
              innerHtmlVal = val;
              const matches = val.matchAll(/id="([^"]+)"/g);
              for (const m of matches) {
                const child = new mockElement('div');
                child.id = m[1];
                this.children.push(child);
              }
            }
          });
          this.querySelector = (sel) => {
            if (this.id && '#' + this.id === sel) return this;
            if (sel === '#p-btn') return this;
            for (let c of this.children) {
              if (c.id && '#' + c.id === sel) return c;
              if (c.querySelector) {
                const found = c.querySelector(sel);
                if (found) return found;
              }
            }
            return null;
          };
          this.querySelectorAll = () => [];
        };

        const mockDoc = {
          readyState: 'complete',
          body: new mockElement('body'),
          createElement: (tag) => new mockElement(tag),
          getElementById: (id) => {
            return mockDoc.body.querySelector ? mockDoc.body.querySelector('#' + id) : null;
          },
          getElementsByTagName: () => [],
          querySelectorAll: () => [],
          documentElement: { addEventListener: function () {} }
        };

        const mockChildWindow = {
          innerWidth: 800,
          innerHeight: 600,
          location: {
            origin: 'http://localhost:8080',
            pathname: '/proxy/https://en.wikipedia.org/wiki/Main_Page',
            search: '',
            hash: '',
            href: 'http://localhost:8080/proxy/https://en.wikipedia.org/wiki/Main_Page'
          },
          document: mockDoc,
          addEventListener: function () {},
          localStorage: {
            getItem: function (key) {
              if (key === 'heavenly_settings') {
                return JSON.stringify({ useWidgetDock: true, touchPanic: true });
              }
              return null;
            }
          }
        };
        mockChildWindow.top = topWin;
        mockChildWindow.parent = topWin;

        initForWindow(config, mockChildWindow);

        // Check if widgets mounted despite win !== win.top
        const dockRoot = mockDoc.body.children.find(c => c.id === 'heavenly-dock-root');
        assert.ok(dockRoot, 'Dock widget should mount inside about:blank wrapper iframe');
        const panicRoot = mockDoc.body.children.find(c => c.id === 'heavenly-touch-panic-root');
        assert.ok(panicRoot, 'Panic button should mount inside about:blank wrapper iframe');
      });
    });
  });
});

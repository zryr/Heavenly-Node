const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Educational Decoy Landing Screen Overlay (Milestone 2)', function () {
  let html;

  before(function () {
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    html = fs.readFileSync(indexPath, 'utf8');
  });

  describe('Overlay Container (#academy-decoy-root)', function () {
    it('should have #academy-decoy-root in public/index.html markup', function () {
      assert.ok(html.includes('id="academy-decoy-root"'), '#academy-decoy-root should exist in index.html');
      assert.ok(html.includes('class="academy-decoy-screen"'), '.academy-decoy-screen should exist on decoy container');
    });

    it('should have exact required full-screen overlay CSS properties', function () {
      assert.ok(html.includes('position: fixed;'), 'Decoy must have position: fixed');
      assert.ok(html.includes('inset: 0;'), 'Decoy must have inset: 0');
      assert.ok(html.includes('width: 100vw;'), 'Decoy must have width: 100vw');
      assert.ok(html.includes('height: 100vh;'), 'Decoy must have height: 100vh');
      assert.ok(html.includes('z-index: 999999;'), 'Decoy must have z-index: 999999');
      assert.ok(html.includes('background: #ffffff;'), 'Decoy must have background: #ffffff');
      assert.ok(html.includes('color: #1e293b;'), 'Decoy must have color: #1e293b');
      assert.ok(html.includes('overflow-y: auto;'), 'Decoy must have overflow-y: auto');
    });

    it('should specify smooth fade-out transition: opacity 0.5s ease', function () {
      assert.ok(html.includes('transition: opacity 0.5s ease;'), 'Decoy must have transition: opacity 0.5s ease');
      assert.ok(html.includes('#academy-decoy-root.unlocked') || html.includes('.academy-decoy-screen.unlocked'), 'Must define .unlocked styles');
      assert.ok(html.includes('pointer-events: none;'), '.unlocked must disable pointer-events');
    });

    it('should not hide decoy abruptly while .unlocked transition is playing', function () {
      assert.ok(
        html.includes('html.decoy-bypassed #academy-decoy-root:not(.unlocked)'),
        'decoy-bypassed rule should exclude .unlocked to allow 0.5s fade-out to finish'
      );
    });
  });

  describe('Authentic Academic Styling', function () {
    it('should have clean navy (#0f2942) branding top bar and header', function () {
      assert.ok(html.includes('#0f2942'), 'Should use navy color #0f2942');
      assert.ok(html.includes('Atlanta Classical Academy'), 'Must brand as Atlanta Classical Academy');
      assert.ok(html.includes('decoy-crest'), 'Must include school crest icon');
      assert.ok(html.includes('Parent Portal'), 'Must include Parent Portal link');
      assert.ok(html.includes('Student Portal'), 'Must include Student Portal link');
    });

    it('should have academic hero section with high-contrast headline and CTAs', function () {
      assert.ok(html.includes('Forming Knowledgeable, Virtuous Citizens'), 'Must include mission headline');
      assert.ok(html.includes('decoy-hero'), 'Must include hero section');
      assert.ok(html.includes('Apply for 2026–2027'), 'Must include enrollment CTA');
    });

    it('should have curriculum grid with 3 cards showcasing academic programs with subtle drop shadows', function () {
      assert.ok(html.includes('Grammar Stage (Lower School)'), 'Card 1: Lower School');
      assert.ok(html.includes('Logic Stage (Middle School)'), 'Card 2: Middle School');
      assert.ok(html.includes('Rhetoric Stage (Upper School)'), 'Card 3: Upper School');
      assert.ok(html.includes('box-shadow: 0 4px 20px rgba(15, 41, 66, 0.07)'), 'Curriculum cards must have subtle drop shadows');
    });

    it('should have formal academic footer containing working Terms of Service bypass link', function () {
      assert.ok(html.includes('decoy-footer'), 'Must contain decoy-footer');
      assert.ok(html.includes('id="decoy-tos-link"'), 'Must have #decoy-tos-link ID');
      assert.ok(html.includes('Terms of Service'), 'Must contain Terms of Service link text');
    });
  });

  describe('Client Unlock & Storage Persistence Logic', function () {
    it('should check sessionStorage for heavenly_decoy_unlocked in head script to avoid flash', function () {
      assert.ok(
        html.includes("sessionStorage.getItem('heavenly_decoy_unlocked') === 'true'"),
        'Head script must check heavenly_decoy_unlocked'
      );
      assert.ok(html.includes('decoy-bypassed'), 'Must add decoy-bypassed class to documentElement');
    });

    it('should wire up #decoy-tos-link to unlockAcademyDecoy', function () {
      assert.ok(html.includes('unlockAcademyDecoy'), 'unlockAcademyDecoy function must exist');
      assert.ok(html.includes('initAcademyDecoy'), 'initAcademyDecoy function must exist');
      assert.ok(html.includes('#decoy-tos-link'), 'initAcademyDecoy must select #decoy-tos-link');
    });

    it('should set sessionStorage and wait 500ms before setting display none and decoy-bypassed', function () {
      const unlockFnMatch = html.match(/function unlockAcademyDecoy\(\)\s*\{([\s\S]*?)\n    \}/);
      assert.ok(unlockFnMatch, 'Should find unlockAcademyDecoy function body');
      const body = unlockFnMatch[1];
      assert.ok(body.includes("sessionStorage.setItem('heavenly_decoy_unlocked', 'true')"), 'Must persist unlock to sessionStorage');
      assert.ok(body.includes("decoy.classList.add('unlocked')"), 'Must add .unlocked class for opacity transition');
      assert.ok(body.includes('500'), 'Must wait 500ms for transition before hiding display');
      assert.ok(body.includes("decoy.style.display = 'none'"), 'Must hide decoy after transition completes');
    });

    it('should default to click-to-unlock and only run timer when decoyAutoTimer setting is explicitly true', function () {
      const initFnMatch = html.match(/function initAcademyDecoy\(\)\s*\{([\s\S]*?)\n    \}/);
      assert.ok(initFnMatch, 'Should find initAcademyDecoy function body');
      const body = initFnMatch[1];
      assert.ok(body.includes('decoyAutoTimer'), 'initAcademyDecoy must check decoyAutoTimer setting');
      assert.ok(html.includes('decoyAutoTimer: saved.decoyAutoTimer !== undefined ? Boolean(saved.decoyAutoTimer) : false'),
        'loadSettings must default decoyAutoTimer to false');
    });
  });

  describe('Runtime Decoy Behavioral Execution', function () {
    const vm = require('vm');

    function createMockEnv(storageData = {}, settingsData = {}) {
      const mockSessionStorage = {
        data: Object.assign({}, storageData),
        getItem: function (k) { return this.data[k] || null; },
        setItem: function (k, v) { this.data[k] = String(v); }
      };
      const mockLocalStorage = {
        data: Object.assign({}, settingsData),
        getItem: function (k) { return this.data[k] || null; },
        setItem: function (k, v) { this.data[k] = String(v); }
      };
      const mockDecoyEl = {
        id: 'academy-decoy-root',
        classList: {
          classes: new Set(),
          add: function (c) { this.classes.add(c); },
          contains: function (c) { return this.classes.has(c); }
        },
        style: { display: 'block' }
      };
      const mockDocEl = {
        classList: {
          classes: new Set(),
          add: function (c) { this.classes.add(c); },
          contains: function (c) { return this.classes.has(c); }
        }
      };
      const mockTosLink = {
        id: 'decoy-tos-link',
        onclick: null
      };
      const timeouts = [];
      const clearedTimeouts = [];

      const mock$ = function (id) {
        if (id === 'academy-decoy-root') return mockDecoyEl;
        return null;
      };

      const mockSetTimeout = function (fn, ms) {
        const id = timeouts.length + 1;
        timeouts.push({ id: id, fn: fn, ms: ms });
        return id;
      };

      const mockClearTimeout = function (id) {
        clearedTimeouts.push(id);
      };

      const ctx = {
        $: mock$,
        mockSessionStorage: mockSessionStorage,
        sessionStorage: mockSessionStorage,
        mockLocalStorage: mockLocalStorage,
        localStorage: mockLocalStorage,
        mockDecoyEl: mockDecoyEl,
        mockDocEl: mockDocEl,
        mockTosLink: mockTosLink,
        timeouts: timeouts,
        clearedTimeouts: clearedTimeouts,
        document: {
          documentElement: mockDocEl,
          querySelectorAll: function (sel) {
            if (sel.includes('#decoy-tos-link')) return [mockTosLink];
            return [];
          }
        },
        setTimeout: mockSetTimeout,
        clearTimeout: mockClearTimeout,
        hideLoadingScreen: function () {}
      };

      return ctx;
    }

    it('should not set auto-timer by default and stay locked until Terms of Service is clicked', function () {
      const ctx = createMockEnv({}, {});
      const scriptCode = `
        var decoyTimer = null;
        var DEFAULT_RANDOM_POOL = [];
        ${html.slice(html.indexOf('function unlockAcademyDecoy'), html.indexOf('// --- Milestone 3:'))}
        ${html.slice(html.indexOf('function loadSettings'), html.indexOf('// --- Landing Page Tab Cloaking'))}
      `;
      vm.createContext(ctx);
      vm.runInContext(scriptCode, ctx);
      ctx.initAcademyDecoy();

      assert.strictEqual(ctx.timeouts.length, 0, 'No auto-timer should be scheduled by default');
      assert.strictEqual(typeof ctx.mockTosLink.onclick, 'function', 'TOS click handler should be bound');
      assert.strictEqual(ctx.mockSessionStorage.getItem('heavenly_decoy_unlocked'), null, 'Should not be unlocked initially');

      // User scrolls down and clicks Terms of Service
      ctx.mockTosLink.onclick({ preventDefault: function () {} });
      assert.strictEqual(ctx.mockSessionStorage.getItem('heavenly_decoy_unlocked'), 'true', 'Clicking TOS must set sessionStorage heavenly_decoy_unlocked');
      assert.ok(ctx.mockDecoyEl.classList.contains('unlocked'), 'Must add .unlocked class on TOS click');
      assert.strictEqual(ctx.timeouts.length, 1, 'Should schedule 500ms fade-out cleanup timeout');
      assert.strictEqual(ctx.timeouts[0].ms, 500);

      // Advance 500ms cleanup
      ctx.timeouts[0].fn();
      assert.strictEqual(ctx.mockDecoyEl.style.display, 'none');
      assert.ok(ctx.mockDocEl.classList.contains('decoy-bypassed'));
    });

    it('should schedule ~2.6s auto-transition timer when decoyAutoTimer is explicitly true', function () {
      const ctx = createMockEnv({}, { heavenly_settings: JSON.stringify({ decoyAutoTimer: true }) });
      const scriptCode = `
        var decoyTimer = null;
        var DEFAULT_RANDOM_POOL = [];
        ${html.slice(html.indexOf('function unlockAcademyDecoy'), html.indexOf('// --- Milestone 3:'))}
        ${html.slice(html.indexOf('function loadSettings'), html.indexOf('// --- Landing Page Tab Cloaking'))}
      `;
      vm.createContext(ctx);
      vm.runInContext(scriptCode, ctx);
      ctx.initAcademyDecoy();

      assert.strictEqual(ctx.timeouts.length, 1, 'Auto-timer should be scheduled when decoyAutoTimer is true');
      assert.strictEqual(ctx.timeouts[0].ms, 2600, 'Timer delay should be 2600ms');

      // When the 2.6s timer fires
      ctx.timeouts[0].fn();
      assert.strictEqual(ctx.mockSessionStorage.getItem('heavenly_decoy_unlocked'), 'true', 'Auto-timer fire must unlock decoy');
      assert.ok(ctx.mockDecoyEl.classList.contains('unlocked'));
    });

    it('should bypass decoy immediately if sessionStorage heavenly_decoy_unlocked is already true', function () {
      const ctx = createMockEnv({ heavenly_decoy_unlocked: 'true' }, {});
      const scriptCode = `
        var decoyTimer = null;
        var DEFAULT_RANDOM_POOL = [];
        ${html.slice(html.indexOf('function unlockAcademyDecoy'), html.indexOf('// --- Milestone 3:'))}
        ${html.slice(html.indexOf('function loadSettings'), html.indexOf('// --- Landing Page Tab Cloaking'))}
      `;
      vm.createContext(ctx);
      vm.runInContext(scriptCode, ctx);
      ctx.initAcademyDecoy();

      assert.strictEqual(ctx.timeouts.length, 0, 'No timer should be scheduled when already unlocked');
      assert.strictEqual(ctx.mockDecoyEl.style.display, 'none', 'Decoy should be hidden immediately');
      assert.ok(ctx.mockDocEl.classList.contains('decoy-bypassed'), 'decoy-bypassed class should be added');
    });
    it('should not schedule timer when decoyAutoTimer is explicitly set to false', function () {
      const ctx = createMockEnv({}, { heavenly_settings: JSON.stringify({ decoyAutoTimer: false }) });
      const scriptCode = `
        var decoyTimer = null;
        var DEFAULT_RANDOM_POOL = [];
        ${html.slice(html.indexOf('function unlockAcademyDecoy'), html.indexOf('// --- Milestone 3:'))}
        ${html.slice(html.indexOf('function loadSettings'), html.indexOf('// --- Landing Page Tab Cloaking'))}
      `;
      vm.createContext(ctx);
      vm.runInContext(scriptCode, ctx);
      ctx.initAcademyDecoy();

      assert.strictEqual(ctx.timeouts.length, 0, 'No auto-timer should be scheduled when decoyAutoTimer is false');
      assert.strictEqual(ctx.mockSessionStorage.getItem('heavenly_decoy_unlocked'), null, 'Should remain locked');

      // Clicking TOS unlocks
      ctx.mockTosLink.onclick({ preventDefault: function () {} });
      assert.strictEqual(ctx.mockSessionStorage.getItem('heavenly_decoy_unlocked'), 'true', 'Clicking TOS unlocks');
    });

    it('should clear existing decoyTimer if auto-timer was scheduled and unlockAcademyDecoy is called early', function () {
      const ctx = createMockEnv({}, { heavenly_settings: JSON.stringify({ decoyAutoTimer: true }) });
      const scriptCode = `
        var decoyTimer = null;
        var DEFAULT_RANDOM_POOL = [];
        ${html.slice(html.indexOf('function unlockAcademyDecoy'), html.indexOf('// --- Milestone 3:'))}
        ${html.slice(html.indexOf('function loadSettings'), html.indexOf('// --- Landing Page Tab Cloaking'))}
      `;
      vm.createContext(ctx);
      vm.runInContext(scriptCode, ctx);
      ctx.initAcademyDecoy();

      assert.strictEqual(ctx.timeouts.length, 1, 'Auto-timer scheduled');
      assert.strictEqual(ctx.timeouts[0].ms, 2600);

      // User clicks TOS before the 2.6s timer fires
      ctx.mockTosLink.onclick({ preventDefault: function () {} });
      assert.ok(ctx.clearedTimeouts.includes(ctx.timeouts[0].id), 'Early TOS click must cancel the 2.6s countdown timer');
      assert.strictEqual(ctx.mockSessionStorage.getItem('heavenly_decoy_unlocked'), 'true');
    });
  });

  describe('Clean Homepage Center Container Layout', function () {
    it('should remove dead empty box #google-ad and adsbygoogle from public/index.html', function () {
      assert.ok(!html.includes('id="google-ad"'), 'Dead empty box #google-ad must be removed');
      assert.ok(!html.includes('adsbygoogle'), 'adsbygoogle must be removed');
    });

    it('should configure center container with id="center-container" and strictly hide empty boxes', function () {
      assert.ok(html.includes('id="center-container"'), 'Center container must have id="center-container"');
      assert.ok(html.includes('.history-dropdown:empty') && html.includes('#history-dropdown:empty'), 'history-dropdown must be strictly hidden when empty');
      assert.ok(html.includes('#error:empty'), '#error must be strictly hidden when empty');
    });
  });
});

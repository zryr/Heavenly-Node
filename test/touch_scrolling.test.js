const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const gestures = html.slice(html.indexOf('    var cancelBookmarkTouchGesture ='), html.indexOf('    function renderBookmarksUI()'));

function harness() {
  let now = 1000, nextTimer = 0;
  const timers = new Map();
  function target() {
    const listeners = new Map();
    return {
      closest: selector => selector === '.section-card' ? {} : null,
      addEventListener(type, fn, options = {}) {
        const capture = options === true || !!options.capture;
        const entries = listeners.get(type) || [];
        entries.push({ fn, capture, passive: !!options.passive });
        listeners.set(type, entries);
      },
      removeEventListener(type, fn) {
        listeners.set(type, (listeners.get(type) || []).filter(entry => entry.fn !== fn));
      },
      emit(type, event, capture = false) {
        for (const entry of [...(listeners.get(type) || [])]) {
          if (entry.capture !== capture) continue;
          event.passive = entry.passive;
          entry.fn(event);
          if (event.immediateStopped) break;
        }
      },
      count(type) { return (listeners.get(type) || []).filter(entry => !entry.capture).length; }
    };
  }
  const document = target(), window = target(), handle = target();
  const calls = { hold: 0, move: 0, drop: 0, cancel: 0, close: 0 };
  const context = {
    document, window, Date: { now: () => now },
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    closeReorderBar() { calls.close++; }
  };
  vm.createContext(context);
  vm.runInContext(gestures, context);
  context.bindBookmarkTouchHandle(handle, () => calls.hold++, () => calls.move++, () => calls.drop++, () => calls.cancel++);
  function event(type, extras = {}) {
    return {
      type, target: handle, cancelable: true, defaultPrevented: false,
      preventDefault() { if (!this.passive && this.cancelable) this.defaultPrevented = true; },
      stopPropagation() { this.stopped = true; },
      stopImmediatePropagation() { this.immediateStopped = this.stopped = true; },
      ...extras
    };
  }
  function touch(type, x = 20, y = 20, extras = {}) {
    const point = { identifier: 1, clientX: x, clientY: y };
    const ending = type === 'touchend' || type === 'touchcancel';
    const e = event(type, { touches: ending ? [] : [point], changedTouches: [point], ...extras });
    document.emit(type, e, true);
    handle.emit(type, e);
    if (!e.stopped) document.emit(type, e);
    return e;
  }
  function tick(ms) {
    now += ms;
    for (const [id, timer] of [...timers]) {
      if (timer.due <= now) { timers.delete(id); timer.fn(); }
    }
  }
  return { context, document, window, handle, calls, touch, tick, event, timers };
}

describe('Bookmark touch scrolling and deliberate handle dragging', function () {
  it('allows native vertical scrolling on cards and lists, reserving only the handle for dragging', function () {
    const cardRule = html.match(/\.bookmark-card \{([^}]+)\}/)[1];
    assert(cardRule.includes('touch-action: pan-y;'));
    assert(html.includes('.bottom-section-container {\n      touch-action: pan-y;'));
    assert.equal((html.match(/touch-action: none;/g) || []).length, 1);
    assert(html.match(/\.drag-dots-handle \{([^}]+)\}/)[1].includes('touch-action: none;'));
  });

  for (const [axis, x, y] of [['vertical', 20, 29], ['horizontal', 29, 20]]) {
    it('cancels a fast ' + axis + ' handle swipe before the hold without blocking its events', function () {
      const h = harness();
      assert.equal(h.touch('touchstart').defaultPrevented, false);
      h.tick(100);
      assert.equal(h.touch('touchmove', x, y).defaultPrevented, false);
      h.tick(600);
      assert.equal(h.calls.hold, 0);
      assert.equal(h.calls.move, 0);
      assert.equal(h.calls.cancel, 1);
      assert.equal(h.document.count('touchmove'), 0);
      h.touch('touchend', x, y);
      assert.equal(h.calls.drop, 0);
    });
  }

  it('tolerates 8px of movement during a hold, then keeps confirmed vertical dragging active', function () {
    const h = harness();
    h.touch('touchstart');
    assert.equal(h.touch('touchmove', 20, 28).defaultPrevented, false);
    h.tick(500);
    assert.equal(h.calls.hold, 1);
    assert.equal(h.touch('touchmove', 20, 45).defaultPrevented, true);
    assert.equal(h.touch('touchmove', 20, 21).defaultPrevented, true);
    assert.equal(h.calls.close, 1, 'Hide the action bar once so it cannot cover drop targets');
    assert.equal(h.calls.move, 2);
    assert.equal(h.touch('touchend', 20, 21).defaultPrevented, true);
    assert.equal(h.calls.drop, 1);
    assert.equal(h.document.count('touchmove'), 0);
    assert.equal(h.context.cancelBookmarkTouchGesture, null);
  });

  it('does not drag on a tap or a stationary long press', function () {
    for (const wait of [100, 500]) {
      const h = harness();
      h.touch('touchstart'); h.tick(wait);
      assert.equal(h.touch('touchend').defaultPrevented, false);
      assert.equal(h.calls.drop, 0);
      assert.equal(h.calls.move, 0);
      assert.equal(h.calls.hold, wait === 500 ? 1 : 0);
    }
  });

  for (const active of [false, true]) {
    it('cleans up a ' + (active ? 'confirmed drag' : 'pending hold') + ' on touchcancel without dropping', function () {
      const h = harness();
      h.touch('touchstart');
      if (active) { h.tick(500); h.touch('touchmove', 20, 50); }
      h.touch('touchcancel'); h.tick(600);
      assert.equal(h.calls.drop, 0);
      assert.equal(h.calls.cancel, 1);
      assert.equal(h.document.count('touchmove'), 0);
      assert.equal(h.timers.size, 0);
    });
  }

  it('cancels when another finger joins, including a finger outside the handle', function () {
    const h = harness();
    h.touch('touchstart');
    const e = h.event('touchstart', { touches: [{ identifier: 1 }, { identifier: 2 }] });
    h.document.emit('touchstart', e, true);
    h.tick(600);
    assert.equal(h.calls.hold, 0);
    assert.equal(h.calls.cancel, 1);
    assert.equal(h.document.count('touchmove'), 0);
  });

  it('ignores another contact ending instead of dropping the tracked finger', function () {
    const h = harness();
    h.touch('touchstart'); h.tick(500); h.touch('touchmove', 20, 50);
    h.touch('touchend', 20, 50, { changedTouches: [{ identifier: 2 }], touches: [{ identifier: 1 }] });
    assert.equal(h.calls.drop, 0);
    h.touch('touchend', 20, 50);
    assert.equal(h.calls.drop, 1);
  });

  it('cleans up on blur, hidden documents, and rerender interruption', function () {
    for (const interrupt of [
      h => h.window.emit('blur', h.event('blur')),
      h => { h.document.hidden = true; h.document.emit('visibilitychange', h.event('visibilitychange')); },
      h => h.context.cancelActiveBookmarkTouch()
    ]) {
      const h = harness();
      h.touch('touchstart'); interrupt(h); h.tick(600);
      assert.equal(h.calls.hold, 0);
      assert.equal(h.calls.cancel, 1);
      assert.equal(h.document.count('touchmove'), 0);
    }
  });

  it('suppresses compatibility clicks after a drop even if the original handle was replaced', function () {
    const h = harness();
    h.touch('touchstart'); h.tick(500); h.touch('touchmove', 20, 50); h.touch('touchend', 20, 50);
    const click = h.event('click', { detail: 1, target: { closest: () => null } });
    h.document.emit('click', click, true);
    assert(click.defaultPrevented && click.immediateStopped);
    h.touch('touchstart'); h.touch('touchend');
    const nextClick = h.event('click', { detail: 1 });
    h.document.emit('click', nextClick, true);
    assert.equal(nextClick.defaultPrevented, false);
  });

  it('keeps keyboard clicks and real mouse clicks usable after a touch drag', function () {
    const h = harness();
    h.touch('touchstart'); h.tick(500); h.touch('touchmove', 20, 50); h.touch('touchend', 20, 50);
    const keyboard = h.event('click', { detail: 0 });
    h.document.emit('click', keyboard, true);
    assert.equal(keyboard.defaultPrevented, false);
    h.document.emit('mousedown', h.event('mousedown', { sourceCapabilities: { firesTouchEvents: false } }), true);
    const mouse = h.event('click', { detail: 1 });
    h.document.emit('click', mouse, true);
    assert.equal(mouse.defaultPrevented, false);
    assert.equal(h.context.isBookmarkCompatibilityMouse({ sourceCapabilities: { firesTouchEvents: true } }), true);
  });

  it('suppresses a cancelled swipe click even when the finger remains down for more than 800ms', function () {
    const h = harness();
    h.touch('touchstart'); h.touch('touchmove', 20, 40); h.tick(1500); h.touch('touchend', 20, 40);
    const click = h.event('click', { detail: 1 });
    h.document.emit('click', click, true);
    assert(click.defaultPrevented);
    assert.equal(h.calls.hold, 0);
  });

  it('cancels touch state when switching to a real mouse without treating compatibility events as mouse input', function () {
    const h = harness();
    h.touch('touchstart');
    h.document.emit('mousedown', h.event('mousedown', { sourceCapabilities: { firesTouchEvents: true } }), true);
    assert.equal(h.calls.cancel, 0);
    h.document.emit('mousedown', h.event('mousedown', { sourceCapabilities: { firesTouchEvents: false } }), true);
    h.tick(600);
    assert.equal(h.calls.cancel, 1);
    assert.equal(h.calls.hold, 0);
    assert.equal(h.context.bookmarkTouchInProgress, false);
  });

  it('recognizes compatibility mouse input during a long touch when sourceCapabilities is unavailable', function () {
    const h = harness();
    h.touch('touchstart'); h.tick(1500);
    assert.equal(h.context.isBookmarkCompatibilityMouse({}), true);
    h.document.emit('mousedown', h.event('mousedown'), true);
    assert.equal(h.calls.cancel, 0);
    h.touch('touchcancel'); h.tick(801);
    assert.equal(h.context.isBookmarkCompatibilityMouse({}), false);
  });

  it('cancels card press timers and press states on movement without suppressing native scrolling', function () {
    const h = harness();
    let pressed = true, longPress = false;
    const timer = h.context.setTimeout(() => { longPress = true; }, 500);
    h.context.watchBookmarkCardPress(h.event('touchstart', { touches: [{ identifier: 1, clientX: 20, clientY: 20 }] }), () => {
      h.context.clearTimeout(timer); pressed = false;
    });
    assert.equal(h.touch('touchmove', 20, 29).defaultPrevented, false);
    h.tick(600);
    assert.equal(pressed, false);
    assert.equal(longPress, false);
    assert.equal(h.document.count('touchmove'), 0);
  });

  it('prevents native HTML5 touch drags from card bodies without changing mouse dragging', function () {
    const h = harness();
    h.touch('touchstart');
    const touchDrag = h.event('dragstart');
    h.document.emit('dragstart', touchDrag, true);
    assert(touchDrag.defaultPrevented && touchDrag.immediateStopped);
    // Some browsers cancel touch delivery before handing off to native HTML5 dragging.
    h.touch('touchcancel');
    const handedOffDrag = h.event('dragstart');
    h.document.emit('dragstart', handedOffDrag, true);
    assert(handedOffDrag.defaultPrevented);
    h.document.emit('mousedown', h.event('mousedown', { sourceCapabilities: { firesTouchEvents: false } }), true);
    const mouseDrag = h.event('dragstart');
    h.document.emit('dragstart', mouseDrag, true);
    assert.equal(mouseDrag.defaultPrevented, false);
  });

  it('keeps modal section handles on the touch path without starting a duplicate native drag', function () {
    const h = harness();
    const rowTarget = { closest: selector => selector === '.section-order-row' ? {} : null };
    h.touch('touchstart', 20, 20, { target: rowTarget });
    assert.equal(h.context.bookmarkTouchInProgress, true);
    h.tick(600);
    const nativeDrag = h.event('dragstart', { target: rowTarget });
    h.document.emit('dragstart', nativeDrag, true);
    assert(nativeDrag.defaultPrevented && nativeDrag.immediateStopped);
    assert.equal(h.calls.hold, 1);
    h.touch('touchcancel');
    assert.equal(h.calls.cancel, 1);
  });
});

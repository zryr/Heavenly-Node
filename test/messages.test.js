'use strict';
const assert = require('assert');
const M = require('../public/assets/heavenly-messages');
const published = require('../public/assets/heavenly-messages-data');
const copy = M.clone;

function fakeClock() {
  let time = 0, sequence = 0;
  const jobs = new Map();
  return {
    now:() => time,
    setTimeout:(callback,delay) => { const id = ++sequence; jobs.set(id,{callback,at:time+delay}); return id; },
    clearTimeout:id => jobs.delete(id),
    advance:duration => {
      const target = time+duration;
      for (;;) {
        const pending = [...jobs.entries()].sort((a,b) => a[1].at-b[1].at)[0];
        if (!pending || pending[1].at > target) break;
        time = pending[1].at; jobs.delete(pending[0]); pending[1].callback();
      }
      time = target;
    },
    count:() => jobs.size
  };
}
function engine(extra) {
  const clock = fakeClock();
  const controller = M.createController(Object.assign({data:published,random:M.createSeededRandom('meaningful-message-tests')},clock,extra));
  return {clock,controller};
}

describe('Heavenly structured messages', function () {
  it('validates the reviewed data without mutating source, including all four exact Spotify destinations', function () {
    const before = JSON.stringify(published);
    assert.strictEqual(M.validateData(published),true);
    assert.strictEqual(JSON.stringify(published),before);
    assert.deepStrictEqual(Object.values(M.playlists).map(item => item.url),[
      'https://open.spotify.com/playlist/5h7adrSdyEOPJJN0PljioK',
      'https://open.spotify.com/playlist/0tsLDxUYDVIhHYPeqdP015',
      'https://open.spotify.com/playlist/6asU2SoBz4duQ0rZaV20wI',
      'https://open.spotify.com/playlist/5lDrWA2Ty2YTemqQ4OEMUj'
    ]);
  });
  it('rejects executable fields, unsafe destinations, uncontrolled styling, and unknown actions', function () {
    for (const url of ['javascript:alert(1)','data:text/html,test','http://example.com','https://u:p@example.com','//example.com','/admin','https://example.com/\\evil']) {
      const data = copy(published); data.items[0].segments = [{text:'Unsafe',link:url}];
      assert.throws(() => M.validateData(data),/Links/);
    }
    for (const [field,value] of [['html','<b>Unsafe</b>'],['style','position:fixed'],['onclick','alert(1)']]) {
      const data = copy(published); data.items[0].segments[0][field] = value;
      assert.throws(() => M.validateData(data),/Unexpected segment/);
    }
    let data = copy(published); data.items[0].theme = 'arbitrary class'; assert.throws(() => M.validateData(data),/theme/);
    data = copy(published); data.items.find(item => item.action).action = {type:'script',code:'alert(1)'};
    assert.throws(() => M.validateData(data),/action/);
    data = copy(published); data.items.find(item => item.action?.type === 'scene').action.steps[0].asset = 'https://tracking.test/image.png';
    assert.throws(() => M.validateData(data),/asset/);
  });
  it('bounds complete datasets, text, IDs, weights, segments, and dialogue steps', function () {
    const modifications = [
      data => { data.schema = 2; },
      data => { data.items[1].id = data.items[0].id; },
      data => { data.items[0].weight = Infinity; },
      data => { data.items[0].weight = 0; },
      data => { data.items[0].segments = [{text:'a'.repeat(321)}]; },
      data => { data.items[0].segments = [{text:'a'.repeat(200)},{text:'b'.repeat(121)}]; },
      data => { data.items[0].reducedMotionText = ''; },
      data => { data.items[0].segments = Array(13).fill({text:'a'}); },
      data => { data.items.find(item => item.action?.type === 'scene').action.steps = []; },
      data => { data.items.forEach(item => { if (item.kind === 'ordinary') item.enabled = false; }); }
    ];
    modifications.forEach(change => { const data = copy(published); change(data); assert.throws(() => M.validateData(data)); });
  });
  it('keeps inline links out of action buttons and requires focusable tooltip anchors', function () {
    let data = copy(published); data.items.find(item => item.action).segments[0].link = '/settings.html';
    assert.throws(() => M.validateData(data),/nested links/);
    data = copy(published); data.items[0].segments[0].tooltip = 'No focus target';
    assert.throws(() => M.validateData(data),/focusable/);
    data = copy(published); data.items[0].segments = [{text:'<img src=x onerror=alert(1)>'}];
    assert(M.validateData(data),'Literal HTML characters are valid text, never executable markup.');
  });
  it('starts with ordinary copy and keeps one 12–15 second timer regardless of elapsed invisible time', function () {
    const {clock,controller} = engine();
    assert.strictEqual(controller.getState().kind,'ordinary');
    assert(controller.getState().remaining >= 12000 && controller.getState().remaining <= 15000);
    const initial = controller.getState(); clock.advance(4000); controller.setPaused('offscreen',true);
    const remaining = controller.getState().remaining; assert.strictEqual(remaining,initial.remaining-4000);
    assert.strictEqual(clock.count(),0); clock.advance(900000);
    assert.strictEqual(controller.getState().id,initial.id);
    controller.setPaused('offscreen',false); assert.strictEqual(clock.count(),1);
    assert.strictEqual(controller.getState().id,initial.id,'Resume must keep the current activation target.');
    clock.advance(remaining-1); assert.strictEqual(controller.getState().changes,1);
    clock.advance(1); assert.strictEqual(controller.getState().changes,2);
    controller.destroy(); assert.strictEqual(clock.count(),0);
  });
  it('composes hover, focus, hidden, dialog and explicit pause reasons without a premature resume', function () {
    const {clock,controller} = engine(); const original = controller.getState().id;
    ['hover','focus','hidden','dialog'].forEach(reason => controller.setPaused(reason,true)); controller.pause();
    ['hover','hidden','dialog'].forEach(reason => controller.setPaused(reason,false));
    controller.resume(); assert(controller.getState().paused); assert.deepStrictEqual(controller.getState().reasons,['focus']); assert.strictEqual(clock.count(),0);
    clock.advance(60000); assert.strictEqual(controller.getState().id,original);
    controller.setPaused('focus',false); assert.strictEqual(clock.count(),1); assert.strictEqual(controller.getState().id,original);
    controller.destroy();
  });
  it('never automatically opens a special experience or selects specials consecutively', function () {
    const changes = [], {controller} = engine({onChange:item => changes.push(item)});
    for (let i = 0; i < 10000; i++) controller.next();
    assert.strictEqual(changes[0].kind,'ordinary');
    let eligible = 0, specials = 0;
    changes.slice(1).forEach((item,index) => { if (changes[index].kind !== 'special') eligible++; if (item.kind === 'special') { specials++; assert.notStrictEqual(changes[index].kind,'special'); } });
    assert(specials/eligible > .105 && specials/eligible < .135,'Special chance stays near 12% on eligible slots.');
    assert(changes.every(item => !Object.hasOwn(item,'opened')));
    controller.destroy();
  });
  it('gives enabled equal-weight copy fair turns and never repeats immediately when another ordinary entry is eligible', function () {
    const data = copy(published); data.items = data.items.filter(item => item.kind === 'ordinary').slice(0,4);
    const {controller} = engine({data}); let last = controller.getState().id;
    for (let i = 0; i < 399; i++) { controller.next(); const id = controller.getState().id; assert.notStrictEqual(id,last); last = id; }
    const values = Object.values(controller.getState().counts); assert(Math.max(...values)-Math.min(...values) <= 1);
    controller.destroy();
  });
  it('honors disabled and session-dismissed eligibility without changing ordinary data', function () {
    const data = copy(published); data.items[0].enabled = false;
    const {controller} = engine({data,isEligible:item => item.kind === 'ordinary'});
    for (let i = 0; i < 100; i++) { assert.strictEqual(controller.getState().kind,'ordinary'); assert.notStrictEqual(controller.getState().id,data.items[0].id); controller.next(); }
    assert.strictEqual(published.items[0].enabled,true); controller.destroy();
  });
  it('applies author weights while still giving every eligible ordinary message a turn', function () {
    const data = copy(published); data.items = data.items.filter(item => item.kind === 'ordinary').slice(0,3); data.items[0].weight = 2;
    const {controller} = engine({data});
    for (let i = 0; i < 399; i++) controller.next();
    const counts = controller.getState().counts;
    assert(Math.abs(counts[data.items[0].id]-200) <= 1);
    assert(Math.abs(counts[data.items[1].id]-100) <= 1);
    assert(Math.abs(counts[data.items[2].id]-100) <= 1);
    controller.destroy();
  });
  it('keeps manual Next usable while paused and destroys the scheduler idempotently', function () {
    const {clock,controller} = engine(); controller.pause(); const initial = controller.getState().id;
    controller.next(); assert.notStrictEqual(controller.getState().id,initial); assert(controller.getState().paused); assert.strictEqual(clock.count(),0);
    controller.destroy(); controller.destroy(); controller.next(); clock.advance(60000); assert.strictEqual(clock.count(),0); assert(controller.getState().destroyed);
  });
  it('reproduces selection with injected seeded randomness and clock rather than wall-time waits', function () {
    const a = engine(), b = engine();
    for (let i = 0; i < 200; i++) { assert.deepStrictEqual(a.controller.getState(),b.controller.getState()); a.controller.next(); b.controller.next(); }
    a.controller.destroy(); b.controller.destroy();
  });
});

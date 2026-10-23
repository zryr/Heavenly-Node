'use strict';
// Exercise rendered controls and sample actual WAAPI frames, including first use.
const assert = require('node:assert/strict');
const playwright = require('playwright');
const app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || 'chromium';
let browser, server, checks = 0;
const pass = text => { checks++; console.log('PASS ' + text); };
(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? {executablePath:'/usr/bin/chromium',args:['--no-sandbox']} : {});
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(() => sessionStorage.setItem('heavenly_decoy_unlocked','true'));
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin, {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => document.querySelector('#heavenly-loading-screen').style.display === 'none');
  await page.evaluate(() => {
    const data = loadBookmarkData(); data.categories.forEach(category => category.hidden = true);
    data.categories.push({id:'motion',title:'Motion fixture',side:'left',subSections:[{id:'user',title:'Saved'}]});
    data.bookmarks.push({id:'motion_folder',title:'Motion folder',type:'folder',categoryId:'motion',subSectionId:'user',order:0,
      subBookmarks:[{id:'motion_child',title:'Folder child',url:'https://motion.test/child'}]});
    saveBookmarkData(data); expandedSubSections.motion_user = true; renderBookmarksUI();
  });
  const folder = page.locator('[data-bm-id="motion_folder"]');
  await folder.getByRole('button',{name:'Expand folder Motion folder'}).click();
  const first = await folder.locator('..').evaluate(wrapper => {
    const content = wrapper.lastElementChild;
    const animation = content.getAnimations()[0];
    if (!animation) return null;
    animation.pause(); return animation.effect.getKeyframes().map(frame => parseFloat(frame.height));
  });
  assert(first && first[0] === 0 && first[1] > 0, 'First folder opening must animate from zero to the measured content height: ' + JSON.stringify(first));
  await page.evaluate(() => document.getAnimations().forEach(animation => {if(animation.playState === 'paused')animation.play();}));
  const children = folder.locator('..').locator('.bookmark-folder-children');
  await page.waitForFunction(() => !document.querySelector('.bookmark-folder-children').__accordionAnimation);
  const toggle = folder.locator('button[aria-expanded]');
  for(let i=0;i<5;i++)await toggle.click({delay:5});
  await page.waitForFunction(() => !document.querySelector('.bookmark-folder-children').__accordionAnimation);
  assert(await children.evaluate(node => node.hidden && node.inert && getComputedStyle(node).display === 'none'));
  await toggle.click();
  await page.waitForFunction(() => !document.querySelector('.bookmark-folder-children').__accordionAnimation);
  assert(await children.evaluate(node => !node.hidden && !node.inert && node.getBoundingClientRect().height > 0));
  pass('first folder opening has nonzero height motion; rapid reversal settles into the last requested visibility');

  await page.evaluate(() => {
    const bookmark = loadBookmarkData().bookmarks.find(bookmark => bookmark.id === 'bm_aether');
    openBuiltinTestModal(bookmark.title,bookmark.url,'',null,false,bookmark.id);
  });
  const modal = page.locator('#builtin-test-modal');
  await page.waitForTimeout(40);
  const reversal = await modal.evaluate(node => {
    const card = node.querySelector('.modal-card');
    const opening = Number(getComputedStyle(card).opacity);
    HeavenlyDialogs.close(node);
    const closing = card.getAnimations()[0];
    closing.pause();
    const start = Number(closing.effect.getKeyframes()[0].opacity);
    HeavenlyDialogs.open(node);
    return {opening,start};
  });
  assert(Math.abs(reversal.opening-reversal.start) < .06, 'Reversing a dialog must begin at its rendered opacity: ' + JSON.stringify(reversal));
  await page.waitForTimeout(250);
  assert(await modal.evaluate(node => node.classList.contains('active') && !node.classList.contains('modal-closing') && !node.inert));
  pass('dialog reversal starts at the current rendered frame and rejects stale close completions');

  const available = modal.locator('.available-mirror-list'), summary = available.locator(':scope > summary');
  await summary.click(); await summary.click(); await summary.click();
  await page.waitForFunction(() => !document.querySelector('.available-mirror-list .mirror-disclosure-body').__accordionAnimation);
  assert(await available.evaluate(node => node.open && node.dataset.expanded === 'true'));
  const removed = await page.evaluate(() => {
    const node = document.querySelector('.available-mirror-list .mirror-disclosure-body');
    HeavenlyMotion.height(node,false); window.__removedMotionNode = node; node.remove();
    return !!node.__accordionAnimation;
  });
  assert(removed);
  await page.waitForFunction(() => !window.__removedMotionNode.__accordionAnimation);
  assert.equal(await page.evaluate(() => window.__removedMotionNode.getAnimations().length),0);
  pass('rapid mirror disclosure reversal preserves logical state; removed animation targets release ownership');

  await page.evaluate(() => {
    const bookmark = loadBookmarkData().bookmarks.find(bookmark => bookmark.id === 'bm_aether');
    openBuiltinTestModal(bookmark.title,bookmark.url,'',null,false,bookmark.id);
  });
  await modal.locator('.mirror-mark-broken').click();
  await modal.locator('.mirror-confirm-broken').click();
  const broken = modal.locator('.broken-mirrors'), brokenSummary = broken.locator(':scope > summary');
  await brokenSummary.click();
  assert(await broken.locator('.mirror-disclosure-body').evaluate(node => node.getAnimations().length > 0));
  await brokenSummary.click(); await brokenSummary.click(); await brokenSummary.click();
  await page.waitForFunction(() => !document.querySelector('.broken-mirrors .mirror-disclosure-body').__accordionAnimation);
  assert(await broken.evaluate(node => node.open && node.dataset.expanded === 'true'));
  const availableSummary = available.locator(':scope > summary');
  if(await availableSummary.getAttribute('aria-expanded') !== 'true')await availableSummary.click();
  const add = modal.locator('.mirror-add-form'), addSummary = add.locator(':scope > summary');
  await addSummary.click();
  assert(await add.locator('.mirror-add-body').evaluate(node => {
    const frames = node.getAnimations()[0]?.effect.getKeyframes();
    return frames && parseFloat(frames[0].height) === 0 && parseFloat(frames[1].height) > 0;
  }));
  await add.locator('input').first().fill('Unsaved mirror name');
  await addSummary.click(); await addSummary.click();
  await page.waitForFunction(() => !document.querySelector('.mirror-add-body').__accordionAnimation);
  assert.equal(await add.locator('input').first().inputValue(),'Unsaved mirror name');
  pass('Broken and Add Custom Mirror panels animate on real clicks, reverse safely and retain unsaved form text');

  await page.emulateMedia({reducedMotion:'reduce'});
  await modal.evaluate(node => {HeavenlyDialogs.close(node);HeavenlyDialogs.open(node);});
  assert.equal(await modal.locator('.modal-card').evaluate(node => node.getAnimations().length),0);
  await page.evaluate(() => {
    const node = document.createElement('div'); node.textContent='Reduced motion fixture'; document.body.appendChild(node);
    HeavenlyMotion.height(node,false); window.__reducedMotionNode=node;
  });
  assert(await page.evaluate(() => window.__reducedMotionNode.hidden && !window.__reducedMotionNode.__accordionAnimation));
  pass('reduced motion completes immediately without stale disclosure or dialog ownership');
  assert.deepEqual(errors,[]);
  console.log(checks + ' animation reliability groups passed in ' + engine + ' (browser emulation, no physical device)');
})().catch(error => {console.error(error);process.exitCode=1;}).finally(async () => {
  await browser?.close();
  if(server){server.closeAllConnections?.();await new Promise(resolve => server.close(resolve));}
});

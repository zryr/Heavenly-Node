'use strict';
const assert = require('node:assert/strict'), playwright = require('playwright'), app = require('../../app');
const engine = process.env.HEAVENLY_BROWSER || process.env.BROWSER || 'chromium';
let server, browser, checks = 0;
function pass(message) { checks++; console.log('PASS ' + message); }
(async function () {
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await playwright[engine].launch(engine === 'chromium' ? { executablePath:'/usr/bin/chromium', args:['--no-sandbox'] } : {});
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 } });
  await context.addInitScript(() => sessionStorage.setItem('heavenly_decoy_unlocked', 'true'));
  await context.route('**/*', route => route.request().url().startsWith(origin) && !route.request().url().includes('/proxy/') ? route.continue() : route.abort());
  const page = await context.newPage(); page.setDefaultTimeout(7000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin, { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => typeof renderBookmarksUI === 'function' && bookmarkSearchController);
  await page.evaluate(() => {
    const data = loadBookmarkData(); data.categories.forEach(category => category.hidden = true);
    for (const side of ['left', 'right', 'bottom']) {
      data.categories.push({ id:'view_' + side, title:'Observatory ' + side, side, subSections:[{ id:'saved', title:'Research' }] });
      for (let i = 0; i < 9; i++) data.bookmarks.push({ id:side + '_' + i, categoryId:'view_' + side, subSectionId:'saved', title:'Sky ' + side + ' ' + i, url:'https://sky.test/' + side + '/' + i, order:i, launchPreference:'direct' });
    }
    data.bookmarks.push({ id:'view_hidden', categoryId:'view_left', subSectionId:'saved', title:'Sky hidden', url:'https://hidden.test', hidden:true });
    data.bookmarks.push({ id:'view_folder', categoryId:'view_left', subSectionId:'saved', title:'Celestial folder', type:'folder', order:10, subBookmarks:[{ id:'view_child', title:'Comet notes', url:'https://comet.test' }] });
    saveBookmarkData(data); renderBookmarksUI();
  });
  const section = page.locator('[data-category-id="view_left"] .subsection-content');
  assert.equal(await section.locator('.bookmark-card:visible').count(), 5);
  const bottomSection = page.locator('[data-category-id="view_bottom"] .subsection-content');
  await page.waitForTimeout(250);
  const measuredRow = await bottomSection.evaluate(node => {
    const cards = Array.from(node.querySelectorAll('.bookmark-card')).filter(card => card.getClientRects().length);
    const firstTop = cards[0].getBoundingClientRect().top;
    const row = cards.filter(card => Math.abs(card.getBoundingClientRect().top - firstTop) < 2);
    return { mode:node.dataset.countMode, count:cards.length, rowCount:row.length, available:node.clientWidth, firstWidth:cards[0].getBoundingClientRect().width, gap:parseFloat(getComputedStyle(node).columnGap) || 0 };
  });
  assert.equal(measuredRow.mode, 'auto');
  assert.equal(measuredRow.count, measuredRow.rowCount, 'Auto bottom count must occupy one actual visual row');
  assert.equal(measuredRow.count, Math.min(9, Math.max(1, Math.floor((measuredRow.available + measuredRow.gap) / (200 + measuredRow.gap)))));
  assert(measuredRow.firstWidth >= 199, 'Auto rows must preserve readable bookmark width');
  pass('side sections default to five; bottom Auto shows one measured row with readable card widths');
  const more = section.locator('.show-more-btn'); await more.click(); await page.waitForTimeout(300);
  assert.equal(await section.locator('.bookmark-card:visible').count(), 10);
  assert.equal(await more.getAttribute('aria-expanded'), 'true');
  await page.reload({ waitUntil:'domcontentloaded' });
  assert.equal(await section.locator('.bookmark-card:visible').count(), 10);
  await more.click(); await page.waitForTimeout(300);
  assert.equal(await section.locator('.bookmark-card:visible').count(), 5);
  assert.equal(await more.getAttribute('aria-expanded'), 'false');
  pass('Show More and Show Less preserve state across reload and keep the same button');
  await more.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(35); await page.keyboard.press('Enter'); await page.waitForTimeout(320);
  assert.equal(await section.locator('.bookmark-card:visible').count(), 5);
  assert(await more.evaluate(node => document.activeElement === node));
  pass('rapid expansion reversal reaches the last requested state and preserves focus');
  for (const [left, right] of [[true,true],[false,true],[true,false],[false,false],[true,true]]) {
    for (const [side, open] of [['left',left], ['right',right]]) {
      if ((await page.evaluate(() => HeavenlyLayout.getState())).actual[side].open !== open) {
        await page.locator('[data-sidebar-toggle="' + side + '"]:visible').first().click(); await page.waitForTimeout(230);
      }
    }
    const state = (await page.evaluate(() => HeavenlyLayout.getState())).actual;
    assert.equal(state.left.open, left); assert.equal(state.right.open, right);
    await page.locator('#bm-universal-search').fill('Research');
    assert.equal(await page.locator('#bookmark-search-results .bookmark-search-result').count(), 29);
    const during = (await page.evaluate(() => HeavenlyLayout.getState())).actual;
    assert.equal(during.left.open, left); assert.equal(during.right.open, right);
    await page.locator('#bm-search-clear-btn').click();
    const cleared = (await page.evaluate(() => HeavenlyLayout.getState())).actual;
    assert.equal(cleared.left.open, left); assert.equal(cleared.right.open, right);
  }
  pass('all four sidebar combinations return the same central results and retain their state after clearing');
  const before = await page.evaluate(() => localStorage.getItem('heavenly_bookmarks'));
  await page.evaluate(() => { window.__searchSource = document.querySelector('[data-bm-id="left_0"]'); document.getElementById('left-column').setAttribute('data-search-sentinel','kept'); });
  await page.locator('#bm-universal-search').fill('Research');
  assert.equal(await page.locator('#bookmark-search-results .bookmark-search-result').count(), 29);
  assert(await page.locator('#bookmark-search-results').evaluate(node => node.clientHeight <= 560 && node.scrollHeight > node.clientHeight));
  assert.equal(await page.locator('.bookmark-search-result .bookmark-search-icon').count(), 29);
  assert.equal(await page.locator('.bookmark-search-result .bookmark-search-arrow svg').count(), 29);
  assert.equal(await page.locator('#bookmark-search-results [data-bookmark-id="view_hidden"]').count(), 0);
  assert(await page.evaluate(() => window.__searchSource === document.querySelector('[data-bm-id="left_0"]')));
  assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_bookmarks')), before);
  pass('central search includes all column and subsection content, respects hidden bookmarks and preserves source DOM/order');
  await page.locator('#bm-universal-search').fill('Celestial comet');
  assert.equal(await page.locator('#bookmark-search-results [data-bookmark-id="view_child"]').count(), 1);
  await page.locator('#bm-universal-search').fill('Sky right 8');
  await page.locator('#bm-universal-search').press('ArrowDown');
  assert(await page.locator('#bookmark-search-results .bookmark-search-result').evaluate(node => document.activeElement === node));
  await page.evaluate(() => { window.__launched = null; window.openTargetUrlWithSetting = url => { window.__launched = url; }; });
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__launched), 'https://sky.test/right/8');
  await page.locator('#bm-search-clear-btn').click();
  assert(await page.locator('#bookmark-search-results').isHidden());
  assert.equal(await page.locator('#left-column').getAttribute('data-search-sentinel'), 'kept');
  pass('folder context, keyboard selection and saved direct navigation work; clearing leaves columns intact');
  const afterLaunch = await page.evaluate(() => localStorage.getItem('heavenly_bookmarks'));
  await page.goto(origin + '/settings.html', { waitUntil:'domcontentloaded' });
  await page.locator('#set-bookmark-count-mode').selectOption('custom');
  const global = page.locator('#set-bookmark-initial-limit'); await global.fill('7'); await global.press('Tab');
  await global.fill('31'); await global.press('Tab');
  assert.equal(await global.evaluate(node => node.checkValidity()), false);
  assert.equal(await page.evaluate(() => HeavenlyNavigation.readSettings(localStorage).bookmarkInitialLimit), 7);
  await global.fill('7'); await global.press('Tab');
  await page.locator('#set-bookmark-limit-section').selectOption(JSON.stringify(['view_left', null]));
  await page.locator('#set-bookmark-section-mode').selectOption('custom');
  await page.locator('#set-bookmark-section-limit').fill('3'); await page.locator('#set-bookmark-section-limit').press('Tab');
  await page.locator('#set-bookmark-limit-section').selectOption(JSON.stringify(['view_left', 'saved']));
  await page.locator('#set-bookmark-section-mode').selectOption('custom');
  await page.locator('#set-bookmark-section-limit').fill('2'); await page.locator('#set-bookmark-section-limit').press('Tab');
  await page.goto(origin, { waitUntil:'domcontentloaded' });
  assert.equal(await section.locator('.bookmark-card:visible').count(), 2);
  assert.equal(await page.locator('[data-category-id="view_right"] .bookmark-card:visible').count(), 7);
  pass('global, category and subsection count preferences apply with subsection precedence');
  await page.goto(origin + '/settings.html', { waitUntil:'domcontentloaded' });
  await page.locator('#set-bookmark-limit-section').selectOption(JSON.stringify(['view_left', 'saved']));
  await page.locator('#reset-bookmark-section-limit').click();
  await page.goto(origin, { waitUntil:'domcontentloaded' });
  assert.equal(await section.locator('.bookmark-card:visible').count(), 7);
  assert.equal(await page.evaluate(() => localStorage.getItem('heavenly_bookmarks')), afterLaunch);
  pass('resetting a subsection override restores the global default without changing bookmark data');
  assert.deepEqual(errors, []);
  console.log(checks + ' homepage search/count browser checks passed in ' + engine);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
});

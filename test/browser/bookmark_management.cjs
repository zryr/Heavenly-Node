// Optional browser checks: start the app, then run node test/browser/bookmark_management.cjs.
// Requires Playwright and Chromium in the test environment; no production dependencies.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const baseUrl = process.env.HEAVENLY_BASE_URL || 'http://127.0.0.1:8080/';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });
  await context.addInitScript(() => { try { sessionStorage.setItem('heavenly_decoy_unlocked', 'true'); } catch {} });
  const page = await context.newPage();
  let box;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.request().url().startsWith(baseUrl) && !route.request().url().includes('/proxy/') ? route.continue() : route.abort());
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(650);
  await page.evaluate(() => {
    const data = loadBookmarkData();
    data.categories.forEach(c => c.hidden = true);
    data.categories.push({ id: 'test_a', title: 'Favorites', side: 'left', order: 0, subSections: [{ id: 'user', title: 'Your Bookmarks' }, { id: 's2', title: 'Recommended' }, { id: 's3', title: 'Classics' }] });
    data.categories.push({ id: 'test_b', title: 'Watch later', side: 'left', order: 1, subSections: [{ id: 'user', title: 'Your Bookmarks' }, { id: 's2', title: 'Recommended' }] });
    for (let i = 0; i < 10; i++) data.bookmarks.push({ id: 'test_' + i, title: 'Bookmark ' + i, categoryId: 'test_a', subSectionId: 'user', url: 'https://example.com/' + i, order: i });
    saveBookmarkData(data);
    expandedCategories.test_a = true;
    renderBookmarksUI();
  });
  await page.locator('.layout-toolbar [data-sidebar-toggle="left"]').tap();
  const storage = () => page.evaluate(() => JSON.parse(localStorage.getItem('heavenly_bookmarks')));
  const sections = async () => (await storage()).categories.find(c => c.id === 'test_a').subSections.map(s => s.id);
  const cdp = await context.newCDPSession(page);
  async function touch(type, x, y) {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 }] });
  }
  async function drag(from, to, hold = 550, cancel = false) {
    await from.scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const a = await from.boundingBox();
    const x = a.x + a.width / 2, y = a.y + a.height / 2;
    await touch('touchStart', x, y);
    await delay(hold);
    const b = await to.evaluate(n => HeavenlyDrag.rect(n));
    await touch('touchMove', b.left + b.width / 2, b.top + b.height * 0.85);
    await delay(60);
    await touch(cancel ? 'touchCancel' : 'touchEnd');
    await delay(100);
  }
  async function assertSingleHandle(selector, title) {
    assert.equal(await page.locator('.section-card .drag-dots-handle.selected').count(), 1);
    assert(await page.locator(selector).evaluate(el => el.classList.contains('selected')));
    assert.equal(await page.locator('#bar-target-info').textContent(), title);
  }
  for (const id of [0, 1, 2]) {
    const selector = '.bookmark-card[data-bm-id="test_' + id + '"] .drag-dots-handle';
    await page.locator(selector).tap();
    await assertSingleHandle(selector, 'Bookmark ' + id);
  }
  const categoryHandle = '[data-category-id="test_a"] .section-header .drag-dots-handle';
  await page.locator(categoryHandle).tap();
  await assertSingleHandle(categoryHandle, 'Favorites');
  const bookmarkHandle = '.bookmark-card[data-bm-id="test_0"] .drag-dots-handle';
  await page.locator(bookmarkHandle).click();
  await assertSingleHandle(bookmarkHandle, 'Bookmark 0');
  await page.locator(categoryHandle).focus();
  await page.keyboard.press('Enter');
  await assertSingleHandle(categoryHandle, 'Favorites');
  await page.locator(bookmarkHandle).focus();
  await page.keyboard.press('Space');
  await assertSingleHandle(bookmarkHandle, 'Bookmark 0');
  console.log('PASS only one bookmark/category handle stays selected after taps, clicks and keyboard activation');
  for (const [selector, title] of [[categoryHandle, 'Favorites'], [bookmarkHandle, 'Bookmark 0']]) {
    if(await page.locator('#reorder-bar.active').count())await page.locator('#bar-close').tap();
    await page.locator(selector).scrollIntoViewIfNeeded();
    const box = await page.locator(selector).boundingBox();
    await touch('touchStart', box.x + box.width / 2, box.y + box.height / 2);
    await delay(550);
    assert(await page.locator(selector).evaluate(n=>n.classList.contains('heavenly-hold-ready')));
    assert.equal(await page.locator('#reorder-bar.active').count(),0);
    assert.equal(await page.locator('#heavenly-drag-avatar').count(),0);
    await touch('touchEnd');
    await delay(100);
    await assertSingleHandle(selector, title);
  }
  await page.locator('#bar-close').tap();
  assert.equal(await page.locator('.section-card .drag-dots-handle.selected').count(), 0);
  console.log('PASS handle holds give activation feedback before movement; release retains management and closing clears it');
  await page.locator('[data-category-id="test_a"] .section-header .drag-dots-handle').tap();
  await page.locator('#bar-edit').tap();
  assert.equal(await page.locator('#modal-title').textContent(), 'Edit Category');
  assert.equal(await page.locator('.section-order-row').count(), 3);
  await page.locator('.section-order-row').first().locator('button[aria-label$=" down"]').tap();
  assert.deepEqual(await sections(), ['user', 's2', 's3']);
  await page.locator('#cat-edit-cancel').tap();
  await page.evaluate(() => openCategoryEditModal('test_a'));
  await page.locator('.section-order-row .drag-dots-handle').first().focus();
  await page.keyboard.press('ArrowDown');
  await page.locator('#cat-submit-btn').tap();
  assert.deepEqual(await sections(), ['s2', 'user', 's3']);
  console.log('PASS staged section order, Cancel and keyboard Save');
  await page.evaluate(() => openCategoryEditModal('test_a'));
  await drag(page.locator('[data-section-id="s2"] .drag-dots-handle'), page.locator('[data-section-id="s3"]'));
  assert.deepEqual(await page.locator('.section-order-row').evaluateAll(rows => rows.map(r => r.dataset.sectionId)), ['user', 's3', 's2']);
  await page.locator('#cat-submit-btn').tap();
  assert.deepEqual(await sections(), ['user', 's3', 's2']);
  console.log('PASS native emulated touch section drag');
  await page.evaluate(() => openCategoryEditModal('test_a'));
  await drag(page.locator('[data-section-id="user"] .drag-dots-handle'), page.locator('[data-section-id="s2"]'), 550, true);
  assert.deepEqual(await page.locator('.section-order-row').evaluateAll(rows => rows.map(r => r.dataset.sectionId)), ['user', 's3', 's2']);
  await page.keyboard.press('Escape');
  console.log('PASS interrupted section drag does not commit');
  assert.equal(await page.locator('#bookmark-select-btn, #bar-select-multiple, .bookmark-select-checkbox, #bookmark-selection-bar').count(), 0);
  await page.locator('.bookmark-card[data-bm-id="test_2"] .drag-dots-handle').tap();
  assert.equal(await page.locator('#bar-edit').isVisible(), true);
  assert.equal(await page.locator('#bar-move-cat').isVisible(), true);
  await page.locator('#bar-close').tap();
  console.log('PASS multi-selection is removed while ordinary handle actions remain available');
  await page.evaluate(() => openCategoryEditModal('test_a'));
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-section-id="user"] .drag-dots-handle').dragTo(page.locator('[data-section-id="s2"]'), { targetPosition: { x: 80, y: 50 } });
  assert.deepEqual(await page.locator('.section-order-row').evaluateAll(rows => rows.map(r => r.dataset.sectionId)), ['s3', 's2', 'user']);
  await page.locator('#cat-submit-btn').click();
  assert.deepEqual(await sections(), ['s3', 's2', 'user']);
  console.log('PASS desktop mouse section dragging');
  await page.setViewportSize({ width: 430, height: 932 });
  await page.evaluate(() => {
    const data = loadBookmarkData(), cat = data.categories.find(c => c.id === 'test_a');
    for (let i = 0; i < 14; i++) cat.subSections.push({ id: 'extra_' + i, title: 'Extra section ' + i });
    saveBookmarkData(data);
    openCategoryEditModal('test_a');
  });
  const initialDraft = await page.locator('.section-order-row').evaluateAll(rows => rows.map(r => r.dataset.sectionId));
  await page.waitForTimeout(400);
  await page.locator('#cat-sections-list').scrollIntoViewIfNeeded();
  box = await page.locator('#cat-sections-list').boundingBox();
  const listScrollBefore = await page.locator('#cat-sections-list').evaluate(el => el.scrollTop);
  await touch('touchStart', box.x + 40, box.y + box.height * .8);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', box.x + 40, box.y + box.height * .8 - i * 14); await delay(20); }
  await touch('touchEnd');
  await delay(250);
  assert((await page.locator('#cat-sections-list').evaluate(el => el.scrollTop)) > listScrollBefore + 30);
  assert.deepEqual(await page.locator('.section-order-row').evaluateAll(rows => rows.map(r => r.dataset.sectionId)), initialDraft);
  console.log('PASS nested section list scrolls natively without reordering');
  await page.locator('#cat-sections-list').evaluate(el => el.scrollTop = 0);
  await drag(page.locator('.section-order-row .drag-dots-handle').first(), page.locator('.section-order-row').nth(2), 40);
  await delay(600);
  assert.deepEqual(await page.locator('.section-order-row').evaluateAll(rows => rows.map(r => r.dataset.sectionId)), initialDraft);
  assert.equal(await page.locator('.section-order-row.dragging, .section-order-row .selected').count(), 0);
  await page.locator('.section-order-row .drag-dots-handle').first().scrollIntoViewIfNeeded();
  box = await page.locator('#cat-sections-list').boundingBox();
  const handleBox = await page.locator('.section-order-row .drag-dots-handle').first().boundingBox();
  await touch('touchStart', handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.waitForFunction(() => categorySectionDragId !== null, null, { timeout: 2000 });
  await touch('touchMove', box.x + box.width / 2, box.y + box.height - 10);
  await page.waitForFunction(() => document.getElementById('cat-sections-list').scrollTop > 40, null, { timeout: 2000 });
  await touch('touchCancel');
  const stoppedScroll = await page.locator('#cat-sections-list').evaluate(el => el.scrollTop);
  await delay(100);
  assert.equal(await page.locator('#cat-sections-list').evaluate(el => el.scrollTop), stoppedScroll);
  assert.deepEqual(await page.locator('.section-order-row').evaluateAll(rows => rows.map(r => r.dataset.sectionId)), initialDraft);
  assert.equal(await page.locator('.drag-popout-avatar').count(), 0);
  await page.keyboard.press('Escape');
  console.log('PASS fast handle swipes cancel the pending hold timer');
  console.log('PASS drag edge scrolling and cancellation cleanup');
  await page.evaluate(() => {
    const data = loadBookmarkData();
    const cat = data.categories.find(c => c.id === 'test_a');
    cat.subSections = cat.subSections.filter(s => !s.id.startsWith('extra_'));
    data.bookmarks.forEach(b => { if (b.id.startsWith('test_') && Number(b.id.slice(5)) > 5) b.hidden = true; });
    saveBookmarkData(data);
    expandedSubSections.test_a_user = true;
    renderBookmarksUI();
    scrollTo(0, 0);
  });
  await drag(page.locator('.bookmark-card[data-bm-id="test_2"] .drag-dots-handle'), page.locator('.bookmark-card[data-bm-id="test_4"]'));
  const order = (await storage()).bookmarks.filter(b => b.categoryId === 'test_a' && !b.hidden).sort((a, b) => a.order - b.order).map(b => b.id);
  assert(order.indexOf('test_2') > order.indexOf('test_4'));
  assert.equal(await page.locator('.bookmark-drag-ghost, .drag-popout-avatar, .bookmark-card.dragging').count(), 0);
  console.log('PASS bookmark handle touch reordering and drop cleanup');
  await drag(page.locator('[data-category-id="test_b"] .section-header .drag-dots-handle'), page.locator('[data-category-id="test_a"] .section-header'));
  const catOrder = (await storage()).categories.filter(c => !c.hidden).sort((a, b) => a.order - b.order).map(c => c.id);
  assert.deepEqual(catOrder, ['test_b', 'test_a']);
  console.log('PASS category handle touch reordering');
  assert.deepEqual(errors, []);
  console.log('PASS no page JavaScript errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

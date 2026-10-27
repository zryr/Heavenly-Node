'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const app = require('../app');
const session = require('../public/assets/academy-session');
const information = require('../public/assets/academy-information');
const navigation = require('../public/assets/heavenly-navigation');
const publicDir = path.join(__dirname, '..', 'public');
const pages = fs.readdirSync(path.join(publicDir, 'academy')).filter(name => name.endsWith('.html'));
function windowFixture(saved = {}, settings = null, storageDenied = false) {
  const data = new Map(Object.entries(saved));
  const win = {
    sessionStorage: { getItem(key) { if (storageDenied) throw Error('Denied'); return data.get(key) || null; }, setItem(key, value) { if (storageDenied) throw Error('Denied'); data.set(key, value); } },
    localStorage: { getItem() { return settings; } },
    document: { documentElement: { style: {} } },
    location: { href: 'https://academy.test/', replace(value) { this.replaced = value; } },
    history: { replaceState(a, b, value) { this.replaced = value; } }
  };
  return { win, data };
}

describe('Academy standalone document and navigation boundary', function () {
  it('removes the mounted school overlay and gates before loading Heavenly assets', function () {
    const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
    assert(!html.includes('academy-decoy-root'));
    assert(!html.includes('Atlanta Classical Academy'));
    assert(html.indexOf('AcademySession.gateHome(window)') < html.indexOf('/assets/heavenly-tokens.css'));
    assert(html.includes('<noscript><meta http-equiv="refresh" content="0;url=/academy"></noscript>'));
  });
  it('contains literal academic content without the Heavenly app beneath it', function () {
    assert.equal(pages.length, 12);
    for (const file of pages) {
      const html = fs.readFileSync(path.join(publicDir, 'academy', file), 'utf8');
      assert(html.includes('id="academy-main"'), file);
      assert(html.includes('Morrowfield Academy'), file);
      assert(!html.includes('id="url"'), file);
      assert(!html.includes('id="codex-dev-modal"'), file);
      assert(!html.includes('/assets/heavenly-home.css'), file);
      assert(!html.includes('Atlanta Classical Academy'), file);
      assert(!/href="(?:#|javascript:|)"/.test(html), file + ': dead link');
      assert(html.includes('viewport-fit=cover'), file + ': safe area viewport');
      assert(!/[→☰]/.test(html), file + ': font-dependent decorative icon');
    }
  });
  it('commits complete documents generated from the shared source templates', function () {
    const check = require('node:child_process').spawnSync(process.execPath, ['scripts/build-academy.cjs', '--check'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    assert.equal(check.status, 0, check.stderr);
    for (const file of ['about', 'terms', 'privacy', 'accessibility', 'credits']) {
      const html = fs.readFileSync(path.join(publicDir, 'academy', file + '.html'), 'utf8');
      assert(html.includes('saved <strong>Search</strong> launch preferences'), file);
      assert(html.includes('same tab by default'), file);
    }
  });
  it('reserves every page before upstream Referer recovery', async function () {
    for (const file of pages) {
      const route = file === 'home.html' ? '/academy' : '/academy/' + file.replace('.html', '');
      const result = await request(app).get(route).set('Referer', 'http://localhost/proxy/https://example.com/').expect(200);
      assert(result.text.includes('Morrowfield Academy'), route);
      assert(!result.text.includes('id="url"'), route);
    }
    await request(app).get('/academy.html').expect(200);
  });
  it('every local link resolves to an existing document, file or valid section', async function () {
    const destinations = new Set();
    for (const file of pages) {
      const html = fs.readFileSync(path.join(publicDir, 'academy', file), 'utf8');
      for (const match of html.matchAll(/href="([^"]+)"/g)) {
        const href = match[1].replace(/&amp;/g, '&');
        if (href.startsWith('#')) { assert(html.includes('id="' + href.slice(1) + '"'), file + ' ' + href); continue; }
        if (!href.startsWith('/')) continue;
        const url = new URL(href, 'https://academy.test');
        if (url.pathname === '/') { assert.equal(file, 'terms.html'); continue; }
        if (url.hash) {
          const name = url.pathname === '/academy' ? 'home' : url.pathname.split('/').pop();
          const target = fs.readFileSync(path.join(publicDir, 'academy', name + '.html'), 'utf8');
          assert(target.includes('id="' + url.hash.slice(1) + '"'), href);
        }
        destinations.add(url.pathname + url.search);
      }
    }
    for (const destination of destinations) await request(app).get(destination).expect(200);
  });
  it('planned services are honest Coming Soon content with alternatives, not 503 outages', async function () {
    const result = await request(app).get('/academy/status?service=student-portal').expect(200);
    assert(result.text.includes('Coming Soon'));
    assert(result.text.includes('rather than a temporary service outage'));
    assert(result.text.includes('Back to student hub'));
    assert(result.text.includes('Browse the resource library'));
  });
  it('returns a branded 404 for unknown documents and real 503 only after a requested file read fails', async function () {
    const missing = await request(app).get('/academy/no-such-page').set('Referer', 'http://localhost/proxy/https://example.com/').expect(404);
    assert(missing.text.includes('id="academy-not-found"'));
    assert(!missing.text.includes('temporary service outage'));
    await request(app).get('/academy/no/such/page').set('Referer', 'http://localhost/proxy/https://example.com/').expect(404);
    const express = require('express');
    const fixture = express();
    fixture.get('/academy/:page', require('../lib/academy-routes').createHandler(path.join(__dirname, 'not-an-academy-directory')));
    const unavailable = await request(fixture).get('/academy/terms').expect(503);
    assert(unavailable.text.includes('id="academy-unavailable"'));
    assert(unavailable.text.includes('id="academy-retry"'));
    assert(unavailable.text.includes('The server could not load the Academy page you requested.'));
    assert(!unavailable.text.includes('incident'));
  });
  it('keeps real terms, software authorship and licensed photo attribution accessible', function () {
    const terms = fs.readFileSync(path.join(publicDir, 'academy/terms.html'), 'utf8');
    assert(terms.includes('GNU Affero General Public License'));
    assert(terms.includes('Nathan Friedly'));
    assert(terms.includes('Syshi'));
    assert(terms.includes('id="academy-home-return"'));
    const credits = fs.readFileSync(path.join(publicDir, 'academy/credits.html'), 'utf8');
    assert(credits.includes('Matthew Petroff'));
    assert(credits.includes('creativecommons.org/licenses/by-sa/3.0/'));
    assert(credits.includes('does not depict a Morrowfield campus'));
  });
});

describe('Academy trusted information launch preferences', function () {
  function fixture(settings, popup) {
    const win = { parent: null, location: { origin: 'https://academy.test', assign(value) { this.assigned = value; } }, localStorage: { getItem() { return JSON.stringify(settings); } }, open(url, target) { this.opened = { url, target }; return popup; } };
    win.parent = win;
    return win;
  }
  it('only permits its own five trusted information documents', function () {
    for (const name of ['about', 'terms', 'privacy', 'accessibility', 'credits']) assert(information.allowed('/academy/' + name + '#section', 'https://academy.test'));
    for (const value of ['https://other.test/academy/terms', '/academy/programs', '/html-viewer.html', '/proxy/https://academy.test/academy/terms', 'javascript:alert(1)', '/academy/terms/extra']) assert(!information.allowed(value, 'https://academy.test'), value);
  });
  it('uses Search same-tab defaults even when bookmark launch is enabled', function () {
    const win = fixture({ openBookmarksInNewTab: true });
    assert(information.launch(win, '/academy/privacy', navigation));
    assert.equal(win.location.assigned, 'https://academy.test/academy/privacy');
    assert.equal(win.opened, undefined);
  });
  it('opens normal tabs with a severed opener using the saved Search choice', function () {
    const popup = { opener: 'original', location: { replace(value) { this.replaced = value; } } };
    const win = fixture({ openSearchInNewTab: true }, popup);
    assert(information.launch(win, '/academy/terms', navigation));
    assert.equal(popup.opener, null);
    assert.equal(popup.location.replaced, 'https://academy.test/academy/terms');
    assert.deepEqual(win.opened, { url: 'about:blank', target: '_blank' });
    assert.equal(win.location.assigned, undefined);
  });
  it('keeps real navigation working when popup creation or browser storage is denied', function () {
    const win = fixture({ openSearchInAboutBlank: true }, null);
    assert(information.launch(win, '/academy/accessibility', navigation));
    assert.equal(win.location.assigned, 'https://academy.test/academy/accessibility');
    Object.defineProperty(win, 'localStorage', { get() { throw Error('Storage denied'); } });
    win.opened = undefined;
    assert(information.launch(win, '/academy/credits', navigation));
    assert.equal(win.location.assigned, 'https://academy.test/academy/credits');
    assert.equal(win.opened, undefined);
  });
  it('reuses only a shell that owns this exact trusted frame', function () {
    const win = fixture({ openSearchInAboutBlank: true });
    let navigated;
    win.parent = { __academyInfoShell: { frame: { contentWindow: win }, navigate(value) { navigated = value; } } };
    assert(information.launch(win, '/academy/privacy', navigation));
    assert.equal(navigated, 'https://academy.test/academy/privacy');
    win.parent.__academyInfoShell.frame.contentWindow = {};
    assert.equal(information.ownedShell(win), null);
  });
});

describe('Academy presentation session continuity', function () {
  it('redirects a locked homepage before rendering, without mutating saved settings', function () {
    const { win, data } = windowFixture();
    assert.equal(session.gateHome(win), true);
    assert.equal(win.document.documentElement.style.visibility, 'hidden');
    assert.equal(win.location.replaced, '/academy');
    assert.equal(data.size, 0);
  });
  it('keeps an unlocked session on Heavenly and preserves its URL', function () {
    const { win } = windowFixture({ heavenly_decoy_unlocked: 'true' });
    win.location.href += '?show=bookmarks#notes';
    assert.equal(session.gateHome(win), false);
    assert.equal(win.location.replaced, undefined);
    assert.equal(win.document.documentElement.style.visibility, undefined);
  });
  it('Terms unlocks only the established session flag', function () {
    const { win, data } = windowFixture({ personal: 'unchanged' });
    assert.equal(session.homeUrl(win), '/');
    assert.equal(data.get('heavenly_decoy_unlocked'), 'true');
    assert.equal(data.get('personal'), 'unchanged');
    assert.equal(data.size, 2);
  });
  it('provides a one-navigation fallback if session storage is unavailable', function () {
    const { win } = windowFixture({}, null, true);
    assert.equal(session.homeUrl(win), '/?academy=continue');
    win.location.href = 'https://academy.test/?academy=continue&keep=1#notes';
    assert.equal(session.gateHome(win), false);
    assert.equal(win.history.replaced, '/?keep=1#notes');
    assert.equal(win.document.documentElement.style.visibility, undefined);
  });
  it('only enables the existing timer for an explicit true preference', function () {
    for (const value of [null, '{bad', '{}', '{"decoyAutoTimer":false}', '{"decoyAutoTimer":"true"}']) {
      assert.equal(session.autoUnlockEnabled(windowFixture({}, value).win), false);
    }
    assert.equal(session.autoUnlockEnabled(windowFixture({}, '{"decoyAutoTimer":true,"future":"keep"}').win), true);
  });
});

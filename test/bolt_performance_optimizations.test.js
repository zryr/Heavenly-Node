'use strict';
const assert = require('node:assert/strict');
const app = require('../app');
const vitepressRouter = require('../lib/vitepress-router');
const injectProxyClient = require('../lib/proxy-client-injector');
const navigation = require('../public/assets/heavenly-navigation');
const bookmarks = require('../public/assets/heavenly-bookmarks');

describe('⚡ Bolt Performance Optimizations Regression Suite', function () {
  it('iframeSecurityHeadersResponseMiddleware correctly filters security headers without regex overhead', function () {
    const data = {
      headers: {},
      remoteResponse: {
        headers: {
          'content-type': 'text/html',
          'x-frame-options': 'SAMEORIGIN',
          'content-security-policy': "default-src 'self'",
          'x-content-type-options': 'nosniff',
          'server': 'nginx'
        }
      }
    };
    app.iframeSecurityHeadersResponseMiddleware(data);
    assert.equal(data.headers['x-frame-options'], 'SAMEORIGIN');
    assert.equal(data.headers['content-security-policy'], "default-src 'self'");
    assert.equal(data.headers['x-content-type-options'], 'nosniff');
    assert.equal(data.headers['server'], undefined);
  });

  it('vitepressRouter fast-paths non-asset and non-javascript content', function () {
    let touched = false;
    const data = {
      contentType: 'text/html',
      url: 'https://example.com/assets/app.12345.js',
      stream: { pipe: function () { touched = true; } }
    };
    vitepressRouter(data);
    assert.equal(touched, false);

    const nonAssetData = {
      contentType: 'application/javascript',
      url: 'https://example.com/js/main.js',
      stream: { pipe: function () { touched = true; } }
    };
    vitepressRouter(nonAssetData);
    assert.equal(touched, false);
  });

  it('injectProxyClient handles HTML stream initialization efficiently with hoisted diagnostics', function () {
    let piped = false;
    const data = {
      contentType: 'text/html',
      url: 'https://example.com/',
      stream: {
        pipe: function (transform) {
          piped = true;
          return transform;
        }
      }
    };
    injectProxyClient(data);
    assert.equal(piped, true);
  });

  it('isCoolmathUrl fast-paths non-coolmath URLs and handles valid Coolmath inputs', function () {
    assert.equal(navigation.isCoolmathUrl('https://google.com/'), false);
    assert.equal(navigation.isCoolmathUrl('https://youtube.com/'), false);
    assert.equal(navigation.isCoolmathUrl('https://www.coolmathgames.com/0-run-3'), true);
    assert.equal(navigation.isCoolmathUrl('HTTPS://COOLMATHGAMES.COM/'), true);
    assert.equal(navigation.isCoolmathUrl(new URL('https://coolmathgames.com/')), true);
  });

  it('mirrorState correctly resolves active and promoted mirrors while reusing pre-computed keys', function () {
    const testBookmark = {
      id: 'bm_aether',
      title: 'Aether',
      url: 'https://actstudy.s3.us-east-1.amazonaws.com/index.html',
      subBookmarks: [
        { id: 'sub_aether_1', title: 'Mirror 1', url: 'https://dogestudy.aether.samirchand.com.np/' },
        { id: 'sub_aether_2', title: 'Mirror 2', url: 'https://aetherk12.s3.amazonaws.com/index.html' }
      ]
    };
    const brokenMap = {
      'https://actstudy.s3.us-east-1.amazonaws.com/index.html': true
    };
    const state = bookmarks.mirrorState(testBookmark, '', '', brokenMap);
    assert.equal(state.allBroken, false);
    assert.equal(state.primary.id, 'sub_aether_1');
    assert.equal(state.promoted, true);
    assert.equal(state.broken.length, 1);
  });
});

var assert = require('assert');
var unblockerClient = require('../custom-client/unblocker-client.js');
var app = require('../app.js');

describe('Ruffle Proxy Support', function () {
  it('should patch window.RufflePlayer.config urlRewriter to route through proxy', function () {
    var mockWin = {
      location: {
        origin: 'https://heavenly-node.vercel.app',
        pathname: '/proxy/https://masonsunblockedgames.github.io/MasonsUnblockedGames/ageofwar.html',
        search: '',
        hash: ''
      },
      document: {
        readyState: 'complete',
        documentElement: { addEventListener: function () {} },
        addEventListener: function () {}
      },
      addEventListener: function () {},
      localStorage: { getItem: function () { return null; } }
    };

    unblockerClient.initForWindow({ prefix: '/proxy/', url: 'https://masonsunblockedgames.github.io/MasonsUnblockedGames/ageofwar.html' }, mockWin);

    assert.ok(mockWin.RufflePlayer);
    assert.ok(mockWin.RufflePlayer.config);
    assert.strictEqual(typeof mockWin.RufflePlayer.config.urlRewriter, 'function');

    var testSwfUrl = 'https://masonsunblockedgames.github.io/MasonsUnblockedGames/age_of_war.swf';
    var rewritten = mockWin.RufflePlayer.config.urlRewriter(testSwfUrl);

    assert.strictEqual(rewritten, '/proxy/https://masonsunblockedgames.github.io/MasonsUnblockedGames/age_of_war.swf');
  });

  it('should preserve RufflePlayer setter and patch config when updated dynamically', function () {
    var mockWin = {
      location: {
        origin: 'https://heavenly-node.vercel.app',
        pathname: '/proxy/https://masonsunblockedgames.github.io/MasonsUnblockedGames/ageofwar.html',
        search: '',
        hash: ''
      },
      document: {
        readyState: 'complete',
        documentElement: { addEventListener: function () {} },
        addEventListener: function () {}
      },
      addEventListener: function () {},
      localStorage: { getItem: function () { return null; } }
    };

    unblockerClient.initForWindow({ prefix: '/proxy/', url: 'https://masonsunblockedgames.github.io/MasonsUnblockedGames/ageofwar.html' }, mockWin);

    // Dynamic assignment by Ruffle script
    mockWin.RufflePlayer = {
      config: {
        autoplay: 'on',
        urlRewriter: function (u) { return u.trim(); }
      }
    };

    assert.strictEqual(typeof mockWin.RufflePlayer.config.urlRewriter, 'function');

    var rawUrl = '  https://masonsunblockedgames.github.io/MasonsUnblockedGames/age_of_war.swf  ';
    var rewritten = mockWin.RufflePlayer.config.urlRewriter(rawUrl);

    assert.strictEqual(rewritten, '/proxy/https://masonsunblockedgames.github.io/MasonsUnblockedGames/age_of_war.swf');
  });

  it('should proxy HTMLObjectElement and HTMLEmbedElement attributes', function () {
    var config = { prefix: '/proxy/', url: 'https://example.com/' };
    var loc = { origin: 'http://localhost', pathname: '/proxy/https://example.com/', search: '', hash: '' };

    var dataUrl = 'https://example.com/game.swf';
    var proxied = unblockerClient.fixUrl(dataUrl, config, loc);

    assert.strictEqual(proxied, '/proxy/https://example.com/game.swf');
  });

  it('should set CORS headers in responseCorsMiddleware', function () {
    var data = { headers: {} };
    app.responseCorsMiddleware(data);

    assert.strictEqual(data.headers['access-control-allow-origin'], '*');
    assert.strictEqual(data.headers['access-control-allow-credentials'], 'true');
  });
});

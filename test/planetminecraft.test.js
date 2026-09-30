const assert = require('assert');
const app = require('../app.js');

describe('PlanetMinecraft & Redirect Response Middleware', function () {
  describe('planetminecraftMiddleware', function () {
    it('should inject referer and origin headers for planetminecraft.com URLs', function () {
      const data = {
        url: 'https://www.planetminecraft.com/mods/tag/java/',
        uri: new URL('https://www.planetminecraft.com/mods/tag/java/'),
        headers: {}
      };

      app.planetminecraftMiddleware(data);

      assert.strictEqual(data.headers['referer'], 'https://www.planetminecraft.com/');
      assert.strictEqual(data.headers['origin'], 'https://www.planetminecraft.com');
    });

    it('should preserve existing planetminecraft.com referer when present', function () {
      const data = {
        url: 'https://www.planetminecraft.com/cdn-cgi/styles/cf.errors.css',
        uri: new URL('https://www.planetminecraft.com/cdn-cgi/styles/cf.errors.css'),
        headers: {
          referer: 'https://www.planetminecraft.com/mods/tag/java/'
        }
      };

      app.planetminecraftMiddleware(data);

      assert.strictEqual(data.headers['referer'], 'https://www.planetminecraft.com/mods/tag/java/');
      assert.strictEqual(data.headers['origin'], 'https://www.planetminecraft.com');
    });

    it('should normalize sec-fetch-site header for planetminecraft.com requests', function () {
      const data = {
        url: 'https://www.planetminecraft.com/cdn-cgi/challenge-platform/scripts/jsd/main.js',
        uri: new URL('https://www.planetminecraft.com/cdn-cgi/challenge-platform/scripts/jsd/main.js'),
        headers: {
          'sec-fetch-site': 'cross-site'
        }
      };

      app.planetminecraftMiddleware(data);

      assert.strictEqual(data.headers['sec-fetch-site'], 'same-origin');
    });

    it('should not modify headers for non-PlanetMinecraft URLs', function () {
      const data = {
        url: 'https://example.com/api',
        uri: new URL('https://example.com/api'),
        headers: {}
      };

      app.planetminecraftMiddleware(data);

      assert.strictEqual(data.headers['referer'], undefined);
      assert.strictEqual(data.headers['origin'], undefined);
    });
  });

  describe('responseRedirectMiddleware', function () {
    it('should rewrite relative Location headers into proxied URLs', function () {
      const data = {
        url: 'https://www.planetminecraft.com/mods/tag/java/',
        headers: {
          location: '/cdn-cgi/challenge-platform/h/b/scripts/jsd/d76008a69eab/main.js?'
        }
      };

      app.responseRedirectMiddleware(data);

      assert.strictEqual(
        data.headers['location'],
        '/proxy/https://www.planetminecraft.com/cdn-cgi/challenge-platform/h/b/scripts/jsd/d76008a69eab/main.js?'
      );
    });

    it('should normalize single-slash proxied Location headers', function () {
      const data = {
        url: 'https://www.planetminecraft.com/mods/tag/java/',
        headers: {
          location: '/proxy/https:/www.planetminecraft.com/mods/tag/java/'
        }
      };

      app.responseRedirectMiddleware(data);

      assert.strictEqual(
        data.headers['location'],
        '/proxy/https://www.planetminecraft.com/mods/tag/java/'
      );
    });

    it('should handle absolute Location headers correctly', function () {
      const data = {
        url: 'https://www.planetminecraft.com/mods/',
        headers: {
          location: 'https://www.planetminecraft.com/mods/tag/java/'
        }
      };

      app.responseRedirectMiddleware(data);

      assert.strictEqual(
        data.headers['location'],
        '/proxy/https://www.planetminecraft.com/mods/tag/java/'
      );
    });

    it('should do nothing if Location header is missing or non-string', function () {
      const data = {
        url: 'https://example.com/',
        headers: {}
      };

      app.responseRedirectMiddleware(data);

      assert.strictEqual(data.headers['location'], undefined);
    });
  });
});

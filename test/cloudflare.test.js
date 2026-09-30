const assert = require('assert');
const app = require('../app.js');

describe('Cloudflare & Redirect Response Middleware', function () {
  describe('cloudflareMiddleware', function () {
    it('should inject referer and origin for generic Cloudflare /cdn-cgi/ requests', function () {
      const data = {
        url: 'https://example.com/cdn-cgi/challenge-platform/scripts/jsd/main.js',
        uri: new URL('https://example.com/cdn-cgi/challenge-platform/scripts/jsd/main.js'),
        headers: {}
      };

      app.cloudflareMiddleware(data);

      assert.strictEqual(data.headers['referer'], 'https://example.com/');
      assert.strictEqual(data.headers['origin'], 'https://example.com');
    });

    it('should preserve existing referer when present for Cloudflare requests', function () {
      const data = {
        url: 'https://example.com/cdn-cgi/styles/cf.errors.css',
        uri: new URL('https://example.com/cdn-cgi/styles/cf.errors.css'),
        headers: {
          referer: 'https://example.com/page'
        }
      };

      app.cloudflareMiddleware(data);

      assert.strictEqual(data.headers['referer'], 'https://example.com/page');
      assert.strictEqual(data.headers['origin'], 'https://example.com');
    });

    it('should normalize sec-fetch-site header for Cloudflare requests', function () {
      const data = {
        url: 'https://example.com/cdn-cgi/challenge-platform/scripts/jsd/main.js',
        uri: new URL('https://example.com/cdn-cgi/challenge-platform/scripts/jsd/main.js'),
        headers: {
          'sec-fetch-site': 'cross-site'
        }
      };

      app.cloudflareMiddleware(data);

      assert.strictEqual(data.headers['sec-fetch-site'], 'same-origin');
    });

    it('should not modify headers for non-Cloudflare URLs', function () {
      const data = {
        url: 'https://example.com/api',
        uri: new URL('https://example.com/api'),
        headers: {}
      };

      app.cloudflareMiddleware(data);

      assert.strictEqual(data.headers['referer'], undefined);
      assert.strictEqual(data.headers['origin'], undefined);
    });
  });

  describe('responseRedirectMiddleware', function () {
    it('should rewrite relative Location headers into proxied URLs', function () {
      const data = {
        url: 'https://example.com/mods/tag/java/',
        headers: {
          location: '/cdn-cgi/challenge-platform/h/b/scripts/jsd/d76008a69eab/main.js?'
        }
      };

      app.responseRedirectMiddleware(data);

      assert.strictEqual(
        data.headers['location'],
        '/proxy/https://example.com/cdn-cgi/challenge-platform/h/b/scripts/jsd/d76008a69eab/main.js?'
      );
    });

    it('should normalize single-slash proxied Location headers', function () {
      const data = {
        url: 'https://example.com/mods/tag/java/',
        headers: {
          location: '/proxy/https:/example.com/mods/tag/java/'
        }
      };

      app.responseRedirectMiddleware(data);

      assert.strictEqual(
        data.headers['location'],
        '/proxy/https://example.com/mods/tag/java/'
      );
    });

    it('should handle absolute Location headers correctly', function () {
      const data = {
        url: 'https://example.com/mods/',
        headers: {
          location: 'https://example.com/mods/tag/java/'
        }
      };

      app.responseRedirectMiddleware(data);

      assert.strictEqual(
        data.headers['location'],
        '/proxy/https://example.com/mods/tag/java/'
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

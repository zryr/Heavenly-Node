var assert = require('assert');
var app = require('../app');

describe('responseLinkHeaderMiddleware', function() {
    var responseLinkHeaderMiddleware = app.responseLinkHeaderMiddleware;

    it('should rewrite single string Link header with absolute target URL', function() {
        var data = {
            url: 'https://example.com/page',
            headers: {
                'link': '<https://example.com/style.css>; rel="stylesheet"'
            }
        };

        responseLinkHeaderMiddleware(data);

        assert.strictEqual(
            data.headers['link'],
            '</proxy/https://example.com/style.css>; rel="stylesheet"'
        );
    });

    it('should resolve and rewrite relative target URLs against data.url', function() {
        var data = {
            url: 'https://example.com/path/to/page.html',
            headers: {
                'link': '</assets/style.css>; rel="stylesheet", <../script.js>; rel="preload"'
            }
        };

        responseLinkHeaderMiddleware(data);

        assert.strictEqual(
            data.headers['link'],
            '</proxy/https://example.com/assets/style.css>; rel="stylesheet", </proxy/https://example.com/path/script.js>; rel="preload"'
        );
    });

    it('should not rewrite URLs that already begin with prefix', function() {
        var data = {
            url: 'https://example.com/page',
            headers: {
                'link': '</proxy/https://example.com/style.css>; rel="stylesheet"'
            }
        };

        responseLinkHeaderMiddleware(data);

        assert.strictEqual(
            data.headers['link'],
            '</proxy/https://example.com/style.css>; rel="stylesheet"'
        );
    });

    it('should handle array of Link headers', function() {
        var data = {
            url: 'https://example.com/page',
            headers: {
                'link': [
                    '<https://example.com/style1.css>; rel="stylesheet"',
                    '</proxy/https://example.com/style2.css>; rel="stylesheet"',
                    '</images/logo.png>; rel="icon"'
                ]
            }
        };

        responseLinkHeaderMiddleware(data);

        assert.deepStrictEqual(data.headers['link'], [
            '</proxy/https://example.com/style1.css>; rel="stylesheet"',
            '</proxy/https://example.com/style2.css>; rel="stylesheet"',
            '</proxy/https://example.com/images/logo.png>; rel="icon"'
        ]);
    });

    it('should safely retain original target match if URL parsing throws an error', function() {
        var data = {
            url: 'invalid-base-url',
            headers: {
                'link': '<relative/path.css>; rel="stylesheet"'
            }
        };

        responseLinkHeaderMiddleware(data);

        assert.strictEqual(data.headers['link'], '<relative/path.css>; rel="stylesheet"');
    });

    it('should do nothing if data has no headers or no link header', function() {
        var data1 = {};
        responseLinkHeaderMiddleware(data1);
        assert.deepStrictEqual(data1, {});

        var data2 = { headers: {} };
        responseLinkHeaderMiddleware(data2);
        assert.deepStrictEqual(data2, { headers: {} });

        var data3 = { headers: { 'content-type': 'text/html' } };
        responseLinkHeaderMiddleware(data3);
        assert.deepStrictEqual(data3, { headers: { 'content-type': 'text/html' } });
    });

    it('should do nothing if link header is neither string nor array', function() {
        var data = {
            headers: {
                'link': 12345
            }
        };

        responseLinkHeaderMiddleware(data);

        assert.strictEqual(data.headers['link'], 12345);
    });
});

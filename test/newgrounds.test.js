var assert = require('assert');
var app = require('../app.js');

describe('Newgrounds request middleware', function() {
    it('should inject referer and origin headers for newgrounds.com URLs', function(done) {
        var data = {
            url: 'https://www.newgrounds.com/portal/view/12345',
            uri: new (require('url').URL)('https://www.newgrounds.com/portal/view/12345'),
            headers: {}
        };

        app.newgroundsMiddleware(data);
        assert.strictEqual(data.headers['referer'], 'https://www.newgrounds.com/');
        assert.strictEqual(data.headers['origin'], 'https://www.newgrounds.com');
        done();
    });

    it('should inject referer and origin headers for ngfiles.com CDN URLs', function(done) {
        var data = {
            url: 'https://js.ngfiles.com/legacy.CSs1F7tQ.js',
            uri: new (require('url').URL)('https://js.ngfiles.com/legacy.CSs1F7tQ.js'),
            headers: {}
        };

        app.newgroundsMiddleware(data);
        assert.strictEqual(data.headers['referer'], 'https://www.newgrounds.com/');
        assert.strictEqual(data.headers['origin'], 'https://www.newgrounds.com');
        done();
    });

    it('should inject referer and origin headers for ungrounded.net URLs', function(done) {
        var data = {
            url: 'https://uploads.ungrounded.net/12345/game.swf',
            uri: new (require('url').URL)('https://uploads.ungrounded.net/12345/game.swf'),
            headers: {}
        };

        app.newgroundsMiddleware(data);
        assert.strictEqual(data.headers['referer'], 'https://www.newgrounds.com/');
        assert.strictEqual(data.headers['origin'], 'https://www.newgrounds.com');
        done();
    });

    it('should not modify headers for non-Newgrounds URLs', function(done) {
        var data = {
            url: 'https://example.com/test',
            uri: new (require('url').URL)('https://example.com/test'),
            headers: { 'referer': 'https://example.com/' }
        };

        app.newgroundsMiddleware(data);
        assert.strictEqual(data.headers['referer'], 'https://example.com/');
        assert.strictEqual(data.headers['origin'], undefined);
        done();
    });
});

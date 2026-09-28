var assert = require('assert');
var unblockerClient = require('../custom-client/unblocker-client.js');

describe('unblocker-client.js Home Button Navigation', function () {
    it('fixUrl keeps external home page URL intact', function () {
        var fixUrl = unblockerClient.fixUrl;
        var config = { prefix: '/proxy/', url: 'https://example.com/' };
        var loc = { pathname: '/proxy/https://example.com/', search: '', hash: '', origin: 'http://localhost:8080', hostname: 'localhost' };
        var res = fixUrl('https://heavenly-node.vercel.app/', config, loc);
        assert.strictEqual(res, '/proxy/https://heavenly-node.vercel.app/');
    });
});

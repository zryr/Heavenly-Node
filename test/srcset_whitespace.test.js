'use strict';
const assert = require('node:assert/strict');
const client = require('../custom-client/unblocker-client');
describe('Bolt srcset optimization compatibility', () => {
  it('retains all JavaScript whitespace separators, including Unicode and vertical tabs', () => {
    const config = {prefix:'/proxy/', url:'https://example.com/'};
    const location = {pathname:'/proxy/https://example.com/', origin:'http://localhost', hostname:'localhost',search:'',hash:''};
    for (let code = 0; code <= 0xffff; code++) {
      const space = String.fromCharCode(code);
      if (!/\s/.test(space)) continue;
      assert.equal(client.fixSrcset(space+'a.png'+space+'1x,'+space+'data:image/png;base64,abc'+space+'2x', config, location),
        '/proxy/https://example.com/a.png 1x, data:image/png;base64,abc 2x', 'U+'+code.toString(16));
    }
  });
});

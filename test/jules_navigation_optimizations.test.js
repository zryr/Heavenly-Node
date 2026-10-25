'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const navigation=require('../public/assets/heavenly-navigation');
describe('Reviewed Bolt navigation optimizations',function(){
 it('preserves canonical remote destinations and exact asset links',function(){
  const cases=[[' HTTPS:/Example.test/a?x=1#p ','https://example.test/a?x=1#p'],['/proxy/https://EXAMPLE.test:443/a','https://example.test/a'],['https://proxy.test/proxy/http://EXAMPLE.test:80/a','http://example.test/a'],['https://cdn.jsdelivr.net/gh/ltorl/dancing-bunny/index.svg','https://cdn.jsdelivr.net/gh/ltorl/dancing-bunny/index.svg'],['javascript:alert(1)',''],['data:text/html,test',''],['//example.test',''],['','']];
  for(const [input,expected]of cases)assert.equal(navigation.remoteUrl(input,'https://proxy.test'),expected,input);
 });
 it('retains uppercase, encoded-host and URL-object compatibility rejected by the proposed raw substring guard',function(){
  for(const value of ['HTTPS://COOLMATHGAMES.COM/0-run-3','http://WWW.COOLMATHGAMES.COM/', 'https://%63oolmathgames.com/'])assert.equal(navigation.isCoolmathUrl(value),true);
  assert.equal(navigation.isCoolmathUrl(new URL('https://coolmathgames.com/')),true);
  assert.equal(navigation.isCoolmathUrl('https://coolmathgames.com.evil.test/'),false);
  assert.equal(navigation.bookmarkKey('HTTP://COOLMATHGAMES.COM/0-run-3?x=1#p'),'https://www.coolmathgames.com/0-run-3?x=1#p');
  assert.equal(navigation.bookmarkKey('https://coolmathgames.com.evil.test/'),'https://coolmathgames.com.evil.test/');
 });
 it('uses one URL parse for common bookmark identity resolution',function(){
  let parses=0;
  class MeasuredURL extends URL{constructor(value,base){super(value,base);parses++;}}
  const sandbox={module:{exports:{}},URL:MeasuredURL};vm.runInNewContext(fs.readFileSync(require.resolve('../public/assets/heavenly-navigation'),'utf8'),sandbox);
  assert.equal(sandbox.module.exports.bookmarkKey('https://EXAMPLE.test:443/path?q=1#part'),'https://example.test/path?q=1#part');
  assert.equal(parses,1,'the canonical href should not be parsed a second time');
 });
});

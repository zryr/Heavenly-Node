'use strict';
const assert = require('node:assert/strict');
const navigation = require('../public/assets/heavenly-navigation');
describe('Shared settings write safety', () => {
  it('never replaces unreadable saved preferences when changing one control', () => {
    for (const raw of ['{broken', '[]', 'null', '"old data"', 'false', '42', '']) {
      let writes = 0;
      const store = {getItem:()=>raw,setItem:()=>writes++};
      assert.throws(()=>navigation.updateSettings(store,{persistentCloak:true}));
      assert.equal(writes,0);
      assert.deepEqual(navigation.readSettings(store),{});
    }
  });
  it('propagates read and write failures and preserves unrelated valid preferences', () => {
    assert.throws(()=>navigation.updateSettings({getItem(){throw new Error('read blocked');}},{}),/read blocked/);
    let stored = JSON.stringify({future:{keep:true},dockPosition:'left',hiddenCategories:['saved']});
    const store = {getItem:()=>stored,setItem:(key,value)=>{stored=value;}};
    navigation.updateSettings(store,{dockPosition:'bottom'});
    assert.deepEqual(JSON.parse(stored),{future:{keep:true},dockPosition:'bottom',hiddenCategories:['saved']});
    assert.throws(()=>navigation.updateSettings({getItem:()=>null,setItem(){throw new Error('quota');}},{}),/quota/);
  });
});

const assert = require('node:assert/strict');
const {defaults} = require('../public/assets/heavenly-catalog');
describe('New default bookmarks', () => {
  for(const [id,title,url] of [['bm_sitesdotcom','SitesDotCom','https://games-b3749.web.app/'],['bm_grind1','GRIND1','https://zbr.base44.app'],['bm_gn_math','GN Math','https://gn-math.dev/']]) it(id,()=>{
    const item=defaults.bookmarks.find(b=>b.id===id); assert.equal(item.title,title);assert.equal(item.url,url);assert(item.icon);
  });
});

/* Local official-content drafts. This module never reads personal bookmarks. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HeavenlyOfficialRanking=factory();}(typeof self!=='undefined'?self:this,function(){
  'use strict';
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function fail(message){throw new Error(message);}
  function object(value){return value&&typeof value==='object'&&!Array.isArray(value);}
  function exact(value,keys,label){if(!object(value)||Object.keys(value).some(function(k){return keys.indexOf(k)<0;}))fail('Unexpected '+label+' fields.');}
  function identity(value){return typeof value==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,119}$/.test(value);}
  function numeric(value){return Number.isSafeInteger(value)&&value>=0;}
  function source(release){if(!release||!release.data||!Array.isArray(release.data.categories)||!Array.isArray(release.data.bookmarks))fail('The official catalog is unavailable.');return release.data;}
  function create(release){
    var data=source(release),draft={schema:1,catalogVersion:release.version,categories:[],bookmarks:[]};
    data.categories.forEach(function(c){draft.categories.push({id:c.id,side:c.side,order:c.order,subSections:(c.subSections||[]).map(function(s,i){return{id:s.id,order:i};})});});
    function walk(items,parent,cat,sec){items.forEach(function(b,i){var category=b.categoryId||cat,section=b.subSectionId||sec;draft.bookmarks.push({id:b.id,parentId:parent||null,categoryId:category,subSectionId:section,order:parent?i:b.order});walk(b.subBookmarks||[],b.id,category,section);});}
    walk(data.bookmarks,null);normalize(draft);return draft;
  }
  function group(item){return item.parentId?'parent:'+item.parentId:'section:'+item.categoryId+':'+item.subSectionId;}
  function normalize(draft){
    function ranks(items,key){var groups={};items.forEach(function(item){var k=key(item);(groups[k]||(groups[k]=[])).push(item);});Object.keys(groups).forEach(function(k){groups[k].sort(function(a,b){return a.order-b.order;}).forEach(function(item,i){item.order=i;});});}
    ranks(draft.categories,function(c){return c.side;});draft.categories.forEach(function(c){ranks(c.subSections,function(){return'';});});ranks(draft.bookmarks,group);return draft;
  }
  function validate(draft,release){
    exact(draft,['schema','catalogVersion','categories','bookmarks'],'ranking draft');
    if(draft.schema!==1)fail('Unsupported ranking schema.');if(draft.catalogVersion!==release.version)fail('This draft targets a different catalog version. Export it for review or start a new draft.');
    if(!Array.isArray(draft.categories)||!Array.isArray(draft.bookmarks))fail('Draft categories and bookmarks must be arrays.');
    var expected=create(release),cats={},bookmarks={},expectedCats={},expectedBookmarks={},groups={};
    expected.categories.forEach(function(c){expectedCats[c.id]=c;});expected.bookmarks.forEach(function(b){expectedBookmarks[b.id]=b;});
    function order(item,k){if(!numeric(item.order))fail('Order must be a nonnegative integer.');var values=groups[k]||(groups[k]=[]);if(values.indexOf(item.order)>=0)fail('Duplicate positions in '+k+'.');values.push(item.order);}
    draft.categories.forEach(function(c){exact(c,['id','side','order','subSections'],'category');if(!identity(c.id)||cats[c.id]||!expectedCats[c.id])fail('Duplicate or unknown category ID.');if(['left','right','bottom'].indexOf(c.side)<0)fail('Unsupported sidebar placement.');cats[c.id]=c;order(c,'side:'+c.side);if(!Array.isArray(c.subSections))fail('Category sections must be an array.');var sections={};c.subSections.forEach(function(s){exact(s,['id','order'],'section');if(!identity(s.id)||sections[s.id]||!expectedCats[c.id].subSections.some(function(e){return e.id===s.id;}))fail('Duplicate, unknown, or moved section ID.');sections[s.id]=true;order(s,'sections:'+c.id);});if(c.subSections.length!==expectedCats[c.id].subSections.length)fail('Missing official section.');});
    if(draft.categories.length!==expected.categories.length)fail('Missing official category.');
    draft.bookmarks.forEach(function(b){exact(b,['id','parentId','categoryId','subSectionId','order'],'bookmark');if(!identity(b.id)||bookmarks[b.id]||!expectedBookmarks[b.id])fail('Duplicate or unknown bookmark ID.');bookmarks[b.id]=b;var c=cats[b.categoryId];if(!c||!c.subSections.some(function(s){return s.id===b.subSectionId;}))fail('Missing category or subsection destination.');if(b.parentId!==null&&!identity(b.parentId))fail('Invalid bookmark parent ID.');order(b,group(b));});
    if(draft.bookmarks.length!==expected.bookmarks.length)fail('Missing official bookmark.');
    draft.bookmarks.forEach(function(b){var ancestors={},p=b;while(p.parentId){if(ancestors[p.id]||p.parentId===b.id)fail('Circular bookmark nesting.');ancestors[p.id]=true;p=bookmarks[p.parentId];if(!p)fail('Missing official parent.');if(p.categoryId!==b.categoryId||p.subSectionId!==b.subSectionId)fail('Nested destination must match its parent.');}if(b.parentId!==expectedBookmarks[b.id].parentId)fail('Moving links between official folders is not supported; reorder them within their existing folder.');});
    Object.keys(groups).forEach(function(k){groups[k].sort(function(a,b){return a-b;}).forEach(function(v,i){if(v!==i)fail('Positions must form a complete sequence.');});});return true;
  }
  function entries(draft,release){
    var names={};function walk(items){items.forEach(function(b){names[b.id]=b.title;walk(b.subBookmarks||[]);});}walk(source(release).bookmarks);
    var rows=[];draft.categories.forEach(function(c){var original=source(release).categories.find(function(x){return x.id===c.id;});rows.push({key:'category:'+c.id,id:c.id,title:original.title,kind:'category',side:c.side,order:c.order});c.subSections.forEach(function(s){rows.push({key:'section:'+c.id+':'+s.id,id:s.id,title:original.subSections.find(function(x){return x.id===s.id;}).title,kind:'section',categoryId:c.id,order:s.order});});});draft.bookmarks.forEach(function(b){rows.push(Object.assign({key:'bookmark:'+b.id,title:names[b.id],kind:b.parentId?'nested':'bookmark'},b));});return rows;
  }
  function move(draft,key,target,release){
    validate(draft,release);var next=clone(draft),parts=key.split(':'),item,list,kind=parts[0];target=target||{};
    if(kind==='category'){item=next.categories.find(function(c){return c.id===parts[1];});if(!item)fail('Unknown category.');var side=target.side||item.side;if(['left','right','bottom'].indexOf(side)<0)fail('Unsupported sidebar.');list=next.categories.filter(function(c){return c.side===side&&c!==item;});item.side=side;}
    else if(kind==='section'){var category=next.categories.find(function(c){return c.id===parts[1];});item=category&&category.subSections.find(function(s){return s.id===parts[2];});if(!item)fail('Unknown section.');if(target.categoryId&&target.categoryId!==category.id)fail('Sections can only be reordered within their category.');list=category.subSections.filter(function(s){return s!==item;});}
    else if(kind==='bookmark'){item=next.bookmarks.find(function(b){return b.id===parts[1];});if(!item)fail('Unknown bookmark.');if(Object.prototype.hasOwnProperty.call(target,'parentId')&&target.parentId!==item.parentId)fail('Moving between folders is unsupported.');if(item.parentId&&(target.categoryId&&target.categoryId!==item.categoryId||target.subSectionId&&target.subSectionId!==item.subSectionId))fail('Nested links stay inside their official folder.');item.categoryId=target.categoryId||item.categoryId;item.subSectionId=target.subSectionId||item.subSectionId;list=next.bookmarks.filter(function(b){return b!==item&&group(b)===group(item);});
      function children(parent){next.bookmarks.filter(function(b){return b.parentId===parent;}).forEach(function(b){b.categoryId=item.categoryId;b.subSectionId=item.subSectionId;children(b.id);});}children(item.id);
    }else fail('Unknown ranking item.');
    list.sort(function(a,b){return a.order-b.order;});var index=target.index===undefined?list.length:target.index;if(!numeric(index)||index>list.length)fail('Invalid target position.');list.splice(index,0,item);list.forEach(function(b,i){b.order=i;});normalize(next);validate(next,release);return next;
  }
  function changed(draft,release){var base=entries(create(release),release),rows=entries(draft,release);return rows.filter(function(row){var before=base.find(function(e){return e.key===row.key;});return ['order','side','categoryId','subSectionId','parentId'].some(function(k){return row[k]!==before[k];});}).map(function(row){return row.key;});}
  function version(value){return typeof value==='string'&&/^\d{4}\.\d{1,2}\.\d{1,2}\.\d+$/.test(value);}
  function newer(next,previous){if(!version(next))return false;var a=next.split('.').map(Number),b=previous.split('.').map(Number);for(var i=0;i<4;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;}
  function exportOrder(draft,release,nextVersion){validate(draft,release);if(!newer(nextVersion,release.version))fail('Choose a newer catalog version before exporting.');var result=clone(draft);result.catalogVersion=nextVersion;return JSON.stringify(result,null,2)+'\n';}
  function safeUrl(value,optional){if(optional&&!value)return true;try{var u=new URL(value);return /^https?:$/.test(u.protocol)&&!!u.hostname&&!u.username&&!u.password;}catch(e){return false;}}
  function validatePicks(draft){
    exact(draft,['schema','version','items'],'Picks draft');if(draft.schema!==1||!version(draft.version)||!Array.isArray(draft.items))fail('Unsupported Picks schema or version.');var ids={};draft.items.forEach(function(item,i){exact(item,['id','title','url','description','icon','thumbnail','tags','enabled','order'],'Picks item');if(!identity(item.id)||ids[item.id])fail('Picks need unique stable IDs.');ids[item.id]=true;if(typeof item.title!=='string'||!item.title.trim()||item.title.length>120)fail('Each Pick needs a title of at most 120 characters.');if(!safeUrl(item.url))fail('Each Pick needs an HTTP or HTTPS destination without credentials.');if(typeof item.description!=='string'||item.description.length>1000)fail('Descriptions may contain up to 1000 characters.');if(typeof item.icon!=='string'||typeof item.thumbnail!=='string'||!safeUrl(item.icon,true)||!safeUrl(item.thumbnail,true))fail('Optional images need HTTP or HTTPS URLs.');if(!Array.isArray(item.tags)||item.tags.length>8||item.tags.some(function(t){return typeof t!=='string'||!t.trim()||t.length>40;}))fail('Use up to eight short tags.');if(typeof item.enabled!=='boolean'||item.order!==i)fail('Picks must have enabled states and consecutive positions.');});return true;
  }
  function exportPicks(draft,publishedVersion){validatePicks(draft);if(!newer(draft.version,publishedVersion))fail('Choose a newer Picks version before exporting.');var json=JSON.stringify(draft,null,2).replace(/</g,'\\u003c');return '/* Reviewed Heavenly Picks. Publish through a repository PR. */\n(function(root,factory){if(typeof module===\'object\'&&module.exports)module.exports=factory();else root.HeavenlyPicks=factory();}(typeof self!==\'undefined\'?self:this,function(){return '+json+';}));\n';}
  return{create:create,validate:validate,move:move,entries:entries,changed:changed,exportOrder:exportOrder,validatePicks:validatePicks,exportPicks:exportPicks,clone:clone,newer:newer};
}));

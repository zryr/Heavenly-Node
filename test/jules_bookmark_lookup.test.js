'use strict';
const assert=require('node:assert/strict');
const navigation=require('../public/assets/heavenly-navigation');

// Original .some traversal retained as a parity oracle for the scoped #200
// optimization. The tests exercise ordering and array semantics, not timing.
function previous(data,value){
 const key=navigation.bookmarkKey(value);if(!key)return null;let found=null;
 (data.bookmarks||[]).some(bookmark=>{
  if(navigation.bookmarkKey(bookmark.url)===key){found=bookmark;return true;}
  return(bookmark.subBookmarks||[]).some(child=>{if(navigation.bookmarkKey(child.url)===key){found=child;return true;}return false;});
 });return found;
}
describe('Bolt #200 bookmark lookup adaptation',function(){
 it('retains canonical destinations, object identity and nested-before-later-parent order',function(){
  const child={id:'first-child',url:'https://www.coolmathgames.com/'},later={id:'later-parent',url:'https://coolmathgames.com/'};
  const data={bookmarks:[{id:'first-parent',url:'https://example.test/',subBookmarks:[child]},later]};
  assert.equal(navigation.findBookmarkByUrl(data,'https://coolmathgames.com/'),child);
  assert.equal(navigation.findBookmarkByUrl(data,'https://example.test/'),data.bookmarks[0]);
  for(const value of ['https://coolmathgames.com/','https://example.test/','https://missing.test/','javascript:alert(1)',''])assert.equal(navigation.findBookmarkByUrl(data,value),previous(data,value));
 });
 it('skips sparse parent and child slots without losing a later match',function(){
  const children=[];children[3]={id:'sparse-child',url:'https://example.test/sparse'};
  const bookmarks=[];bookmarks[2]={url:'https://example.test/parent',subBookmarks:children};bookmarks[6]={url:'https://example.test/later'};
  const data={bookmarks};for(const value of ['https://example.test/sparse','https://example.test/later','https://missing.test/'])assert.equal(navigation.findBookmarkByUrl(data,value),previous(data,value));
 });
 it('does not visit entries appended during an in-progress parent or child traversal',function(){
  function fixture(nested){
   const appended={id:'appended',url:'https://example.test/appended'};
   const entries=[{id:'getter',get url(){entries.push(appended);return'https://example.test/first';}}];
   return nested?{bookmarks:[{url:'https://example.test/parent',subBookmarks:entries}]}:{bookmarks:entries};
  }
  for(const nested of[false,true]){
   const expected=previous(fixture(nested),'https://example.test/appended');
   assert.equal(expected,null);assert.equal(navigation.findBookmarkByUrl(fixture(nested),'https://example.test/appended'),expected);
  }
 });
});

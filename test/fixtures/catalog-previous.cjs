'use strict';
// Representative older catalog and personal layout; never real browsing data.
const catalog=require('../../public/assets/heavenly-catalog');
module.exports=function(){
 const older=JSON.parse(JSON.stringify(catalog.release));older.version='fixture-previous';older.data.categories=older.data.categories.filter(c=>c.id!=='cat_games');older.data.categories.find(c=>c.id==='cat_movies').subSections=older.data.categories.find(c=>c.id==='cat_movies').subSections.filter(s=>s.id!=='naenae');older.data.bookmarks=older.data.bookmarks.filter(b=>b.categoryId!=='cat_games'&&b.subSectionId!=='naenae');older.data.bookmarks.find(b=>b.id==='bm_aether').subBookmarks.pop();
 const fixture=catalog.fresh(older);const anime=fixture.categories.find(c=>c.id==='cat_anime');anime.order=20;anime.side='left';anime.subSections.reverse();const ani=fixture.bookmarks.find(b=>b.id==='bm_anidb');ani.order=-20;ani.personalNote='My review note';const miruro=fixture.bookmarks.find(b=>b.id==='bm_miruro');miruro.categoryId='cat_movies';miruro.subSectionId='user';miruro.hidden=true;
 const aether=fixture.bookmarks.find(b=>b.id==='bm_aether');aether.subBookmarks.unshift({id:'catalog-fixture-mirror',title:'My personal mirror',url:'https://personal.test/mirror.svg',isUser:true,personalNote:'My mirror note'});aether.mirrorPreferences={preferred:'main',active:'main',order:['id:catalog-fixture-mirror','main']};
 return {fixture,anime,aether};
};

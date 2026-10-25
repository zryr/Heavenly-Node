(function (window) {
  'use strict';
  var catalog = window.HeavenlyCatalog, modal, previousFocus, review, shown = {};
  function el(tag, cls, text) { var node=document.createElement(tag); if(cls)node.className=cls; if(text)node.textContent=text; return node; }
  function seen(fingerprint) { try { return sessionStorage.getItem('heavenly_catalog_seen:'+fingerprint)==='true'; } catch(e) { return !!shown[fingerprint]; } }
  function remember() { if(!review)return; shown[review.fingerprint]=true; try{sessionStorage.setItem('heavenly_catalog_seen:'+review.fingerprint,'true');}catch(e){} }
  function refresh() {
    var pending, error;
    try { pending=catalog.pending(catalog.load(localStorage)); } catch(e){error=e;}
    document.querySelectorAll('[data-bookmark-updates]').forEach(function(button){
      button.dataset.pending=String(!!(pending&&pending.changes.length));
      button.textContent='Bookmark Updates'+(pending&&pending.changes.length?' · '+pending.changes.length:'');
      button.setAttribute('aria-label',pending&&pending.changes.length?'Review '+pending.changes.length+' bookmark updates':'Review bookmark updates');
      button.title=error?'Saved bookmarks need attention':'Review official bookmarks while keeping your layout';
    });
    var settings=document.getElementById("open-settings-btn");if(settings)settings.classList.toggle("has-catalog-updates",!!(pending&&pending.changes.length));
    return pending;
  }
  function close() {
    remember(); window.HeavenlyDialogs.close(modal);
    if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});
  }
  function show() {
    if(document.querySelector('.modal-backdrop.active:not(#catalog-update-modal)'))return;
    previousFocus=document.activeElement;
    if(!modal)build();
    var body=modal.querySelector('.catalog-release-details'), actions=modal.querySelector('.catalog-update-actions'), status=modal.querySelector('[role=status]');
    body.replaceChildren();body.tabIndex=0;body.setAttribute('aria-label','Bookmark update details');actions.replaceChildren();status.textContent='';
    try {
      var data=catalog.load(localStorage); review=catalog.pending(data);
      document.getElementById('catalog-update-title').textContent=review.changes.length?'Bookmark Updates Available':'Bookmark Updates';
      document.getElementById('catalog-update-description').textContent=review.changes.length?'Heavenly has new websites, sections, or bookmark updates available.':'Review the official collection and your saved update decisions.';
      var card=el('section','catalog-release'); card.setAttribute('aria-label','Catalog release');
      var meta=el('div','catalog-release-meta');meta.append(el('span','catalog-version','Version '+review.version));
      var date=el('time','',new Date(review.date+'T12:00:00Z').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}));date.dateTime=review.date;meta.append(date);card.append(meta);
      if(!review.changes.length) {
        card.append(el('h3','',data._catalog.lastDecision==='skipped'?'This version was skipped':'Your bookmarks are up to date'));
        card.append(el('p','',data._catalog.lastDecision==='skipped'?'Your collection is unchanged. Future releases can still offer new changes.':'New official websites and sections will appear here when available.'));
      } else {
        card.append(el('h3','','What’s new'));
        if(review.summary)card.append(el('p','catalog-release-summary',review.summary));
        var groups={};review.changes.forEach(function(change){var record=change.after||change.before, categoryId=record.kind==='category'?record.value.id:record.kind==='section'?record.parent:record.value.categoryId;
          if(!categoryId&&record.parent){var parent=catalog.records(catalog.defaults)['bookmark:'+record.parent];categoryId=parent&&parent.value.categoryId;}
          var category=catalog.defaults.categories.find(function(c){return c.id===categoryId;})||data.categories.find(function(c){return c.id===categoryId;});
          var title=category?category.title:'Links & mirrors';if(!groups[title])groups[title]=[];groups[title].push(change);
        });
        Object.keys(groups).forEach(function(title){card.append(el('h4','',title));var list=el('ul');groups[title].forEach(function(change){var record=change.after||change.before, kind=record.kind==='category'?'category':record.kind==='section'?'section':record.parent?(catalog.records(catalog.defaults)['bookmark:'+record.parent]||{value:{}}).value.url?'mirror':'link':'bookmark';var item=el('li','catalog-change '+change.kind),icon=el('span','catalog-change-icon',change.kind==='added'?'+':change.kind==='removed'?'−':'↻');icon.setAttribute('aria-hidden','true');item.append(icon,el('span','',(change.layoutOnly?'Official default order: ':(change.kind==='added'?'Added ':change.kind==='removed'?'Retired ':'Updated ')+kind+': ')+record.value.title));list.append(item);});card.append(list);});
      }
      body.append(card);
      body.append(el('p','catalog-preservation','Your order, moved bookmarks, hidden items, notes and mirror choices stay yours. Applying defaults makes them available to Restore Official Order; it does not reset your personal layout. Retired links are kept so personal data is safe.'));
      if(data._catalog.conflicts&&data._catalog.conflicts.length){var conflicts=el('ul','catalog-conflicts');data._catalog.conflicts.forEach(function(c){conflicts.append(el('li','',c.title+': '+c.message));});body.append(conflicts);}
      if(review.changes.length){
        button('Apply Update','catalog-apply',function(){decide('applied');});
        button('Maybe Later','catalog-later',close);
        button('Skip This Version','catalog-skip',function(){decide('skipped');});
      }else button('Done','catalog-later',close);
    } catch(e){review=null;status.textContent=e.message;button('Close','catalog-later',close);}
    window.HeavenlyDialogs.open(modal);modal.querySelector('.catalog-close').focus({preventScroll:true});
    function button(text,cls,callback){var b=el('button',cls,text);b.type='button';b.onclick=callback;actions.append(b);}
    function decide(decision){
      try{var result=catalog.commit(localStorage,decision,review.fingerprint);remember();close();refresh();
        if(typeof window.renderBookmarksUI==='function')window.renderBookmarksUI();
        if(typeof window.renderBookmarkManager==='function')window.renderBookmarkManager();
        window.dispatchEvent(new CustomEvent('heavenly:catalog-updated',{detail:{decision:decision}}));
        var notice=document.getElementById('catalog-update-status'); if(notice)notice.textContent=decision==='skipped'?'This version was skipped. Your bookmarks are unchanged.':'Bookmark update applied. Your layout was preserved.'+(result._catalog.conflicts.length?' Some changes need attention; review Bookmark Updates for details.':'');
      }catch(e){status.textContent='Could not save this update. Your previous bookmarks are safe. '+e.message;status.focus();}
    }
  }
  function build(){
    modal=el('div','modal-backdrop catalog-update-backdrop');modal.id='catalog-update-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','catalog-update-title');modal.setAttribute('aria-describedby','catalog-update-description');modal.setAttribute('aria-hidden','true');modal.inert=true;
    var card=el('div','modal-card catalog-update-card'),header=el('header','catalog-update-header'),heading=el('div');heading.append(el('span','catalog-eyebrow','HEAVENLY COLLECTION'));
    var title=el('h2','','Bookmark Updates Available');title.id='catalog-update-title';heading.append(title);var x=el('button','catalog-close','×');x.type='button';x.setAttribute('aria-label','Close bookmark updates');x.onclick=close;header.append(heading,x);
    var description=el('p','catalog-update-description','Heavenly has new websites, sections, or bookmark updates available.');description.id='catalog-update-description';
    var status=el('p','catalog-error');status.setAttribute('role','status');status.tabIndex=-1;
    card.append(header,description,el('div','catalog-release-details'),status,el('div','catalog-update-actions'),el('p','catalog-device-note','Saved in this browser. Other devices keep their own collection.'));
    modal.append(card);document.body.append(modal);
    modal.onclick=function(e){if(e.target===modal)close();};
    modal.addEventListener('keydown',function(e){
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
      if(e.key!=='Tab')return;
      var controls=Array.from(modal.querySelectorAll('button,[tabindex="0"]')).filter(function(n){return !n.disabled&&!n.closest('[inert]')&&n.getClientRects().length;});
      var first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
  }
  function init(){
    document.querySelectorAll('[data-bookmark-updates]').forEach(function(button){button.onclick=show;});
    var pending=refresh();
    if(document.body.dataset.catalogAuto==='true'&&pending&&pending.changes.length&&!seen(pending.fingerprint)){
      var attempts=0;function offer(){if(document.visibilityState==='hidden'||document.querySelector('.modal-backdrop.active')||document.getElementById('heavenly-loading-screen')&&getComputedStyle(document.getElementById('heavenly-loading-screen')).display!=='none'||document.getElementById('academy-decoy-root')&&getComputedStyle(document.getElementById('academy-decoy-root')).display!=='none'){if(++attempts<30)setTimeout(offer,1000);return;}var current=refresh();if(!current||!current.changes.length||seen(current.fingerprint))return;pending=current;remember();shown[pending.fingerprint]=true;try{sessionStorage.setItem('heavenly_catalog_seen:'+pending.fingerprint,'true');}catch(e){}show();}setTimeout(offer,900);
    }
  }
  window.HeavenlyCatalogUI={show:show,refresh:refresh};
  window.addEventListener('storage',function(e){if(e.key==='heavenly_bookmarks')refresh();});
  document.addEventListener('DOMContentLoaded',init);
}(window));

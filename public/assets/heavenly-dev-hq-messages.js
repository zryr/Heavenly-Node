/* Local message drafts. Publication always goes through reviewed repository sources. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./heavenly-messages'));
  else root.HeavenlyMessageWorkshop=factory(root.HeavenlyMessages);
}(typeof self!=='undefined'?self:this,function(Messages){
  'use strict';
  var storageKey='heavenly_dev_hq_messages_v1';
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function fail(message){throw new Error(message);}
  function actionIdentity(action){return action?JSON.stringify([action.type,action.scene||action.playlist]):'none';}
  function equivalent(a,b){
    function canonical(value){var item=clone(value);item.segments=item.segments.map(function(segment){return {text:segment.text,emphasis:!!segment.emphasis,gradient:segment.gradient||'none',link:segment.link||'',tooltip:segment.tooltip||''};});return item;}
    return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
  }
  function validateDraft(config,base){
    Messages.validateData(base);Messages.validateData(config);
    if(config.items.length!==base.items.length)fail('Keep every registered message entry; disable entries instead of deleting them.');
    config.items.forEach(function(item){
      var original=base.items.find(function(row){return row.id===item.id;});
      if(!original||item.kind!==original.kind)fail('Message IDs and kinds must match the registered collection.');
      if(actionIdentity(item.action)!==actionIdentity(original.action))fail('Keep the registered message action. Edit its wording and dialogue instead.');
    });
    return true;
  }
  function replace(config,item,base){
    validateDraft(config,base);var next=clone(config),at=next.items.findIndex(function(row){return row.id===item.id;});
    if(at<0)fail('Choose a registered message.');next.items[at]=clone(item);validateDraft(next,base);return next;
  }
  function move(config,id,index,base){
    validateDraft(config,base);var next=clone(config),at=next.items.findIndex(function(row){return row.id===id;});
    if(at<0||!Number.isSafeInteger(index)||index<0||index>=next.items.length)fail('Choose a valid message position.');
    next.items.splice(index,0,next.items.splice(at,1)[0]);validateDraft(next,base);return next;
  }
  function newer(value,previous){
    if(typeof value!=='string'||!/^\d{4}\.\d{1,2}\.\d{1,2}\.\d+$/.test(value))return false;
    var a=value.split('.').map(Number),b=previous.split('.').map(Number);
    for(var i=0;i<4;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;
  }
  function exportConfig(config,base,version,reviewed){
    if(reviewed!==true)fail('Review the preview, destinations and enabled entries, then check the review box.');
    validateDraft(config,base);if(!newer(version,base.version))fail('Choose a message version newer than '+base.version+'.');
    var next=clone(config);next.version=version;Messages.validateData(next);return JSON.stringify(next,null,2)+'\n';
  }
  function serialize(config,base){validateDraft(config,base);return JSON.stringify({schema:1,baseVersion:base.version,config:config});}
  function restore(raw,base){
    var value=JSON.parse(raw);
    if(!value||value.schema!==1||value.baseVersion!==base.version||Object.keys(value).some(function(key){return ['schema','baseVersion','config'].indexOf(key)<0;}))fail('The message draft belongs to a different source version or schema.');
    validateDraft(value.config,base);return clone(value.config);
  }
  function mount(options){
    var root=window,modal=options.modal,status=options.status,base=root.HeavenlyMessagesData;
    if(!Messages||!base)return null;
    Messages.validateData(base);
    var config=clone(base),selected=base.items[0].id,filter='all',search='',buffers={},undo=[],preview=null,storageBlocked=false,publishOpen=false,reviewed=false,dialogueOpen={};
    var reduced=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var versionParts=base.version.split('.');versionParts[3]=Number(versionParts[3])+1;var nextVersion=versionParts.join('.');
    var choices=Messages.choices||{themes:['default','purple','music','gold','warm','cutoff'],animations:['none','soft','sheen'],icons:['none','spark','headphones','cloud','paw'],gradients:['none','heavenly','monochrome','gold'],speakers:['You','Cloudy','Heavenly'],assets:['none','ao-side','ao-dance','khezu','doggy','anger']};
    function $(id){return document.getElementById(id);}
    function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    function option(value,label,current){return '<option value="'+esc(value)+'"'+(current===value?' selected':'')+'>'+esc(label)+'</option>';}
    function select(values,current){return values.map(function(value){return option(value,value.charAt(0).toUpperCase()+value.slice(1),current);}).join('');}
    function message(id){return config.items.find(function(item){return item.id===id;});}
    function pending(){return Object.keys(buffers).some(function(id){return !equivalent(buffers[id],message(id));});}
    function editedBuffers(){var result={};Object.keys(buffers).forEach(function(id){if(!equivalent(buffers[id],message(id)))result[id]=buffers[id];});return result;}
    function rememberFocus(){var node=document.activeElement;if(!node||!panel.contains(node))return null;return {id:node.id,action:node.dataset.messageAction};}
    function restoreFocus(focus){if(!focus)return;var node=focus.id?$(focus.id):focus.action?panel.querySelector('[data-message-action="'+focus.action+'"]'):null;if(node&&!node.disabled&&node.getClientRects().length)node.focus({preventScroll:true});}
    function remember(){undo.push(clone(config));if(undo.length>30)undo.shift();}
    function saveStorage(){
      if(storageBlocked){status('Draft kept in memory. The unreadable stored copy is preserved; export your edits or discard the local message draft explicitly.',true);return false;}
      try{root.localStorage.setItem(storageKey,serialize(config,base));return true;}
      catch(error){status('Message draft remains in memory. Browser storage could not save it: '+error.message,true);return false;}
    }
    try{var stored=root.localStorage.getItem(storageKey);if(stored)config=restore(stored,base);}
    catch(error){storageBlocked=true;status('Saved message draft was not loaded: '+error.message+' Its stored copy is untouched.',true);}
    var button=document.createElement('button');button.id='hq-tab-messages';button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-selected','false');button.setAttribute('aria-controls','hq-messages');button.tabIndex=-1;button.dataset.hqTab='messages';button.textContent='Homepage messages';
    modal.querySelector('.hq-tabs').insertBefore(button,$('hq-tab-changes'));
    var panel=document.createElement('section');panel.id='hq-messages';panel.className='hq-panel';panel.hidden=true;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','hq-tab-messages');modal.querySelector('.hq-content').appendChild(panel);
    function textOf(item){return item.segments.map(function(segment){return segment.text;}).join('');}
    function render(){
      var focus=rememberFocus();
      var visible=config.items.filter(function(item){return (filter==='all'||item.kind===filter)&&(!search||(item.id+' '+textOf(item)).toLowerCase().indexOf(search.toLowerCase())>=0);});
      if(visible.length&&!visible.some(function(item){return item.id===selected;}))selected=visible[0].id;
      panel.innerHTML='<h3>A little personality, carefully placed.</h3><p class="hq-note">Browse the registered homepage messages and rare scenes. Save wording and appearance changes in this browser, preview the real renderer, then export the JSON for repository review.</p><div class="hq-message-layout"><div class="hq-message-browser"><div class="hq-toolbar"><label><span class="hq-label">Message type</span><select id="hq-message-kind">'+option('all','All entries',filter)+option('ordinary','Ordinary messages',filter)+option('special','Special scenes',filter)+'</select></label><label><span class="hq-label">Find wording or ID</span><input id="hq-message-search" type="search" value="'+esc(search)+'" placeholder="Search messages"></label></div><ul id="hq-message-list" class="hq-list" aria-label="Registered homepage messages">'+visible.map(function(item){var at=config.items.indexOf(item),dirty=!equivalent(item,base.items.find(function(row){return row.id===item.id;}));return '<li><button type="button" data-message-select="'+esc(item.id)+'" aria-pressed="'+(item.id===selected)+'"'+(dirty?' class="hq-changed"':'')+'><span class="hq-item-number">'+(at+1)+'</span><span class="hq-item-copy"><strong>'+esc(textOf(item))+'</strong><small>'+esc(item.id)+' · '+esc(item.kind)+' · '+(item.enabled?'weight '+item.weight:'Disabled')+(buffers[item.id]&&!equivalent(buffers[item.id],item)?' · form edits':'')+'</small></span></button></li>';}).join('')+'</ul>'+(visible.length?'':'<p class="hq-empty">No registered messages match.</p>')+'<div class="hq-toolbar"><button type="button" data-message-action="up">↑ Up</button><button type="button" data-message-action="down">↓ Down</button><button type="button" data-message-action="undo"'+(!undo.length?' disabled':'')+'>Undo message edit</button></div><p class="hq-note">Order is the source order. Weight controls relative selection frequency among enabled entries; ordinary messages still run before rare scenes.</p><details class="hq-message-publish"><summary>Review & export message configuration</summary><div class="hq-edit"><label>Next message version<input id="hq-message-version" value="'+esc(nextVersion)+'" placeholder="2026.10.25.2"></label><p class="hq-note">Exports <code>public/assets/heavenly-messages.json</code>. Run the repository message generator, inspect the JSON and generated browser asset, and publish through a reviewed PR. Downloading does not publish.</p><label class="hq-message-check"><input id="hq-message-reviewed" type="checkbox">I reviewed wording, real link destinations, enabled entries and scene previews.</label><button id="hq-message-export" type="button" class="hq-primary" data-message-action="export">Export reviewed message JSON</button><label>Import a saved message configuration<input id="hq-message-import" type="file" accept="application/json,.json"></label><button type="button" class="hq-danger" data-message-action="discard">Discard local message draft…</button></div></details><p class="hq-stable">Local scope: '+esc(storageKey)+' only. Public messages and personal bookmarks stay unchanged. Unapplied form edits remain in memory while browsing.</p></div><div class="hq-message-work"><div class="hq-surface hq-message-preview-wrap"><div class="hq-row hq-message-preview-heading"><h4>Homepage preview</h4><label class="hq-message-check"><input id="hq-message-reduced" type="checkbox"'+(reduced?' checked':'')+'>Reduced motion</label></div><div id="hq-message-preview" class="hq-message-preview" aria-label="Isolated homepage message preview"></div><p id="hq-message-preview-scope" class="hq-stable">Saved local draft. Scene interactions stay inside this preview.</p><div class="hq-row"><button id="hq-message-preview-refresh" type="button" data-message-action="preview">Preview current form</button><button id="hq-message-trigger" type="button" data-message-action="trigger">Try scene / action</button></div></div><form id="hq-message-form" class="hq-surface hq-edit" novalidate>'+formHtml(buffers[selected]||message(selected))+'</form></div></div>';
      renderPreview(message(selected),false);
      var publication=panel.querySelector('.hq-message-publish');publication.open=publishOpen;$('hq-message-reviewed').checked=reviewed;
      if(panel.querySelector('.hq-message-dialogue'))panel.querySelector('.hq-message-dialogue').open=!!dialogueOpen[selected];
      restoreFocus(focus);
    }
    function formHtml(item){
      var action=item.action,html='<div><h4>'+esc(item.id)+'</h4><p class="hq-stable">'+esc(item.kind)+' · registered '+(action?action.type==='scene'?action.scene+' scene':action.playlist+' playlist':'message')+'</p></div><div class="hq-message-fields"><label class="hq-message-check"><input id="hq-message-enabled" type="checkbox"'+(item.enabled?' checked':'')+'>Enabled for publication</label><label>Selection weight<input id="hq-message-weight" type="number" min="0.1" max="10" step="0.1" value="'+esc(item.weight)+'"></label></div><div class="hq-message-fields"><label>Theme<select id="hq-message-theme">'+select(choices.themes,item.theme)+'</select></label><label>Animation<select id="hq-message-animation">'+select(choices.animations,item.animation)+'</select></label><label>Icon<select id="hq-message-icon">'+select(choices.icons,item.icon)+'</select></label></div><fieldset class="hq-message-segments"><legend>Message wording</legend><p class="hq-stable">Use up to 320 characters in total. Each text part can carry emphasis, a gradient or a safe destination.</p><div id="hq-message-segments">'+item.segments.map(segmentHtml).join('')+'</div><button type="button" data-message-action="add-segment">+ Add text part</button></fieldset><label>Reduced-motion fallback<textarea id="hq-message-fallback" maxlength="320">'+esc(item.reducedMotionText)+'</textarea></label>';
      if(action&&action.type==='scene')html+='<details class="hq-message-dialogue"><summary>Scene dialogue · '+action.steps.length+' lines</summary><p class="hq-note">These lines advance only when the visitor chooses Next. Assets come from the registered local scene collection.</p><div id="hq-message-steps">'+action.steps.map(stepHtml).join('')+'</div><button type="button" data-message-action="add-step">+ Add dialogue line</button></details>';
      html+='<div class="hq-row"><button id="hq-message-save" type="submit" class="hq-primary">Save message draft</button><button type="button" data-message-action="revert-form">Revert form</button></div><p class="hq-stable">IDs, message kinds and registered actions stay fixed. HTTPS links and the registered Settings / HTML Viewer routes are checked before preview, save, import and export.</p>';
      return html;
    }
    function segmentHtml(segment,index){return '<div class="hq-message-part" data-message-part="'+index+'"><label>Text part '+(index+1)+'<textarea data-segment-field="text" maxlength="320">'+esc(segment.text)+'</textarea></label><div class="hq-message-fields"><label class="hq-message-check"><input type="checkbox" data-segment-field="emphasis"'+(segment.emphasis?' checked':'')+'>Emphasis</label><label>Gradient<select data-segment-field="gradient">'+select(choices.gradients,segment.gradient||'none')+'</select></label></div><label>Link destination (optional)<input type="text" data-segment-field="link" value="'+esc(segment.link||'')+'" placeholder="https://… or /settings.html"></label><label>Hover / focus tip (optional)<input type="text" data-segment-field="tooltip" maxlength="160" value="'+esc(segment.tooltip||'')+'"></label><button type="button" data-message-action="remove-segment" data-message-index="'+index+'">Remove text part</button></div>';}
    function stepHtml(step,index){return '<div class="hq-message-part" data-message-step="'+index+'"><div class="hq-message-fields"><label>Speaker<select data-step-field="speaker">'+select(choices.speakers,step.speaker)+'</select></label><label>Local image<select data-step-field="asset">'+select(choices.assets,step.asset)+'</select></label></div><label>Dialogue line '+(index+1)+'<textarea data-step-field="text" maxlength="240">'+esc(step.text)+'</textarea></label><button type="button" data-message-action="remove-step" data-message-index="'+index+'">Remove dialogue line</button></div>';}
    function readForm(){
      var item=clone(message(selected));item.enabled=$('hq-message-enabled').checked;item.weight=Number($('hq-message-weight').value);item.theme=$('hq-message-theme').value;item.animation=$('hq-message-animation').value;item.icon=$('hq-message-icon').value;item.reducedMotionText=$('hq-message-fallback').value;
      item.segments=Array.prototype.map.call(panel.querySelectorAll('[data-message-part]'),function(row){var segment={};row.querySelectorAll('[data-segment-field]').forEach(function(input){var field=input.dataset.segmentField;segment[field]=field==='emphasis'?input.checked:input.value;});if(!segment.tooltip)delete segment.tooltip;return segment;});
      if(item.action&&item.action.type==='scene')item.action.steps=Array.prototype.map.call(panel.querySelectorAll('[data-message-step]'),function(row){var step={};row.querySelectorAll('[data-step-field]').forEach(function(input){step[input.dataset.stepField]=input.value;});return step;});
      return item;
    }
    function capture(){if($('hq-message-form'))buffers[selected]=readForm();}
    function validatedForm(){var item=readForm();replace(config,item,base);return item;}
    function renderPreview(item,form){
      if(preview)preview.destroy();preview=null;
      preview=Messages.renderPreview($('hq-message-preview'),clone(item),{reducedMotion:$('hq-message-reduced').checked,interactive:true,allowExternal:false});
      $('hq-message-preview-scope').textContent=form?'Current form preview · save to include these edits in the export. Interactions stay here.':'Saved local draft. Scene interactions stay inside this preview.';
      $('hq-message-trigger').disabled=!item.action;
    }
    function renderForm(){var focus=rememberFocus(),item=buffers[selected]||message(selected);$('hq-message-form').innerHTML=formHtml(item);var dialogue=panel.querySelector('.hq-message-dialogue');if(dialogue)dialogue.open=!!dialogueOpen[selected];restoreFocus(focus);}
    function update(messageText){reviewed=false;render();if(saveStorage())status(messageText);}
    function download(text){var blob=new Blob([text],{type:'application/json'}),url=root.URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='heavenly-messages.json';document.body.appendChild(link);link.click();link.remove();root.setTimeout(function(){root.URL.revokeObjectURL(url);},1000);}
    function handleAction(name,source){
      if(name==='preview'||name==='trigger'){capture();var candidate=validatedForm();renderPreview(candidate,true);if(name==='trigger'&&preview.activate)preview.activate();status('Validated preview uses the current form. Public rotation and visitor state are unchanged.');return;}
      if(name==='revert-form'){delete buffers[selected];renderForm();renderPreview(message(selected),false);status('Form returned to the saved local draft.');return;}
      if(name==='add-segment'||name==='remove-segment'||name==='add-step'||name==='remove-step'){
        capture();var item=buffers[selected],index=Number(source.dataset.messageIndex);
        if(name==='add-segment'){if(item.segments.length>=12)fail('Use at most twelve text parts.');item.segments.push({text:'',emphasis:false,gradient:'none',link:''});}
        if(name==='remove-segment'){if(item.segments.length===1)fail('Keep at least one text part.');item.segments.splice(index,1);}
        if(name==='add-step'){if(item.action.steps.length>=8)fail('Use at most eight dialogue lines.');item.action.steps.push({speaker:'Cloudy',text:'',asset:'none'});}
        if(name==='remove-step'){if(item.action.steps.length===1)fail('Keep at least one dialogue line.');item.action.steps.splice(index,1);}
        renderForm();return;
      }
      if(name==='up'||name==='down'){capture();var at=config.items.findIndex(function(item){return item.id===selected;}),to=at+(name==='up'?-1:1);if(to<0||to>=config.items.length)return;remember();config=move(config,selected,to,base);update('Message source order saved locally. Selection weights are unchanged.');return;}
      if(name==='undo'){if(!undo.length)return;capture();var edits=editedBuffers();config=undo.pop();buffers=edits;update('Last saved message edit undone. Unapplied form edits remain available.');return;}
      if(name==='export'){
        capture();if(pending())fail('Save or revert unapplied form edits before exporting.');nextVersion=$('hq-message-version').value.trim();var text=exportConfig(config,base,nextVersion,$('hq-message-reviewed').checked);download(text);status('Reviewed message JSON downloaded. Run the message generator and publish through a repository PR.');return;
      }
      if(name==='discard'){
        options.confirm('Discard local message draft','Discard only this browser’s message draft and unapplied message form edits? Published messages, rankings, Picks and personal bookmarks stay unchanged. Undo will remain available.',function(){root.localStorage.removeItem(storageKey);storageBlocked=false;remember();config=clone(base);buffers={};render();status('Local message draft discarded. Published messages remain unchanged. Undo is available.');});return;
      }
    }
    panel.addEventListener('click',function(event){
      var link=event.target.closest('#hq-message-preview a[href]');
      if(link){event.preventDefault();status('Validated preview destination: '+link.getAttribute('href')+'. Navigation is kept inside the review workflow.');return;}
      var target=event.target.closest('button');if(!target)return;
      try{
        if(target.dataset.messageSelect){capture();selected=target.dataset.messageSelect;render();$('hq-message-save').focus();return;}
        if(target.dataset.messageAction){event.preventDefault();handleAction(target.dataset.messageAction,target);}
      }catch(error){status(error.message,true);}
    });
    panel.addEventListener('auxclick',function(event){var link=event.target.closest('#hq-message-preview a[href]');if(link){event.preventDefault();status('Validated preview destination: '+link.getAttribute('href')+'. Navigation is kept inside the review workflow.');}});
    panel.addEventListener('toggle',function(event){if(event.target.classList.contains('hq-message-publish'))publishOpen=event.target.open;if(event.target.classList.contains('hq-message-dialogue'))dialogueOpen[selected]=event.target.open;},true);
    panel.addEventListener('submit',function(event){
      if(event.target.id!=='hq-message-form')return;event.preventDefault();capture();
      try{var item=validatedForm();remember();config=replace(config,item,base);delete buffers[selected];update('Message draft saved in this browser. Published homepage messages are unchanged.');}
      catch(error){status('Message was not saved: '+error.message,true);}
    });
    panel.addEventListener('input',function(event){
      if(event.target.id==='hq-message-search'){capture();search=event.target.value;var start=event.target.selectionStart;render();$('hq-message-search').focus();$('hq-message-search').setSelectionRange(start,start);}
      else if(event.target.id==='hq-message-version')nextVersion=event.target.value;
      else if(event.target.closest('#hq-message-form'))capture();
    });
    panel.addEventListener('change',function(event){
      try{
        if(event.target.id==='hq-message-kind'){capture();filter=event.target.value;render();}
        else if(event.target.id==='hq-message-reduced'){reduced=event.target.checked;capture();renderPreview(validatedForm(),true);}
        else if(event.target.id==='hq-message-reviewed')reviewed=event.target.checked;
        else if(event.target.id==='hq-message-import'&&event.target.files[0]){
          capture();if(pending())fail('Save or revert unapplied form edits before importing.');
          var file=event.target.files[0];if(file.size>1024*1024)fail('Message configuration must be smaller than 1 MB.');
          var reader=new FileReader();reader.onload=function(){try{capture();if(pending())fail('Save or revert unapplied form edits before importing.');var incoming=JSON.parse(reader.result);validateDraft(incoming,base);remember();config=clone(incoming);buffers={};update('Validated message configuration imported locally. Public messages are unchanged.');}catch(error){status('Message import refused: '+error.message,true);}};reader.onerror=function(){status('Message configuration could not be read. Current edits remain in place.',true);};reader.readAsText(file);
        }else if(event.target.closest('#hq-message-form'))capture();
      }catch(error){status(error.message,true);}
    });
    return {
      activate:function(){if(!panel.firstChild)render();else if(!preview)renderPreview(message(selected),false);},
      pause:function(){if(preview){preview.destroy();preview=null;}},
      summary:function(){return config.items.filter(function(item){return !equivalent(item,base.items.find(function(row){return row.id===item.id;}));}).length+' edited messages';}
    };
  }
  return {validateDraft:validateDraft,replace:replace,move:move,exportConfig:exportConfig,serialize:serialize,restore:restore,mount:mount,storageKey:storageKey};
}));

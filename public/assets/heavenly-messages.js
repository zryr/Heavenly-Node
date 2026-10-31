/* Small, data-driven homepage messages. Rendering never interprets authored HTML. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(null);
  else root.HeavenlyMessages = factory(root);
}(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var choices = {
    themes:['default','purple','music','gold','warm','cutoff'], animations:['none','soft','sheen'],
    icons:['none','spark','headphones','cloud','paw'], gradients:['none','heavenly','monochrome','gold','ocean'],
    playlists:['aura','hardstyle','hardtekk','favorites'], scenes:['purple-hulk','ao-oni','khezu','doggy'],
    speakers:['You','Cloudy','Heavenly','Hunter'], assets:['none','ao-side','ao-dance','khezu','doggy','anger','player','cloudy','cloudy-angry','hunter','you-neutral','you-suspicious','you-retro','cloudy-main','cloudy-speed-meme','cloudy-retro','hunter-smug'], imagePlacements:['left','right','inline']
  };
  var playlists = {
    aura:{title:'Aura Phonk',url:'https://open.spotify.com/playlist/5h7adrSdyEOPJJN0PljioK'},
    hardstyle:{title:'Hardstyle',url:'https://open.spotify.com/playlist/0tsLDxUYDVIhHYPeqdP015'},
    hardtekk:{title:'Hardtekk',url:'https://open.spotify.com/playlist/6asU2SoBz4duQ0rZaV20wI'},
    favorites:{title:'Favorite Songs',url:'https://open.spotify.com/playlist/5lDrWA2Ty2YTemqQ4OEMUj'}
  };
  var assets = {'ao-side':'ao-side.webp','ao-dance':'ao-dance.gif',khezu:'khezu.webp',doggy:'doggy.webp',anger:'anger.webp'};
  // Reversible catalog visibility; retained playlists remain editable in HQ.
  var config = {musicNotes:false};
  var portraitSlots = {"player": "you-neutral.webp", "cloudy": "cloudy-main.webp", "cloudy-angry": "cloudy-speed-meme.webp", "hunter": "hunter-smug.webp", "you-neutral": "you-neutral.webp", "you-suspicious": "you-suspicious.webp", "you-retro": "you-retro.webp", "cloudy-main": "cloudy-main.webp", "cloudy-speed-meme": "cloudy-speed-meme.webp", "cloudy-retro": "cloudy-retro.webp", "hunter-smug": "hunter-smug.webp"};
  var approvedPortraits = Object.create(null);
  Object.keys(portraitSlots).forEach(function (key) { approvedPortraits[key] = true; });
  function fail(message) { throw new Error(message); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function exact(value, keys, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(function (key) { return keys.indexOf(key) < 0; })) fail('Unexpected '+label+' fields.');
  }
  function bounded(value, max, label, optional) {
    if (typeof value !== 'string' || value.length > max || (!optional && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail(label+' must be readable text of at most '+max+' characters.');
  }
  function one(value, values, label) { if (values.indexOf(value) < 0) fail('Unsupported '+label+'.'); }
  function safeLink(value) {
    if (value === '/html-viewer.html' || value === '/settings.html') return true;
    if (typeof value !== 'string' || value.length > 2048 || /[\s\\]/.test(value)) return false;
    try { var url = new URL(value); return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password; } catch (error) { return false; }
  }
  function validateItem(item) {
    exact(item,['id','kind','enabled','weight','theme','animation','icon','reducedMotionText','segments','action','noteImage'],'message');
    if (typeof item.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(item.id)) fail('Messages need stable IDs.');
    one(item.kind,['ordinary','special'],'message kind');
    if (typeof item.enabled !== 'boolean' || !Number.isFinite(item.weight) || item.weight < .1 || item.weight > 10) fail('Use an enabled state and a weight from 0.1 to 10.');
    one(item.theme,choices.themes,'message theme'); one(item.animation,choices.animations,'message animation'); one(item.icon,choices.icons,'message icon');
    bounded(item.reducedMotionText,320,'Reduced-motion fallback');
    if (!Array.isArray(item.segments) || !item.segments.length || item.segments.length > 12) fail('Use 1–12 message segments.');
    var length = 0;
    item.segments.forEach(function (segment) {
      exact(segment,['text','emphasis','gradient','link','tooltip'],'segment'); bounded(segment.text,320,'Segment text'); length += segment.text.length;
      if (segment.emphasis !== undefined && typeof segment.emphasis !== 'boolean') fail('Segment emphasis must be true or false.');
      if (segment.gradient !== undefined) one(segment.gradient,choices.gradients,'segment gradient');
      if (segment.link !== undefined && segment.link !== '' && !safeLink(segment.link)) fail('Links require HTTPS without credentials, or an approved local page.');
      if (segment.tooltip !== undefined) { bounded(segment.tooltip,160,'Tooltip'); if (!segment.link) fail('Tooltips require a focusable link.'); }
    });
    if (length > 320) fail('A message may contain at most 320 characters.');
    if (item.noteImage !== undefined) { exact(item.noteImage,['asset','imagePlacement'],'note image'); one(item.noteImage.asset,choices.assets,'note asset'); one(item.noteImage.imagePlacement,choices.imagePlacements,'image placement'); }
    if (item.action === null) return true;
    if (!item.action || typeof item.action !== 'object') fail('Action must be null or a supported action.');
    if (item.kind !== 'special') fail('Interactive actions belong to special messages.');
    if (item.segments.some(function (segment) { return !!segment.link; })) fail('Interactive message actions cannot contain nested links.');
    if (item.action.type === 'playlist') { exact(item.action,['type','playlist'],'playlist action'); one(item.action.playlist,choices.playlists,'playlist'); }
    else if (item.action.type === 'scene') {
      exact(item.action,['type','scene','steps'],'scene action'); one(item.action.scene,choices.scenes,'scene');
      if (!Array.isArray(item.action.steps) || !item.action.steps.length || item.action.steps.length > 8) fail('Scenes need 1–8 dialogue steps.');
      item.action.steps.forEach(function (step) { exact(step,['speaker','text','asset','imagePlacement'],'dialogue step'); one(step.speaker,choices.speakers,'speaker'); bounded(step.text,240,'Dialogue'); one(step.asset,choices.assets,'scene asset'); if (step.imagePlacement !== undefined) one(step.imagePlacement,choices.imagePlacements,'image placement'); });
    } else fail('Unsupported message action.');
    return true;
  }
  function validateData(data) {
    exact(data,['schema','version','items'],'message data');
    if (data.schema !== 1 || typeof data.version !== 'string' || !/^\d{4}\.\d{1,2}\.\d{1,2}\.\d+$/.test(data.version)) fail('Unsupported message schema or version.');
    if (!Array.isArray(data.items) || !data.items.length || data.items.length > 100) fail('Use 1–100 messages.');
    var ids = {}, ordinary = false;
    data.items.forEach(function (item) { validateItem(item); if (ids[item.id]) fail('Messages need unique stable IDs.'); ids[item.id] = true; if (item.enabled && item.kind === 'ordinary') ordinary = true; });
    if (!ordinary) fail('Keep at least one ordinary message enabled.');
    return true;
  }
  function createSeededRandom(seed) {
    var number = 2166136261; String(seed).split('').forEach(function (letter) { number = Math.imul(number ^ letter.charCodeAt(0),16777619); });
    return function () { number += 0x6D2B79F5; var value = number; value = Math.imul(value ^ value >>> 15,value | 1); value ^= value + Math.imul(value ^ value >>> 7,value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; };
  }
  function cleanSceneRecord(value) { value = value && typeof value === 'object' ? value : {}; return {discovered:value.discovered === true,completed:value.completed === true,appearances:Number.isSafeInteger(value.appearances) && value.appearances >= 0 ? Math.min(value.appearances,1000000) : 0,autoOpen:value.autoOpen !== false,autoChoiceMade:value.autoChoiceMade === true}; }
  function normalizeSceneState(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema !== 1 || !value.scenes || typeof value.scenes !== 'object' || Array.isArray(value.scenes)) fail('Unsupported dialogue state schema.');
    exact(value,['schema','scenes'],'dialogue state');
    var normalized = {schema:1,scenes:Object.create(null)};
    Object.keys(value.scenes).forEach(function (id) {
      one(id,choices.scenes,'dialogue scene'); var record = value.scenes[id]; exact(record,['discovered','completed','appearances','autoOpen','autoChoiceMade'],'dialogue record');
      ['discovered','completed','autoOpen','autoChoiceMade'].forEach(function (field) { if (Object.prototype.hasOwnProperty.call(record,field) && typeof record[field] !== 'boolean') fail('Dialogue flags must be true or false.'); });
      if (record.appearances !== undefined && (!Number.isSafeInteger(record.appearances) || record.appearances < 0 || record.appearances > 1000000)) fail('Dialogue appearances must be a bounded whole number.');
      normalized.scenes[id] = cleanSceneRecord(record);
    });
    return normalized;
  }
  function createSceneStore(storage) {
    var records = Object.create(null), pending = Object.create(null), observed, observedOnce = false, writeBlocked = false, key = 'heavenly_dialogue_state_v1';
    function refresh() {
      try {
        var raw = storage.getItem(key); if (observedOnce && raw === observed) return;
        var fresh;
        try { fresh = raw ? normalizeSceneState(JSON.parse(raw)).scenes : Object.create(null); }
        catch (invalidState) { writeBlocked = true; observed = raw; observedOnce = true; return; }
        if (writeBlocked) pending = Object.create(null);
        writeBlocked = false;
        // A denied write still has a usable local result; retain it while adopting
        // other scenes written by another tab or an explicit settings import.
        Object.keys(pending).forEach(function (id) { fresh[id] = cleanSceneRecord(pending[id]); });
        records = fresh; observed = raw; observedOnce = true;
      } catch (error) {}
    }
    function read(id) { one(id,choices.scenes,'scene'); refresh(); return cleanSceneRecord(records[id]); }
    function update(id,changes) { var record = read(id); ['discovered','completed','autoOpen','autoChoiceMade'].forEach(function (field) { if (typeof changes[field] === 'boolean') record[field] = changes[field]; }); if (changes.appearance) record.appearances = Math.min(record.appearances+1,1000000); records[id] = record; if (writeBlocked) { pending[id] = clone(record); return clone(record); } try { var serialized = JSON.stringify({schema:1,scenes:records}); storage.setItem(key,serialized); observed = serialized; observedOnce = true; pending = Object.create(null); } catch (error) { pending[id] = clone(record); } return clone(record); }
    return {read:read,update:update};
  }
  function ordinaryEligible(item) { return config.musicNotes || !(item.action && item.action.type === 'playlist' || item.theme === 'music' || item.icon === 'headphones'); }
  function createController(options) {
    options = options || {}; validateData(options.data);
    var items = clone(options.data.items), random = options.random || Math.random, clock = options.now || Date.now;
    var setTimer = options.setTimeout || setTimeout, clearTimer = options.clearTimeout || clearTimeout;
    var timer = null, started = 0, remaining = 0, current = null, counts = {}, pauses = {}, destroyed = false, changes = 0;
    function rng() { var value = Number(random()); return Number.isFinite(value) ? Math.max(0,Math.min(.999999999,value)) : 0; }
    function state() { return {id:current && current.id,kind:current && current.kind,paused:Object.keys(pauses).length > 0,reasons:Object.keys(pauses),remaining:timer === null ? remaining : Math.max(0,remaining-(clock()-started)),changes:changes,counts:clone(counts),destroyed:destroyed}; }
    function stop() { if (timer !== null) { clearTimer(timer); timer = null; remaining = Math.max(0,remaining-(clock()-started)); } }
    function schedule() { if (destroyed || timer !== null || Object.keys(pauses).length) return; started = clock(); timer = setTimer(function () { timer = null; remaining = 0; advance(); },remaining); }
    function eligible(kind) { return items.filter(function (item) { return item.enabled && item.kind === kind && ordinaryEligible(item) && (!options.isEligible || options.isEligible(item)); }); }
    function select(kind) {
      var pool = eligible(kind);
      if (pool.length > 1 && current) pool = pool.filter(function (item) { return item.id !== current.id; });
      if (!pool.length) pool = eligible('ordinary');
      // Weighted least-seen selection gives every enabled entry a turn and avoids
      // long random droughts. Counts remain in memory, never browsing history.
      var lowest = Math.min.apply(null,pool.map(function (item) { return (counts[item.id] || 0) / item.weight; }));
      pool = pool.filter(function (item) { return (counts[item.id] || 0) / item.weight <= lowest + 1e-8; });
      var total = pool.reduce(function (sum,item) { return sum + item.weight; },0), pick = rng()*total;
      for (var index = 0; index < pool.length; index++) { pick -= pool[index].weight; if (pick < 0) return pool[index]; }
      return pool[pool.length-1];
    }
    function display(item) {
      if (destroyed || !item) return;
      stop(); current = item; counts[item.id] = (counts[item.id] || 0)+1; changes++;
      remaining = 12000 + Math.floor(rng()*3001); schedule();
      if (options.onChange) options.onChange(clone(item),state());
    }
    function advance() {
      if (destroyed) return;
      var kind = current && current.kind !== 'special' && eligible('special').length && rng() < .12 ? 'special' : 'ordinary';
      display(select(kind));
    }
    function setPaused(reason, value) {
      if (destroyed) return;
      if (typeof reason !== 'string' || !reason) fail('Pause needs a reason.');
      if (value) { stop(); pauses[reason] = true; } else { delete pauses[reason]; schedule(); }
      if (options.onState) options.onState(state());
    }
    display(select('ordinary'));
    return {next:advance,pause:function () { setPaused('user',true); },resume:function () { setPaused('user',false); },setPaused:setPaused,getState:state,
      getCurrent:function () { return clone(current); },show:function (id) { var item = items.find(function (entry) { return entry.id === id; }); if (!item) fail('Unknown message ID.'); display(item); },
      destroy:function () { stop(); destroyed = true; }};
  }
  function element(doc, name, className, text) { var node = doc.createElement(name); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function motionReduced(options) { return !!(options && options.reducedMotion || root && root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function icon(doc, name) {
    var paths = {headphones:'M3 14v-3a9 9 0 0 1 18 0v3M3 13h4v8H3zM17 13h4v8h-4z',cloud:'M7 19a5 5 0 0 1-1-10 7 7 0 0 1 13 2 4 4 0 0 1 0 8H7z',spark:'m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z',paw:'M7 14c-3 3-2 7 1 6l4-1 4 1c3 1 4-3 1-6-2-3-8-3-10 0M5 7v2M10 4v3M15 4v3M20 7v2'};
    var svg = doc.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
    var path = doc.createElementNS(svg.namespaceURI,'path'); path.setAttribute('d',paths[name] || paths.spark); svg.appendChild(path); return svg;
  }
  function sceneImage(doc,asset,speaker,className,reduced) {
    if (!asset || asset === 'none') return null;
    var src = assets[asset], label = {player:'You',cloudy:'Cloudy','cloudy-angry':'Cloudy',hunter:'Hunter'}[asset] || speaker || '';
    if (portraitSlots[asset]) src = approvedPortraits[asset] ? 'portraits/'+portraitSlots[asset] : null;
    if (asset === 'ao-dance') src = reduced ? 'ao-still.webp' : assets[asset];
    if (!src) { var fallback = element(doc,'span',className+' hm-portrait-fallback',label); fallback.setAttribute('role','img'); fallback.setAttribute('aria-label',label+' portrait pending artwork'); return fallback; }
    var image = element(doc,'img',className); image.src = '/assets/messages/'+src; image.alt = {anger:'angry reaction','ao-side':'Ao Oni giving a side-eye',doggy:'Syshi’s orange and white Doggy plush',khezu:'Khezu plush','ao-dance':'Ao Oni dance'}[asset] || label; if (/retro/.test(asset)) image.classList.add('hm-pixel-portrait'); image.width = 192; image.height = 192; image.decoding = 'async';
    image.addEventListener('error',function () { var fallback = element(doc,'span',className+' hm-portrait-fallback',label); fallback.setAttribute('role','img'); fallback.setAttribute('aria-label',label+' portrait unavailable'); image.replaceWith(fallback); },{once:true});
    return image;
  }
  function renderCopy(container,item,options) {
    validateItem(item); options = options || {}; var doc = container.ownerDocument;
    container.replaceChildren(); container.dataset.messageId = item.id; container.dataset.messageKind = item.kind; container.dataset.messageTheme = item.theme;
    container.classList.add('hm-message'); container.dataset.messageAnimation = motionReduced(options) ? 'none' : item.animation;
    var copy = element(doc,item.action?'button':'span','hm-copy'); copy.dataset.messageText = ''; if (item.action) { copy.type = 'button'; copy.setAttribute('aria-haspopup','dialog'); }
    if (item.action && item.action.type === 'scene') {
      var stickerAsset = item.action.scene === 'doggy' ? 'doggy' : item.action.scene === 'khezu' ? 'khezu' : 'ao-side';
      var sticker = sceneImage(doc,stickerAsset,'','hm-sticker',true); sticker.alt = ''; sticker.loading = 'lazy'; copy.appendChild(sticker);
    } else if (item.icon !== 'none') copy.appendChild(icon(doc,item.icon));
    var words = element(doc,'span','hm-words');
    var segments = motionReduced(options) && item.reducedMotionText !== item.segments.map(function (segment) { return segment.text; }).join('') && !item.segments.some(function (segment) { return !!segment.link; }) ? [{text:item.reducedMotionText}] : item.segments;
    segments.forEach(function (segment,index) {
      var wrapper = segment.tooltip ? element(doc,'span','hm-tooltip-wrap') : null;
      var part = element(doc,segment.link?'a':segment.emphasis?'strong':'span','hm-segment',segment.text);
      if (segment.gradient && segment.gradient !== 'none') part.dataset.gradient = segment.gradient;
      if (segment.link) { part.href = segment.link; if (/^https:/i.test(segment.link)) { part.target = '_blank'; part.rel = 'noopener noreferrer'; part.setAttribute('aria-label',segment.text+' (opens in a new tab)'); } }
      if (wrapper) { var tip = element(doc,'span','hm-tooltip',segment.tooltip); tip.id = 'hm-tip-'+item.id+'-'+index+'-'+(++renderCopy.sequence); tip.setAttribute('role','tooltip'); part.setAttribute('aria-describedby',tip.id); wrapper.append(part,tip); words.appendChild(wrapper); }
      else words.appendChild(part);
    });
    copy.appendChild(words);
    if (item.noteImage && item.noteImage.asset !== 'none') { var reaction = sceneImage(doc,item.noteImage.asset,'','hm-note-image',true); reaction.dataset.imagePlacement = item.noteImage.imagePlacement; if (item.noteImage.imagePlacement === 'inline') words.appendChild(reaction); else if (item.noteImage.imagePlacement === 'left') copy.prepend(reaction); else copy.appendChild(reaction); }
    container.appendChild(copy);
    if (item.action) copy.addEventListener('click',function () { if (options.onAction) options.onAction(item,copy); });
    return copy;
  }
  renderCopy.sequence = 0;
  function openExperience(host,item,options) {
    options = options || {}; validateItem(item); var doc = host.ownerDocument, isPreview = !!options.preview, reduced = motionReduced(options), isScene = item.action.type === 'scene';
    var focusBefore = doc.activeElement, dialog = element(doc,isPreview?'section':'dialog','hm-dialog'), closed = false, finishing = false, timer = null, typingTimer = null, fadeTimer = null, burst = null, stepIndex = 0, burstMode = false, typing = false, line = null, typedCopy = null, box = null, fullText = '', headphonesDismissed = options.headphoneAdvice === false;
    var replay = !!options.completed, presentation = isScene && item.action.scene === 'ao-oni' ? 'retro' : 'novel';
    dialog.dataset.messageTheme = item.theme; dialog.id = isPreview ? '' : 'heavenly-message-dialog';
    if (isScene) { dialog.dataset.presentation = presentation; dialog.dataset.sceneName = item.action.scene; dialog.dataset.sceneReplay = String(replay); }
    dialog.setAttribute('aria-label',isScene ? 'Heavenly character scene' : 'Playlist suggestion');
    if (isPreview) { dialog.classList.add('hm-dialog-preview'); dialog.setAttribute('role','region'); }
    var header = element(doc,'div','hm-dialog-header'), title = element(doc,'h2','hm-dialog-title'), close = element(doc,'button','hm-close','Close'); close.type = 'button'; close.dataset.sceneClose = '';
    header.append(title,close); var content = element(doc,'div','hm-dialog-content'), actions = element(doc,'div','hm-dialog-actions'); dialog.append(header,content,actions); host.appendChild(dialog);
    close.hidden = isScene && !replay;
    function stopTyping() { if (typingTimer !== null) { clearTimeout(typingTimer); typingTimer = null; } typing = false; dialog.dataset.typing = 'false'; }
    function clearBurst() { if (timer !== null) { clearTimeout(timer); timer = null; } if (burst) { burst.remove(); burst = null; } }
    function finish(immediate) {
      if (closed) return;
      if (!immediate && isScene && !reduced && !isPreview && !finishing) { finishing = true; stopTyping(); clearBurst(); dialog.classList.add('hm-fading'); fadeTimer = setTimeout(function () { finish(true); },200); return; }
      closed = true; stopTyping(); clearBurst(); if (fadeTimer !== null) clearTimeout(fadeTimer); dismissHeadphones(); doc.removeEventListener('visibilitychange',hidden); doc.removeEventListener('keydown',keyboard,true);
      if (media && media.removeEventListener) media.removeEventListener('change',preference);
      var activeBeforeClose = doc.activeElement, returnFocus = !burstMode || dialog.contains(activeBeforeClose);
      if (dialog.open) dialog.close(); dialog.remove();
      if (options.onClose) options.onClose();
      var returnTarget = options.returnFocus ? options.returnFocus() : focusBefore;
      if (returnFocus && returnTarget && returnTarget.isConnected && !isPreview) returnTarget.focus({preventScroll:true});
      else if (burstMode && activeBeforeClose && activeBeforeClose.isConnected && activeBeforeClose !== doc.body && !isPreview) activeBeforeClose.focus({preventScroll:true});
    }
    function complete() { if (options.onComplete) options.onComplete(); if (item.action.scene === 'ao-oni') renderBurst(); else finish(false); }
    function hidden() { if (doc.visibilityState === 'hidden') finish(true); }
    function preference() { if (media.matches) { reduced = true; stopTyping(); if (burstMode) renderBurst(); else if (typedCopy) { typedCopy.textContent = fullText; line.dataset.complete = 'true'; } } }
    var media = root && root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');
    if (media && media.addEventListener) media.addEventListener('change',preference);
    function button(label,callback,key) { var node = element(doc,'button','hm-button',label); node.type = 'button'; if (key) node.dataset[key] = ''; node.addEventListener('click',callback); actions.appendChild(node); return node; }
    function dismissHeadphones() { if (item.action.type === 'playlist' && !headphonesDismissed) { headphonesDismissed = true; if (options.onHeadphoneDismiss) options.onHeadphoneDismiss(); } }
    function renderPlaylist(key) {
      var playlist = playlists[key], followups = false, advice = null;
      title.textContent = playlist.title; dialog.dataset.playlist = key; dialog.dataset.messageTheme = key === 'favorites' ? 'gold' : 'music'; content.replaceChildren(icon(doc,'headphones')); actions.replaceChildren();
      content.appendChild(element(doc,'p','hm-dialog-line',key === 'favorites' ? 'A few songs Syshi keeps coming back to.' : 'A little music, if you’re in the mood.'));
      if (!headphonesDismissed) { advice = element(doc,'p','hm-headphone-advice','For the full sound, try listening with headphones or both earbuds.'); content.appendChild(advice); }
      content.appendChild(element(doc,'p','hm-dialog-note','Spotify opens only when you choose Open Playlist. No music plays here.'));
      if (options.onPlaylistVisit) options.onPlaylistVisit(key);
      var open = element(doc,'a','hm-button hm-primary','Open Playlist'); open.href = playlist.url; open.target = '_blank'; open.rel = 'noopener noreferrer'; open.setAttribute('aria-label','Open '+playlist.title+' playlist on Spotify (opens in a new tab)'); actions.appendChild(open);
      function explore() {
        dismissHeadphones(); if (advice) { advice.remove(); advice = null; }
        if (followups || key === 'favorites') { finish(); return; }
        followups = true; proceed.textContent = 'Done';
        content.appendChild(element(doc,'p','hm-playlist-followup',key === 'aura' ? 'Want a different kind of energy? Pick one to preview.' : 'One more option, if you’re curious: Syshi’s favorites.'));
        (key === 'aura' ? ['hardstyle','hardtekk'] : ['favorites']).forEach(function (nextKey) {
          button('Explore '+playlists[nextKey].title,function () { renderPlaylist(nextKey); if (!isPreview) actions.firstChild.focus(); },'playlistNext');
        });
      }
      if ((isPreview || options.temporary) && !options.allowExternal) { open.removeAttribute('href'); open.setAttribute('aria-disabled','true'); open.title = 'External navigation is disabled in this preview'; }
      else open.addEventListener('click',function () { if (options.onPlaylistOpen) options.onPlaylistOpen(key); if (key === 'favorites') { dismissHeadphones(); timer = setTimeout(finish,0); } else if (!followups) explore(); });
      var proceed = button('Continue Without Opening',explore,'sceneSkip');
    }
    function renderBurst() {
      if (closed || finishing) return;
      stopTyping(); clearBurst(); burstMode = true; content.replaceChildren(); actions.replaceChildren();
      dialog.classList.add('hm-burst-scene'); dialog.dataset.typing = 'false';
      content.appendChild(element(doc,'p','hm-dialog-line','you know ball now'));
      burst = element(doc,'div','hm-dance-burst'); burst.setAttribute('aria-hidden','true');
      if (reduced) { var still = sceneImage(doc,'ao-dance','','hm-scene-image',true); burst.appendChild(still); }
      else for (var index = 0; index < 5; index++) { var dancer = sceneImage(doc,'ao-dance','','hm-dancer',false); dancer.alt = ''; dancer.style.setProperty('--hm-index',index); burst.appendChild(dancer); }
      content.appendChild(burst);
      timer = setTimeout(function () { finish(false); },reduced ? 1100 : 2300);
    }
    function reveal() { stopTyping(); typedCopy.textContent = fullText; line.dataset.complete = 'true'; }
    function advance() {
      if (closed || finishing || burstMode) return;
      if (typing) { reveal(); return; }
      if (stepIndex < item.action.steps.length-1) { stepIndex++; renderStep(); if (!isPreview) box.focus({preventScroll:true}); }
      else complete();
    }
    function typeLine() {
      stopTyping(); typedCopy.textContent = ''; line.dataset.complete = 'false';
      if (reduced) { reveal(); return; }
      var letters = Array.from(fullText), at = 0; typing = true; dialog.dataset.typing = 'true';
      function tick() { if (closed || finishing || !typing) return; at = Math.min(at+1,letters.length); typedCopy.textContent = letters.slice(0,at).join(''); if (at >= letters.length) { stopTyping(); line.dataset.complete = 'true'; } else typingTimer = setTimeout(tick,27); }
      tick();
    }
    function renderStep() {
      stopTyping(); clearBurst(); var step = item.action.steps[stepIndex], placement = step.imagePlacement || (step.asset === 'ao-side' ? 'right' : 'left');
      title.textContent = item.action.scene === 'purple-hulk' ? 'Purple Hulk?' : item.action.scene === 'doggy' ? 'A moment with Doggy' : item.action.scene === 'khezu' ? 'More than a Khezu…' : 'oh look its ao oni';
      content.replaceChildren(); actions.replaceChildren(); dialog.dataset.sceneStep = String(stepIndex);
      box = element(doc,'button','hm-scene-box'); box.type = 'button'; box.dataset.sceneAdvance = ''; box.setAttribute('aria-label',step.speaker+': '+step.text+' · Reveal current line or continue dialogue'); box.dataset.imagePlacement = placement;
      var speech = element(doc,'span','hm-speech'), name = element(doc,'span','hm-speaker',step.speaker);
      line = element(doc,'span','hm-dialog-line'); fullText = step.text; typedCopy = element(doc,'span','hm-typed-copy'); line.appendChild(typedCopy);
      var lineStack = element(doc,'span','hm-line-stack'), reserve = element(doc,'span','hm-text-reserve',fullText); reserve.setAttribute('aria-hidden','true'); lineStack.append(reserve,line);
      // Assistive technology receives the complete line once, rather than every character.
      line.setAttribute('aria-hidden','true'); var accessibleLine = element(doc,'span','hm-sr',fullText); accessibleLine.setAttribute('aria-live','polite'); accessibleLine.setAttribute('aria-atomic','true');
      speech.append(name,lineStack,accessibleLine);
      var image = sceneImage(doc,step.asset,step.speaker,'hm-scene-image',reduced);
      if (image) image.dataset.imagePlacement = placement;
      if (image) { if (placement === 'inline') { image.classList.add('hm-inline-reaction'); line.appendChild(image); } else if (placement === 'right') { box.appendChild(speech); box.appendChild(image); } else box.appendChild(image); }
      if (!speech.parentNode) box.appendChild(speech);
      // The arrow shares the entire generous box target. No nested button or debug Next.
      var arrow = element(doc,'span','hm-advance-arrow'); arrow.setAttribute('aria-hidden','true'); box.appendChild(arrow);
      box.addEventListener('click',advance); content.appendChild(box);
      var hint = element(doc,'p','hm-scene-hint','Tap to reveal or continue · Esc to return'); content.appendChild(hint);
      if(item.action.scene==='khezu'&&stepIndex===2&&!reduced){typing=true;dialog.dataset.typing='true';typingTimer=setTimeout(typeLine,180);}else typeLine();
      if (image && placement === 'inline') { var reserveImage = element(doc,'span','hm-inline-reaction'); reserve.appendChild(reserveImage); }
    }
    if (!isScene) renderPlaylist(item.action.playlist); else renderStep();
    function keyboard(event) {
      if (closed || isPreview || !dialog.open) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); finish(true); return; }
      // Enter/Space are native button activation only: never a global shortcut.
      if (event.key === 'Tab') { var nodes = Array.prototype.slice.call(dialog.querySelectorAll('button,a[href]')).filter(function (node) { return !node.hidden && !node.disabled && node.getClientRects().length; }), first = nodes[0], last = nodes[nodes.length-1]; if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); } }
    }
    close.addEventListener('click',function () { finish(false); }); dialog.addEventListener('cancel',function (event) { event.preventDefault(); finish(true); });
    dialog.addEventListener('click',function (event) { if (event.target === dialog) { var rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) finish(true); } });
    doc.addEventListener('visibilitychange',hidden); doc.addEventListener('keydown',keyboard,true);
    if (!isPreview) { dialog.showModal(); (isScene ? box : close).focus({preventScroll:true}); }
    return {destroy:function () { finish(true); }};
  }
  function renderPreview(container,item,options) {
    options = options || {}; validateItem(item); var owned = element(container.ownerDocument,'div','hm-preview'), scene = null;
    container.appendChild(owned);
    function activate() { if (!item.action) return; if (scene) scene.destroy(); scene = openExperience(owned,item,{preview:true,reducedMotion:options.reducedMotion,allowExternal:!!options.allowExternal,onClose:function () { scene = null; }}); }
    var copy = element(container.ownerDocument,'div'); owned.appendChild(copy);
    renderCopy(copy,item,{reducedMotion:options.reducedMotion,onAction:function () { if (options.onAction) options.onAction(item); if (options.interactive) activate(); }});
    if (!options.allowExternal) { var blockNavigation = function (event) { var link = event.target.closest('a[href]'); if (link && copy.contains(link)) { event.preventDefault(); if (options.onNavigate) options.onNavigate(link.getAttribute('href')); } }; copy.addEventListener('click',blockNavigation); copy.addEventListener('auxclick',blockNavigation); }
    return {activate:activate,destroy:function () { if (scene) scene.destroy(); owned.remove(); }};
  }
  function mount(container,options) {
    options = options || {}; var doc = container.ownerDocument, data = options.data || root.HeavenlyMessagesData; validateData(data);
    var storage = options.storage, session = options.sessionStorage, controller, scene = null, destroyed = false, dismissed = {}, userPaused = false, headphonesDismissed = false, listeners = [], observer, mutation, previewItem = null, previewOptions = null;
    try { storage = storage || root.localStorage; userPaused = storage.getItem('heavenly_messages_paused') === 'true'; } catch (error) {}
    try { session = session || root.sessionStorage; headphonesDismissed = session.getItem('heavenly_messages_headphones_dismissed_v1') === 'true'; var saved = JSON.parse(session.getItem('heavenly_messages_dismissed_v1') || '[]'); if (Array.isArray(saved)) saved.slice(0,100).forEach(function (id) { if (typeof id === 'string') dismissed[id] = true; }); } catch (error) {}
    var sceneStore = createSceneStore(storage);
    container.classList.add('hm-host'); container.setAttribute('aria-label','Heavenly messages'); container.replaceChildren();
    var line = element(doc,'div','hm-message-slot'), controls = element(doc,'div','hm-controls'), next = element(doc,'button','','Next'), pause = element(doc,'button','','Pause'), status = element(doc,'span','hm-sr');
    next.type = pause.type = 'button'; next.dataset.messageNext = ''; pause.dataset.messagePause = ''; next.setAttribute('aria-label','Next homepage message'); pause.setAttribute('aria-label','Pause homepage messages'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); controls.append(next,pause); container.append(line,controls,status);
    function listen(node,name,callback,settings) { node.addEventListener(name,callback,settings); listeners.push(function () { node.removeEventListener(name,callback,settings); }); }
    function blockPreviewNavigation(event) { if (previewItem && event.target.closest('a[href]')) event.preventDefault(); }
    listen(line,'click',blockPreviewNavigation); listen(line,'auxclick',blockPreviewNavigation);
    function update(state) {
      var paused = state.reasons.indexOf('user') >= 0, label = paused?'Resume':'Pause', pressed = String(paused), anyPause = String(state.paused);
      // Preserve the current text node during pointer/focus transitions. WebKit
      // can cancel the pending click when its down target is replaced on focus.
      if (pause.textContent !== label) pause.textContent = label;
      if (pause.getAttribute('aria-label') !== label+' homepage messages') pause.setAttribute('aria-label',label+' homepage messages');
      if (pause.getAttribute('aria-pressed') !== pressed) pause.setAttribute('aria-pressed',pressed);
      if (container.dataset.messagePaused !== anyPause) container.dataset.messagePaused = anyPause;
    }
    function dismiss(id) { dismissed[id] = true; try { session.setItem('heavenly_messages_dismissed_v1',JSON.stringify(Object.keys(dismissed))); } catch (error) {} }
    function render(item,state) {
      var current = previewItem || item;
      renderCopy(line,current,{reducedMotion:previewOptions && previewOptions.reducedMotion,onAction:activate});
      if (!previewItem && current.action && current.action.type === 'scene') {
        var savedScene = sceneStore.read(current.action.scene);
        if (!savedScene.discovered) { line.classList.add('hm-discovery'); sceneStore.update(current.action.scene,{discovered:true}); }
        else line.classList.remove('hm-discovery');
      } else line.classList.remove('hm-discovery');
      update(state);
    }
    function activate() {
      if (destroyed || scene) return; var item = previewItem || controller.getCurrent(); if (!item.action) return;
      var temporary = !!previewItem, savedScene = item.action.type === 'scene' ? sceneStore.read(item.action.scene) : null;
      if (savedScene && !temporary) sceneStore.update(item.action.scene,{appearance:true});
      controller.setPaused('dialog',true);
      scene = openExperience(doc.body,item,{temporary:temporary,allowExternal:!temporary,completed:savedScene && savedScene.completed,reducedMotion:temporary && previewOptions.reducedMotion,returnFocus:function () { return line.querySelector('[data-message-text]'); },headphoneAdvice:!headphonesDismissed,
        onComplete:function () { if (!temporary && item.action.type === 'scene') sceneStore.update(item.action.scene,{completed:true}); },
        onHeadphoneDismiss:function () { if (temporary) return; headphonesDismissed = true; try { session.setItem('heavenly_messages_headphones_dismissed_v1','true'); } catch (error) {} },
        onPlaylistVisit:function (key) { if (!temporary) data.items.forEach(function (entry) { if (entry.action && entry.action.type === 'playlist' && entry.action.playlist === key) dismiss(entry.id); }); },
        onClose:function () { scene = null; if (!temporary && item.action.type === 'playlist') dismiss(item.id); controller.setPaused('dialog',false); },
        onPlaylistOpen:function () { status.textContent = 'Playlist opened in Spotify.'; }});
    }
    controller = createController({data:data,random:options.random,now:options.now,setTimeout:options.setTimeout,clearTimeout:options.clearTimeout,isEligible:function (item) { return item.kind !== 'special' || item.action && item.action.type === 'scene' || !dismissed[item.id]; },onChange:render,onState:update});
    function visible() { controller.setPaused('hidden',doc.visibilityState === 'hidden'); }
    function detached() { if (!container.isConnected) api.destroy(); }
    listen(next,'click',function () { controller.next(); status.textContent = controller.getCurrent().segments.map(function (segment) { return segment.text; }).join(''); });
    listen(pause,'click',function () { userPaused = !userPaused; controller.setPaused('user',userPaused); try { storage.setItem('heavenly_messages_paused',String(userPaused)); } catch (error) {} status.textContent = userPaused?'Homepage messages paused.':'Homepage messages resumed.'; });
    listen(container,'mouseenter',function () { controller.setPaused('hover',true); }); listen(container,'mouseleave',function () { controller.setPaused('hover',false); });
    listen(container,'focusin',function () { controller.setPaused('focus',true); }); listen(container,'focusout',function (event) { if (!container.contains(event.relatedTarget)) controller.setPaused('focus',false); });
    listen(doc,'visibilitychange',visible); listen(root,'pagehide',function () { if (scene) scene.destroy(); controller.setPaused('page',true); }); listen(root,'pageshow',function () { controller.setPaused('page',false); });
    var media = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)'); if (media) { var preference = function () { var active = doc.activeElement, hadFocus = line.contains(active); render(previewItem || controller.getCurrent(),controller.getState()); if (hadFocus) { var target = active.tagName === 'A' ? Array.prototype.find.call(line.querySelectorAll('a'),function (link) { return link.getAttribute('href') === active.getAttribute('href'); }) : line.querySelector('[data-message-text]'); if (target) target.focus({preventScroll:true}); } }; if (media.addEventListener) listen(media,'change',preference); }
    if (root.IntersectionObserver) { observer = new root.IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.target === container) { controller.setPaused('offscreen',!entry.isIntersecting); if (!entry.isIntersecting && scene) scene.destroy(); } }); }); observer.observe(container); }
    if (root.MutationObserver) { mutation = new root.MutationObserver(detached); mutation.observe(doc.documentElement,{childList:true,subtree:true}); }
    controller.setPaused('user',userPaused); visible();
    function restorePreview() { if (!previewItem) return; if (scene) scene.destroy(); previewItem = null; previewOptions = null; controller.setPaused('preview',false); render(controller.getCurrent(),controller.getState()); }
    var api = {next:controller.next,pause:function () { userPaused = true; controller.pause(); try { storage.setItem('heavenly_messages_paused','true'); } catch (error) {} },resume:function () { userPaused = false; controller.resume(); try { storage.setItem('heavenly_messages_paused','false'); } catch (error) {} },show:function (id) { if (scene) scene.destroy(); controller.show(id); },activate:activate,getState:controller.getState,getCurrent:controller.getCurrent,setPaused:controller.setPaused,
      getSceneState:function (id) { return sceneStore.read(id); },
      preview:function (item,settings) { validateItem(item); restorePreview(); previewItem = clone(item); previewOptions = settings || {}; controller.setPaused('preview',true); render(previewItem,controller.getState()); var done = false; return {activate:activate,destroy:function () { if (done) return; done = true; restorePreview(); }}; },
      destroy:function () { if (destroyed) return; destroyed = true; if (scene) scene.destroy(); controller.destroy(); listeners.forEach(function (off) { off(); }); if (observer) observer.disconnect(); if (mutation) mutation.disconnect(); container.replaceChildren(); }};
    return api;
  }
  var api = {choices:choices,playlists:playlists,config:config,portraitSlots:portraitSlots,createSceneStore:createSceneStore,normalizeSceneState:normalizeSceneState,previewLive:function (item,options) { if (!root || !root.heavenlyMessages) fail('Homepage messages are not ready.'); return root.heavenlyMessages.preview(item,options); },validateData:validateData,validateItem:validateItem,safeLink:safeLink,clone:clone,createSeededRandom:createSeededRandom,createController:createController,renderPreview:renderPreview,mount:mount};
  if (root && root.document) { if (root.fetch) root.fetch('/assets/messages/portraits/manifest.json').then(function (response) { return response.ok ? response.json() : {}; }).then(function (manifest) { Object.keys(portraitSlots).forEach(function (key) { approvedPortraits[key] = manifest[key] === portraitSlots[key]; }); }).catch(function () {}); var init = function () { var node = root.document.getElementById('heavenly-messages'); if (node && !root.heavenlyMessages && root.HeavenlyMessagesData) { try { root.heavenlyMessages = mount(node); } catch (error) { node.textContent = 'Everything I do is Heavenly.'; } } }; if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded',init,{once:true}); else init(); }
  return api;
}));

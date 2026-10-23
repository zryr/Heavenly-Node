(function (root) {
  'use strict';
  // The two desktop surfaces remain owned by the dialog, including when the
  // Popover API is absent. Compact mode uses one surface containing both groups.
  function create(config) {
    var host=config.host, commands=config.commands, rail=config.rail;
    var owner=config.owner, anchor=config.anchor, modal=config.modal;
    var open=false, closing=false, layout=null, timer=0, animations=[];
    var portaled=[], visible=[], viewport=root.visualViewport;
    commands.classList.add('mirror-menu-panel'); rail.classList.add('mirror-menu-panel');
    commands.id=host.id+'-commands'; rail.id=host.id+'-movement';
    [host,commands,rail].forEach(function(node){node.__mirrorOwner=owner;});
    commands.setAttribute('role','group'); commands.setAttribute('aria-label','Mirror actions');
    function bounds() {
      return {left:viewport?viewport.offsetLeft:0,top:viewport?viewport.offsetTop:0,
        width:viewport?viewport.width:root.innerWidth,height:viewport?viewport.height:root.innerHeight};
    }
    function stop() {
      clearTimeout(timer); animations.forEach(function(a){a.cancel();}); animations=[];
    }
    function reduced() {return root.matchMedia('(prefers-reduced-motion: reduce)').matches;}
    function buttons() {
      return [commands,rail].flatMap(function(group){return Array.from(group.querySelectorAll('button:not(:disabled)'));});
    }
    function surface(node) {
      node.hidden=false; node.inert=false;
      if(typeof node.showPopover==='function' && typeof host.showPopover==='function') {
        node.setAttribute('popover','manual'); node.showPopover();
      } else {
        node.removeAttribute('popover');
        var marker=root.document.createComment('mirror-menu-home');
        node.before(marker); modal.appendChild(node); portaled.push({node:node,marker:marker});
      }
      visible.push(node);
    }
    function hide() {
      visible.forEach(function(node){
        if(node.hidePopover && node.matches(':popover-open'))node.hidePopover();
        node.hidden=true; node.inert=true;
      });
      visible=[];
      portaled.forEach(function(entry){entry.marker.replaceWith(entry.node);}); portaled=[];
      // Children are visible within the compact host; only its outer surface is hidden.
      commands.hidden=false; rail.hidden=!rail.children.length;
      commands.removeAttribute('popover'); rail.removeAttribute('popover');
      host.hidden=true; host.inert=true; closing=false;
    }
    function motion(exit, done) {
      stop();
      if(reduced()){if(done)done();return;}
      visible.forEach(function(node){
        var dx=layout==='dual'?(node===rail?18:-18):0, dy=layout==='dual'?0:7;
        var start={opacity:0,transform:'translate('+dx+'px,'+dy+'px) scale(.98)'};
        var end={opacity:1,transform:'translate(0,0) scale(1)'};
        if(node.animate)animations.push(node.animate(exit?[end,start]:[start,end],{duration:exit?165:210,easing:'cubic-bezier(.2,.75,.25,1)'}));
      });
      if(done){
        var current=animations;
        function finish(){if(animations!==current)return;stop();done();}
        Promise.all(current.map(function(a){return a.finished;})).then(finish,function(){});
        timer=setTimeout(finish,1000); // Cleanup even if a suspended renderer never finishes.
      }
    }
    function watch(add) {
      var method=add?'addEventListener':'removeEventListener';
      root[method]('resize',position);
      if(viewport){viewport[method]('resize',position);viewport[method]('scroll',position);}
    }
    function mount(next) {
      hide(); layout=next; host.dataset.layout=next; commands.dataset.layout=next; rail.dataset.layout=next; host.hidden=false; host.inert=false;
      commands.hidden=false; rail.hidden=!rail.children.length;commands.inert=false;rail.inert=false;
      if(next==='dual') {
        host.removeAttribute('popover'); surface(rail); surface(commands);
        anchor.setAttribute('aria-controls',rail.id+' '+commands.id);
      } else {
        surface(host); anchor.setAttribute('aria-controls',host.id);
      }
    }
    function position() {
      if(!open)return;
      var v=bounds(), margin=12, gap=12, card=modal.querySelector('.modal-card').getBoundingClientRect();
      var row=owner.getBoundingClientRect(), control=anchor.getBoundingClientRect();
      var region=owner.closest('.mirror-destination-list')||modal.querySelector('.modal-card');
      var regionBox=region.getBoundingClientRect();
      if(control.bottom<=Math.max(regionBox.top,card.top,v.top)||control.top>=Math.min(regionBox.bottom,card.bottom,v.top+v.height)){close(false);return;}
      var canSplit=rail.children.length && card.left-v.left>=60+gap+margin && v.left+v.width-card.right>=248+gap+margin;
      var next=canSplit?'dual':'compact', changed=next!==layout;
      var focused=root.document.activeElement;
      if(changed){stop();mount(next);}
      var center=row.top+row.height/2;
      function place(node,left,top) {
        var box=node.getBoundingClientRect();
        top=Math.max(v.top+margin,Math.min(v.top+v.height-box.height-margin,top));
        node.style.left=left+'px';node.style.top=top+'px';
        node.style.setProperty('--mirror-anchor-y',Math.max(12,Math.min(box.height-12,center-top))+'px');
      }
      if(next==='dual') {
        [rail,commands].forEach(function(node){node.style.maxHeight=Math.max(44,v.height-margin*2)+'px';});
        place(rail,card.left-gap-60,center-rail.getBoundingClientRect().height/2);
        place(commands,card.right+gap,center-22);
      } else {
        host.style.width=Math.min(300,v.width-margin*2)+'px';host.style.maxHeight=Math.max(44,v.height-margin*2)+'px';
        var box=host.getBoundingClientRect(), below=v.top+v.height-control.bottom-margin, above=control.top-v.top-margin;
        place(host,Math.max(v.left+margin,Math.min(v.left+v.width-box.width-margin,control.right-box.width)),below>=box.height||below>=above?control.bottom+7:control.top-box.height-7);
      }
      if(changed && focused && (host.contains(focused)||commands.contains(focused)||rail.contains(focused)))focused.focus({preventScroll:true});
    }
    function show(focus) {
      stop();open=true;closing=false;layout=null;host.hidden=false;host.inert=false;
      owner.classList.add('mirror-menu-open');anchor.setAttribute('aria-expanded','true');
      config.onState(true);position();
      if(!open)return;
      watch(true);motion(false);
      if(focus){var first=buttons()[0];if(first)first.focus({preventScroll:true});}
    }
    function close(restore,immediate) {
      if(!open){if(immediate&&closing){stop();hide();}return;}
      open=false;closing=true;watch(false);
      var focused=root.document.activeElement;
      if(restore||[host,commands,rail].some(function(node){return node.contains(focused);}))anchor.focus({preventScroll:true});
      visible.forEach(function(node){node.inert=true;});
      host.inert=true;owner.classList.remove('mirror-menu-open');anchor.setAttribute('aria-expanded','false');config.onState(false);
      if(immediate){stop();hide();}else motion(true,hide);
    }
    function keydown(e) {
      if(!open)return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return;}
      var list=buttons(),index=list.indexOf(root.document.activeElement),next;
      if(e.key==='ArrowDown')next=list[(index+1)%list.length];
      if(e.key==='ArrowUp')next=list[(index+list.length-1)%list.length];
      if(e.key==='Home')next=list[0];if(e.key==='End')next=list[list.length-1];
      if(next){e.preventDefault();e.stopPropagation();next.focus();}
    }
    // Direct listeners work both in normal DOM and in the portal fallback.
    [commands,rail,host].forEach(function(node){node.addEventListener('keydown',keydown);});
    return {show:show,close:close,position:position,buttons:buttons,
      destroy:function(){close(false,true);stop();hide();watch(false);[commands,rail,host].forEach(function(node){node.removeEventListener('keydown',keydown);});}};
  }
  root.HeavenlyMirrorMenu={create:create};
})(window);

/* Short, interruptible motion. Logical state always settles, even offscreen. */
(function (root) {
  'use strict';
  var running = new Map(), removalObserver = null;
  function reduced() { return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function cancel(node, finish) {
    var state = running.get(node);
    if (!state) return;
    // Retire ownership before cancel(): both the promise rejection and cancel
    // event can run later, after a replacement transition has already started.
    running.delete(node); clearTimeout(state.timer);
    state.animation.onfinish = state.animation.oncancel = null;
    state.animation.cancel();
    if (node.__accordionAnimation === state.animation) node.__accordionAnimation = null;
    if (!running.size && removalObserver) { removalObserver.disconnect(); removalObserver = null; }
    if (finish) state.done();
  }
  function settleAll() { Array.from(running.keys()).forEach(function (node) { cancel(node, true); }); }
  function watchRemoval() {
    if (removalObserver || !root.MutationObserver) return;
    removalObserver = new root.MutationObserver(function () {
      Array.from(running.keys()).forEach(function (node) { if (!node.isConnected) cancel(node, true); });
    });
    removalObserver.observe(root.document.documentElement, { childList:true, subtree:true });
  }
  function play(node, frames, done, duration) {
    cancel(node, false);done=done||function(){};
    if(!node.isConnected||!node.getClientRects().length||!node.animate||reduced()||root.document.visibilityState==='hidden'){done();return null;}
    var animation;
    try { animation=node.animate(frames,{duration:duration||210,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'}); } catch(e){done();return null;}
    var state={animation:animation,done:done,timer:null};running.set(node,state);watchRemoval();
    function finish(){if(running.get(node)!==state)return;cancel(node,true);}
    if(animation.finished)animation.finished.then(finish,finish);
    animation.onfinish=finish;animation.oncancel=finish;
    // A watchdog is for suspended/broken renderers, not the animation clock.
    state.timer=setTimeout(finish,1200);
    return animation;
  }
  function height(node,open,mutate,complete){
    // offsetHeight is unaffected by the parent dialog's pickup scale.
    var before=node.hidden?0:node.offsetHeight;
    cancel(node,false);node.__accordionAnimation=null;node.hidden=false;
    if(mutate)mutate();node.inert=!open;
    var after=open?node.offsetHeight:0;
    var done=function(){node.hidden=!open;node.__accordionAnimation=null;if(complete)complete();};
    // Both measurements are border-box sizes. Explicit sizing also handles
    // folder/mirror bodies with padding or borders without a final-frame jump.
    var animation=play(node,[{height:before+'px',boxSizing:'border-box',opacity:open?.86:1,overflow:'hidden'},{height:after+'px',boxSizing:'border-box',opacity:open?1:.86,overflow:'hidden'}],done);
    node.__accordionAnimation=animation && running.has(node) ? animation : null;
  }
  function feedback(node,kind,from){
    if(!node)return;
    var colors={broken:'rgba(248,113,113,.35)',working:'rgba(74,222,128,.3)',preferred:'rgba(192,132,252,.4)',promoted:'rgba(56,189,248,.35)'};
    var to=node.getBoundingClientRect(),x=from?from.left-to.left:0,y=from?from.top-to.top:0;
    if(Math.abs(x)>260||Math.abs(y)>260){x=0;y=0;}
    play(node,[{translate:x+'px '+y+'px',opacity:.78,boxShadow:'0 0 0 2px '+colors[kind],backgroundColor:colors[kind]},{translate:'0px 0px',opacity:1,boxShadow:'0 0 0 0 transparent'}],null,240);
  }
  root.document.addEventListener('visibilitychange',function(){if(root.document.visibilityState==='hidden')settleAll();});
  var motionPreference = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionPreference) {
    var changePreference = function () { if (motionPreference.matches) settleAll(); };
    if (motionPreference.addEventListener) motionPreference.addEventListener('change', changePreference);
    else if (motionPreference.addListener) motionPreference.addListener(changePreference);
  }
  root.HeavenlyMotion={height:height,feedback:feedback,play:play,cancel:cancel};
}(window));

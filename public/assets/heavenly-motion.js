/* Short, interruptible motion. Logical state always settles, even offscreen. */
(function (root) {
  'use strict';
  var running = new Map();
  function reduced() { return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function cancel(node, finish) { var state=running.get(node); if(!state)return; running.delete(node);clearTimeout(state.timer);state.animation.oncancel=null;state.animation.cancel();if(finish)state.done(); }
  function play(node, frames, done, duration) {
    cancel(node, false);done=done||function(){};
    if(!node.isConnected||!node.animate||reduced()||root.document.visibilityState==='hidden'){done();return null;}
    var animation;
    try { animation=node.animate(frames,{duration:duration||210,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'}); } catch(e){done();return null;}
    var state={animation:animation,done:done,timer:null};running.set(node,state);
    function finish(){if(running.get(node)!==state)return;cancel(node,true);}
    if(animation.finished)animation.finished.then(finish,finish);
    animation.onfinish=finish;animation.oncancel=function(){if(running.get(node)===state){running.delete(node);clearTimeout(state.timer);done();}};
    // A watchdog is for suspended/broken renderers, not the animation clock.
    state.timer=setTimeout(finish,1200);
    return animation;
  }
  function height(node,open,mutate,complete){
    var before=node.hidden?0:node.getBoundingClientRect().height;
    cancel(node,false);node.__accordionAnimation=null;node.hidden=false;
    if(mutate)mutate();node.inert=!open;
    var after=open?node.getBoundingClientRect().height:0;
    var done=function(){node.hidden=!open;node.__accordionAnimation=null;if(complete)complete();};
    var animation=play(node,[{height:before+'px',opacity:open?.86:1,overflow:'hidden'},{height:after+'px',opacity:open?1:.86,overflow:'hidden'}],done);
    node.__accordionAnimation=animation;
  }
  function feedback(node,kind,from){
    if(!node)return;
    var colors={broken:'rgba(248,113,113,.35)',working:'rgba(74,222,128,.3)',preferred:'rgba(192,132,252,.4)',promoted:'rgba(56,189,248,.35)'};
    var to=node.getBoundingClientRect(),x=from?from.left-to.left:0,y=from?from.top-to.top:0;
    if(Math.abs(x)>260||Math.abs(y)>260){x=0;y=0;}
    play(node,[{translate:x+'px '+y+'px',opacity:.78,boxShadow:'0 0 0 2px '+colors[kind],backgroundColor:colors[kind]},{translate:'0px 0px',opacity:1,boxShadow:'0 0 0 0 transparent'}],null,240);
  }
  root.document.addEventListener('visibilitychange',function(){if(root.document.visibilityState==='hidden')Array.from(running.keys()).forEach(function(node){cancel(node,true);});});
  root.HeavenlyMotion={height:height,feedback:feedback,play:play,cancel:cancel};
}(window));

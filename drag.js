// Trascinamento dei giocatori sul campo (mouse: dopo 6 px; dito: tieni premuto 380 ms). Usa st, slots(), save() e render() degli altri file.
"use strict";
// ---------- trascina i giocatori sul campo ----------
// Scambia due giocatori della stessa squadra portando con sé tutto ciò che hai segnato: stelle, istruzione scelta (o ipotesi),
// stelle per ruolo, veloce/fisico, cartellini, marcatura. Se i due posti hanno ruoli diversi, istruzioni e stelle per ruolo
// non hanno senso nel posto nuovo: restano le stelle del giocatore, i cartellini e le etichette.
function swapSlots(side,a,b){
  const f=side==="mine"?st.mine:st.opp,S=slots(f),sa=S.find(s=>s.k===a),sb=S.find(s=>s.k===b);
  if(!sa||!sb||a===b||sa.role==="POR"||sb.role==="POR")return false;
  const same=sa.role===sb.role,swapKeys=o=>{const x=o[a],y=o[b];if(y===undefined)delete o[a];else o[a]=y;if(x===undefined)delete o[b];else o[b]=x;return o};
  st.lv={...st.lv,[side]:{...((st.lv||{})[side]||{}),[f]:swapKeys({...lvMap(side)})}};
  // stelle per ruolo: chiavi «posto|ruolo»
  const R={...((((st.lvr||{})[side])||{})[f]||{})},mv=(from,to)=>Object.keys(R).filter(x=>x.startsWith(from+"|")).map(x=>{const v=R[x];delete R[x];return [to+"|"+x.slice(from.length+1),v]});
  const ea=mv(a,b),eb=mv(b,a);if(same){ea.concat(eb).forEach(([k,v])=>R[k]=v)}
  st.lvr={...(st.lvr||{}),[side]:{...((st.lvr||{})[side]||{}),[f]:R}};
  const swapArr=arr=>{const A=arr.includes(a),B=arr.includes(b);if(A===B)return arr;return arr.filter(x=>x!==a&&x!==b).concat(A?[b]:[a])};
  st.yel={...st.yel,[side]:swapArr(yelOf(side))};st.red={...st.red,[side]:swapArr(redOf(side))};
  if(side==="mine"){
    const P={...st.pick};if(same)swapKeys(P);else{delete P[a];delete P[b]}st.pick=P;
    if(st.mark){const m=st.mark.mine;st.mark={...st.mark,mine:m===a?b:m===b?a:m}}
    if(st.tgMark===a)st.tgMark=b;else if(st.tgMark===b)st.tgMark=a;
    if(mopen===a)mopen=b;else if(mopen===b)mopen=a;
  }else{
    st.guess=st.guess||{};const G={...(st.guess[st.opp]||{})};if(same)swapKeys(G);else{delete G[a];delete G[b]}st.guess={...st.guess,[st.opp]:G};
    st.tag={...st.tag,[st.opp]:swapKeys({...tagMap()})};
    if(st.mark){const m=st.mark.opp;st.mark={...st.mark,opp:m===a?b:m===b?a:m}}
    if(gopen===a)gopen=b;else if(gopen===b)gopen=a;
  }
  return true;
}
(function(){
  let G=null,swallow=false;
  const slotEl=t=>t&&t.closest?t.closest(".pitch .oslot[data-slot]"):null;
  const clear=()=>{if(!G)return;clearTimeout(G.timer);if(G.on){G.ghost&&G.ghost.remove();G.el.classList.remove("dragsrc");if(G.over)G.over.classList.remove("droptgt");document.body.classList.remove("dragging")}G=null};
  function begin(){
    if(!G||G.on)return;G.on=true;
    const r=G.el.getBoundingClientRect(),g=G.el.cloneNode(true);
    g.removeAttribute("data-act");g.removeAttribute("data-slot");g.classList.add("dragghost");g.style.width=r.width+"px";g.style.height=r.height+"px";g.style.left=r.left+"px";g.style.top=r.top+"px";
    G.dx=G.x-r.left;G.dy=G.y-r.top;G.pitch=G.el.closest(".pitch");G.pitch.appendChild(g);G.ghost=g;
    G.el.classList.add("dragsrc");document.body.classList.add("dragging");
    try{if(navigator.vibrate)navigator.vibrate(15)}catch(e){}
  }
  function over(x,y){
    if(!G||!G.on)return;
    G.ghost.style.left=(x-G.dx)+"px";G.ghost.style.top=(y-G.dy)+"px";
    const t=slotEl(document.elementFromPoint(x,y)),ok=t&&t!==G.el&&t.dataset.side===G.side&&G.pitch.contains(t)?t:null;
    if(G.over&&G.over!==ok)G.over.classList.remove("droptgt");
    if(ok)ok.classList.add("droptgt");G.over=ok;
  }
  document.addEventListener("pointerdown",e=>{
    if(G)clear();
    if(e.pointerType==="mouse"&&e.button!==0)return;
    const el=slotEl(e.target);if(!el)return;
    G={el,side:el.dataset.side,k:el.dataset.slot,x:e.clientX,y:e.clientY,on:false,touch:e.pointerType!=="mouse",timer:0,over:null};
    if(G.touch)G.timer=setTimeout(begin,380);   // col dito: tieni premuto un attimo, poi trascini
  });
  document.addEventListener("pointermove",e=>{
    if(!G)return;
    if(!G.on){const d=Math.hypot(e.clientX-G.x,e.clientY-G.y);
      if(G.touch){if(d>10)clear()}                // il dito si muove subito: stai scorrendo la pagina
      else if(d>6)begin();
      if(!G||!G.on)return}
    over(e.clientX,e.clientY);
  });
  document.addEventListener("pointerup",e=>{
    if(!G)return;
    if(!G.on){clear();return}
    const tgt=G.over,side=G.side,a=G.k;
    clear();swallow=true;setTimeout(()=>{swallow=false},60);
    if(tgt&&swapSlots(side,a,tgt.dataset.slot)){save();render()}
  });
  document.addEventListener("pointercancel",()=>clear());
  document.addEventListener("click",e=>{if(swallow){e.stopPropagation();e.preventDefault();swallow=false}},true);
  document.addEventListener("touchmove",e=>{if(G&&G.on&&e.cancelable)e.preventDefault()},{passive:false});
  document.addEventListener("contextmenu",e=>{if(G&&G.touch&&slotEl(e.target))e.preventDefault()});
  document.addEventListener("dragstart",e=>{if(slotEl(e.target))e.preventDefault()});
})();

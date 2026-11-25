// Avvio: avviso dei cambi, tema, schermo acceso, benvenuto, trascinamento dei giocatori e render(). Si carica per ultimo.
"use strict";
// ---- 4. avviso dei cambi nella formazione ----
let SNAP=null,FLASH=new Set(),_toastT=0;
function diffAndToast(C){
  const V=variant(st.score,C),key=[st.mine,st.opp,st.score,st.plan].join("|"),now={...V.P,"_ment":V.ment,"_ritmo":V.extra.ritmo,"_tempo":V.extra.tempo};
  FLASH=new Set();
  if(SNAP&&SNAP.key===key){
    const ch=[];Object.keys(now).forEach(k=>{if((now[k]||"")!==(SNAP.P[k]||""))ch.push(k)});
    if(ch.length){
      const nm=v=>!v?"nessuna":byId[v]?byId[v].name.replace(/^.*?: /,""):v;
      const lab=k=>k==="_ment"?"Mentalità":k==="_ritmo"?"Ritmo":k==="_tempo"?"Perdita di tempo":k.startsWith("SQ:")?k.slice(3):(C.SL.find(s=>s.k===k)||{l:k}).l;
      ch.forEach(k=>FLASH.add(k.startsWith("_")?"SQ:"+lab(k):k));
      const lines=ch.slice(0,3).map(k=>`<div><b>${esc(lab(k))}</b>: ${esc(nm(SNAP.P[k]))} → <b>${esc(nm(now[k]))}</b></div>`).join("");
      const T=$("toast");T.innerHTML=`<span class="label">Cambia nella formazione</span>${lines}${ch.length>3?`<small>e altri ${ch.length-3}</small>`:""}`;T.hidden=false;
      clearTimeout(_toastT);_toastT=setTimeout(()=>{T.hidden=true},4500);
      try{const ua=navigator.userActivation;if(navigator.vibrate&&(!ua||ua.hasBeenActive))navigator.vibrate([70,50,70])}catch(e){}
    }
  }
  SNAP={key,P:now};
}
// ---- tema chiaro / scuro scelto con il tasto in alto (senza scelta segue il telefono) ----
function themeNow(){return st.theme==="light"||st.theme==="dark"?st.theme:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}
function applyTheme(){
  if(st.theme==="light"||st.theme==="dark")document.documentElement.dataset.theme=st.theme;else delete document.documentElement.dataset.theme;
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.content="#0c0c0f";
}
applyTheme();
// ---- schermo sempre acceso mentre sei nella scheda Partita ----
let _lock=null,_wantLock=false;
async function wake(on){
  _wantLock=on;
  try{
    if(on&&!_lock&&"wakeLock" in navigator&&document.visibilityState==="visible"){
      _lock=await navigator.wakeLock.request("screen");
      _lock.addEventListener("release",()=>{_lock=null});
    }else if(!on&&_lock){const l=_lock;_lock=null;await l.release()}
  }catch(e){_lock=null}
}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&_wantLock)wake(true)});
document.addEventListener("pointerdown",()=>{if(_wantLock&&!_lock)wake(true)},{passive:true});
function render(){
  // espulsi di un modulo che non c'è più: li tolgo
  const keepK=(arr,f)=>arr.filter(k=>slots(f).some(s=>s.k===k));
  st.red={mine:keepK(redOf("mine"),st.mine),opp:keepK(redOf("opp"),st.opp)};
  st.yel={mine:keepK(yelOf("mine"),st.mine),opp:keepK(yelOf("opp"),st.opp)};
  normScore();
  st.home=!st.statSwap;   // a sinistra chi gioca in casa: lo scambio decide se sei tu
  if(st.mark&&!effMark())st.mark=null;
  const h=location.hash.slice(1), v=["partita","counter"].includes(h)?h:"modulo";
  ["modulo","partita","counter"].forEach(n=>{$("view-"+n).hidden=v!==n;$("tab-"+n).setAttribute("aria-current",v===n?"page":"false")});
  LIVE.on=v==="partita";LIVE.view=v;
  $("scorebar").hidden=v!=="partita"; document.body.classList.toggle("has-score",v==="partita"); wake(v==="partita");
  const C=compute(); diffAndToast(C); renderShared(C); updateSums(C);
  document.body.classList.add("expert");
  let n=0;document.querySelectorAll("#view-modulo details.acc").forEach(d=>{const vis=getComputedStyle(d).display!=="none";if(vis){const s=d.querySelector(".num");if(s)s.textContent=++n}});
  if(v==="modulo")renderModulo(C); else if(v==="partita")renderPartita(C); else renderCounter();
  decorateIcons();foldNotes();
}
addEventListener("hashchange",()=>{render();scrollTo(0,0)}); render(); initStats();
if(st.acc&&document.querySelector(`details.acc[data-acc="${st.acc}"]`)){document.querySelectorAll("details.acc").forEach(d=>d.open=d.dataset.acc===String(st.acc))}
// ---- 8. benvenuto al primo avvio ----
let _slide=0;
function showIntro(i){_slide=i;const I=$("intro");I.hidden=false;I.querySelectorAll(".islide").forEach(s=>s.hidden=+s.dataset.slide!==i);
  I.querySelectorAll(".idots i").forEach((d,k)=>d.classList.toggle("on",k===i));I.querySelector('[data-act="intronext"]').textContent=i<2?"Avanti":"Inizia"}
function closeIntro(){$("intro").hidden=true;st.intro=true;save()}
if(!st.intro)showIntro(0);
document.addEventListener("toggle",e=>{const d=e.target;
  if(!d.matches||!d.matches("details.acc")||!d.open)return;
  document.querySelectorAll("details.acc").forEach(x=>{if(x!==d)x.open=false});st.acc=d.dataset.acc;save();
  setTimeout(()=>d.scrollIntoView({behavior:"smooth",block:"start"}),30)},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("guide").hidden){$("guide").hidden=true}});
document.addEventListener("change",e=>{if(e.target.matches("[data-tgmark]")){st.tgMark=e.target.value;tgopen="";save();render()}});
document.addEventListener("change",e=>{const t=e.target;if(!st.mark)return;if(t.matches("[data-markmine]"))st.mark={...st.mark,mine:t.value};else if(t.matches("[data-markopp]"))st.mark={...st.mark,opp:t.value};else return;save();render()});
// OVR di squadra
document.addEventListener("change",e=>{const t=e.target;if(!t.matches||!t.matches("input[data-ovr]"))return;
  const n=parseInt(t.value,10);st.ovr={...st.ovr,[t.dataset.ovr]:n>=1&&n<=99?n:undefined};save();render()});
document.addEventListener("keydown",e=>{const t=e.target;if(e.key==="Enter"&&t.matches&&t.matches("input[data-ovr]")){e.preventDefault();t.blur()}});
// probabilità: scrivi i tre numeri, Invio passa al successivo; se ne scrivi due, il terzo lo ricavo io
document.addEventListener("change",e=>{const t=e.target;if(!t.matches||!t.matches("input[data-odds]"))return;
  const n=parseInt(t.value,10),O={...st.odds};if(n>=0&&n<=100)O[t.dataset.odds]=n;else delete O[t.dataset.odds];st.odds=O;save();
  const L=[...document.querySelectorAll("input[data-odds]")],nx=L[L.indexOf(t)+1];setTimeout(()=>{const a=document.activeElement;render();if(a&&a.matches&&a.matches("input[data-odds],input[data-ovr]"))a.focus()},0)});
document.addEventListener("keydown",e=>{const t=e.target;if(e.key!=="Enter"||!t.matches||!t.matches("input[data-odds]"))return;e.preventDefault();
  const L=[...document.querySelectorAll("input[data-odds]")],nx=L[L.indexOf(t)+1];if(nx)nx.focus();else t.blur()});
// statistiche scritte a mano: tocca la casella e digita il numero
document.addEventListener("change",e=>{const t=e.target;if(!t.matches||!t.matches("input[data-sk]"))return;
  let k=t.dataset.sk;const raw=t.value.trim().replace(",",".");st.stats=st.stats||{};
  if(raw===""){delete st.stats[k==="ps"?"pm":k]}
  else{let n=parseFloat(raw);
    if(!isNaN(n)){n=Math.max(0,n);
      if(k==="ps"){k="pm";n=100-Math.min(100,Math.round(n))}
      n=k==="pm"?Math.min(100,Math.round(n)):k==="min"?Math.min(130,Math.round(n)):(k==="xm"||k==="xs")?Math.round(n*10)/10:Math.round(n);
      st.stats[k]=String(n)}}
  save();
  // aggiorna le caselle senza ridisegnare la pagina, così la tastiera resta aperta
  document.querySelectorAll("input[data-sk]").forEach(i=>{if(i!==document.activeElement||i===t)i.value=statShow(i.dataset.sk,statVal(i.dataset.sk))});
  setSum("stats",(st.reads||[]).length?`letture: ${st.reads.map(r=>r.min+"'").join(", ")}`:"numeri inseriti, premi «Leggi»");
});
document.addEventListener("focusin",e=>{const t=e.target;if(t.matches&&t.matches("input[data-sk]"))setTimeout(()=>{try{t.select()}catch(err){}},0)});
document.addEventListener("keydown",e=>{const t=e.target;if(e.key!=="Enter"||!t.matches||!t.matches("input[data-sk]"))return;e.preventDefault();
  const L=[...t.closest("[data-steppers]").querySelectorAll("input[data-sk]")],nx=L[L.indexOf(t)+1];if(nx)nx.focus();else t.blur()});
// risultato e minuti scritti a mano
document.addEventListener("change",e=>{const t=e.target;if(!t.matches||!t.matches("input[data-lin]"))return;const w=t.dataset.lin,raw=t.value.trim(),n=parseInt(raw,10);
  if(w==="t"){st.stats=st.stats||{};if(raw===""||isNaN(n))delete st.stats.min;else st.stats.min=String(Math.max(0,Math.min(130,n)))}
  else{st[w==="me"?"gf":"ga"]=Math.max(0,Math.min(20,isNaN(n)?0:n));syncSit()}
  st.risk=null;save();render()});
document.addEventListener("keydown",e=>{const t=e.target;if(e.key==="Enter"&&t.matches&&t.matches("input[data-lin]")){e.preventDefault();t.blur()}});
document.addEventListener("focusin",e=>{const t=e.target;if(t.matches&&t.matches("input[data-lin]"))setTimeout(()=>{try{t.select()}catch(err){}},0)});
let _raf=0;document.addEventListener("input",e=>{if(!e.target.matches("[data-risk]"))return;st.risk=Math.round((.3+1.7*e.target.value/100)*100)/100;save();cancelAnimationFrame(_raf);_raf=requestAnimationFrame(render)});

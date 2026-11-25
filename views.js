// Schermate: barra del risultato, statistiche, icone, reset e tutte le azioni dei tasti.
"use strict";
// ---------- risultato e minuti rimasti (barra in basso, scheda Partita) ----------
function liveNote(){
  const G=goalsOf(),t=leftMin(),pos=Math.max(0,Math.min(100,Math.round((lamOf(st.score)-.3)/1.7*100))),P=oddsP(),g=ovrGap();
  const e=P?P.edge:g!=null?Math.max(-1,Math.min(1,g/20))*.5:0,tt=t==null?"":curMin()<=0?" a inizio partita":` al ${Math.round(curMin())}'`;
  let s;
  if(st.score==="svantaggio")s=`Sotto di ${-G.d}${tt}: ${pos<=8?"tutto in attacco":pos<=23?"spingi forte":pos<=35?"spingi con ordine":"c'è tempo"}`;
  else if(st.score==="vantaggio")s=`Avanti di ${G.d}${tt}: ${pos>=65?"chiuditi a riccio":pos>=50?"difendi":pos>=35?"controlla il ritmo":"c'è tempo, gestisci"}`;
  else{const m=pariMode(),rec=pariRec(),mm=PMODES.includes(st.pmode)?st.pmode:"auto";
    if(t==null)s="Pari: inserisci il minuto";
    else if(mm!=="auto")s=`Pari${tt}: ${mm==="sup"?"temporeggi":"cerchi il gol"}`;
    else if(m==="close")s=`Pari${tt}: favorito, un pari è poco. Chiudila`;
    else if(m==="sup")s=`Pari${tt}: sfavorito, il pari va bene. Supplementari`;
    else s=rec?`Pari${tt}: c'è tempo, nessuna correzione`:`Pari${tt}: mancano probabilità/OVR`}
  return s+` · Prudenza ${pos}${st.risk!=null?" (a mano)":""}`;
}
function liveHTML(){
  const sw=!!st.statSwap,G=goalsOf(),non=st.score!=="pari",t=st.left,tl=leftMin();
  const stp=(w,val,lab,act)=>`<span class="stp"><button data-act="${act}" data-v="${w}|-1" aria-label="${lab}: meno">−</button><input data-lin="${w}" type="text" inputmode="numeric" maxlength="3" autocomplete="off" enterkeyhint="done" value="${val}" placeholder="–" aria-label="${lab}"><button data-act="${act}" data-v="${w}|1" aria-label="${lab}: più">+</button></span>`;
  const rec=pariRec(),pm=PMODES.includes(st.pmode)?st.pmode:"auto";
  const modes=non?"":`<div class="pills pmodes" role="group" aria-label="Nel pareggio">${[["sup","Cerca i supplementari"],["close","Chiudila"]].map(([v,l])=>`<button class="pill" data-act="pmode" data-v="${v}" aria-pressed="${pm===v}">${l}${rec===v?` <small>consigliato</small>`:""}</button>`).join("")}</div>`;
  const cell=(lab,inner)=>`<div class="lc"><small>${lab}</small>${inner}</div>`;
  const me=cell("Tu",stp("me",G.me,"Gol tuoi","gl")),him=cell("Lui",stp("him",G.him,"Gol suoi","gl")),mn=cell("Minuto",stp("t",String((st.stats||{}).min??""),"Minuto della partita","tl"));
  return modes+`<div class="lrow3">${non?(sw?him+me:me+him):""}${mn}</div><p class="livenote">${esc(liveNote())}</p>`;
}
// ---------- statistiche ----------
// Le statistiche del gioco sono TOTALI dall'inizio. Ogni «Leggi» salva una lettura (minuto + totali);
// gli indizi si calcolano sull'ultimo tratto (differenza dalla lettura precedente, almeno 15 minuti),
// con i conteggi riportati a 45 minuti così le soglie valgono a ogni minuto.
const SK=["tm","ts","qm","qs","xm","xs","am","as","fm","fs","om","os"],WIN_MIN=15,BASE_MIN=45;
function statNum(o,k){const v=parseFloat(String((o||{})[k]??"").replace(",","."));return isNaN(v)?NaN:v}
function statWindow(){
  const R=st.reads||[];if(!R.length)return null;
  // base: la lettura più recente di almeno 15 minuti prima; se non c'è, la lettura precedente (tratto più corto),
  // e solo alla prima lettura l'inizio della partita. Mai di nuovo i totali se hai letto da poco.
  const cur=R[R.length-1];let base={min:0,s:{pm:"50"}};
  for(let i=R.length-2;i>=0;i--){if(cur.min-R[i].min>=WIN_MIN){base=R[i];break}}
  if(base.min===0&&R.length>=2&&cur.min-R[R.length-2].min>0&&cur.min-R[R.length-2].min<WIN_MIN)base=R[R.length-2];
  const dt=cur.min-base.min,d={};
  SK.forEach(k=>{const a=statNum(cur.s,k),b=statNum(base.s,k);d[k]=isNaN(a)?NaN:Math.max(0,Math.round((a-(isNaN(b)?0:b))*10)/10)});
  const p2=statNum(cur.s,"pm"),p1=isNaN(statNum(base.s,"pm"))?50:statNum(base.s,"pm");
  d.pm=isNaN(p2)?NaN:dt>0?Math.max(0,Math.min(100,Math.round((p2*cur.min-p1*base.min)/dt))):p2;
  return {from:base.min,to:cur.min,dt,d,tot:cur.s};
}
function statLastHTML(){
  const W=statWindow();if(!W)return "";
  const f=v=>isNaN(v)?"–":String(v).replace(".",",");
  const rows=[["Possesso %",W.d.pm,isNaN(W.d.pm)?NaN:100-W.d.pm],["Tiri",W.d.tm,W.d.ts],["Tiri in porta",W.d.qm,W.d.qs],["Gol attesi (xG)",W.d.xm,W.d.xs],["Angoli",W.d.am,W.d.as],["Falli",W.d.fm,W.d.fs],["Fuorigioco",W.d.om,W.d.os]];
  const reads=(st.reads||[]).map(r=>r.min+"'").join(", ");
  const sw=!!st.statSwap,two=(a,b)=>sw?b+a:a+b;
  return `<div class="lastw"><div class="lastw-h"><b>Ultimo tratto ${W.from}'→${W.to}'</b><small>solo quello che è successo in questi ${W.dt} minuti</small></div>
    <div class="lastw-g"><span></span>${two(`<span class="label me">Tu</span>`,`<span class="label">Lui</span>`)}${rows.map(([l,a,b])=>`<span>${l}</span>${two(`<b class="${a>b?"up":""}">${f(a)}</b>`,`<b class="${b>a?"up":""}">${f(b)}</b>`)}`).join("")}</div>
    <small class="note">Letture salvate: ${reads}</small></div>`;
}
let READMSG="";
function readStats(){
  st.reads=Array.isArray(st.reads)?st.reads:[];
  const min=statNum(st.stats,"min");
  if(isNaN(min)||min<=0)return {ok:false,msg:"Inserisci prima il minuto della partita (nel pannello in alto), poi premi «Leggi»."};
  const last=st.reads[st.reads.length-1];
  if(last&&min<last.min)return {ok:false,msg:`Il minuto (${min}') è prima dell'ultima lettura (${last.min}'). Se è una nuova partita premi «Nuova partita».`};
  return {ok:true,msg:readStatsRaw(min,last)};
}
function readStatsRaw(min,last){
  const snap={min,s:{...st.stats}};delete snap.s.min;
  if(last&&min===last.min)st.reads[st.reads.length-1]=snap;else st.reads.push(snap);
  const W=statWindow(),sc=W.dt>0?BASE_MIN/W.dt:1,d=W.d;
  const n=k=>k==="pm"?d.pm:(isNaN(d[k])?NaN:d[k]*sc);
  const pm=n("pm"),ps=100-pm,tm=n("tm"),ts=n("ts"),qm=n("qm"),qs=n("qs"),xm=n("xm"),xs=n("xs"),am=n("am"),as=n("as"),fm=n("fm"),fs=n("fs"),om=n("om"),os=n("os");
  // R = eventi veri nel tratto (non riportati a 45'): un indizio si accende solo se gli eventi reali bastano,
  // così un singolo fuorigioco o due falli in 15 minuti non diventano «3 per tempo»
  const R=k=>isNaN(d[k])?0:d[k];
  const hit={s_corto:ps>=55,s_lungo:ps<=45&&R("ts")>=1&&(xs>=xm||ts>=tm),
    s_press:fs>=6&&fs>=fm+2&&pm<=50&&R("fs")>=3&&R("fs")-R("fm")>=2,
    s_duri:(fs>=8||(fs>=6&&fs>=2*fm))&&R("fs")>=3,
    s_basso:pm>=55&&tm>=3&&tm>=ts&&xm/tm<0.12&&om===0&&R("tm")>=2,
    s_alta:om>=2&&R("om")>=2,
    s_contro:ts<=tm&&xs>=xm+0.4&&ps<50&&R("xs")-R("xm")>=.3,
    s_largo:as>=3&&as>am&&R("as")>=2&&R("as")>R("am"),
    s_off:ts>=5&&tm>=4&&R("ts")>=3&&R("tm")>=2,
    s_tiri:ts>=4&&qs/ts<=.35&&xs/ts<.12&&R("ts")>=3,
    s_stretto:am>=3&&am>=as+2&&R("am")>=2&&R("am")-R("as")>=2,
    s_prof:os>=2&&R("os")>=2};
  const on=Object.keys(hit).filter(k=>hit[k]);
  const old=st.sigAuto||[],off=old.filter(k=>!on.includes(k));
  // gli indizi dedotti prima si spengono se nell'ultimo tratto non valgono più; quelli accesi a mano restano
  st.sig=[...new Set([...st.sig.filter(k=>!off.includes(k)),...on])]; st.sigAuto=on;
  const nm=k=>D.signals.find(g=>g.id===k).label,tr=`Tratto ${W.from}'→${W.to}'${W.dt<WIN_MIN?` (solo ${W.dt} minuti dall'ultima lettura: campione piccolo)`:""}`;
  return (on.length?`${tr}: indizi accesi: ${on.map(nm).join(", ")}.`:`${tr}: nessun indizio chiaro.`)
    +(off.length?` Spenti perché non valgono più: ${off.map(nm).join(", ")}.`:"")+" Confermali guardando la partita.";
}
function initStats(){st.stats=st.stats||{}}
// ---------- icone davanti a sezioni e sottosezioni ----------
const ICO={
  board:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.4"/><circle cx="16" cy="8" r="1.4"/><circle cx="12" cy="13" r="1.4"/><circle cx="12" cy="18" r="1.4"/>',
  star:'<path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  pitch:'<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3"/>',
  compare:'<path d="M5 20V11M12 20V4M19 20v-6"/>',
  shirt:'<path d="M8.5 3L3 6l2 4.5 2-1V21h10V9.5l2 1L21 6l-5.5-3c0 2-1.6 3.2-3.5 3.2S8.5 5 8.5 3z"/>',
  shield:'<path d="M12 3l8 3v6c0 4.6-3.4 8-8 9-4.6-1-8-4.4-8-9V6z"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  check:'<path d="M10 6h10M10 12h10M10 18h10M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  warn:'<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.3v.2"/>',
  flag:'<path d="M5 21V3.5M5 4.5h11l-2.2 4 2.2 4H5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.2"/>',
  clip:'<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3.5"/>',
  versus:'<path d="M4 4l8 8M4 4v4M4 4h4M20 20l-8-8M20 20v-4M20 20h-4M20 4l-6 6M4 20l6-6"/>',
  chart:'<path d="M4 20h16M7.5 16.5v-5M12 16.5V7M16.5 16.5V10"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M20.5 20.5l-4.8-4.8"/>',
  ycard:'<rect x="7" y="3.5" width="10.5" height="15.5" rx="1.6" transform="rotate(9 12 11)"/>',
  rcard:'<rect x="7" y="3.5" width="10.5" height="15.5" rx="1.6" transform="rotate(9 12 11)"/>',
  swap:'<path d="M4 8h15l-3.5-3.5M20 16H5l3.5 3.5"/>',
  score:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M12 5v12M8 21h8"/>',
  grid:'<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16"/>',
  pct:'<path d="M5.5 18.5l13-13"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
  bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4.1 10.4c.8.8 1.1 1.6 1.1 2.6h6c0-1 .3-1.8 1.1-2.6A6 6 0 0 0 12 3z"/>',
  scale:'<path d="M12 4v15.5M7 20h10M4.5 8h15M4.5 8L2.5 14h4zM19.5 8l-2 6h4z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'};
// titolo (inizio, minuscolo) → icona; i più lunghi prima
const ICOMAP=[["sue tattiche di squadra","clip"],["confronto dei tuoi moduli","compare"],["livello dei giocatori","star"],["il mio schieramento","pitch"],["formazione da schierare","shirt"],
  ["rischio e sicurezza","shield"],["cosa rivela il suo modulo","eye"],["cosa noti dell'avversario","eye"],["le tue scelte","check"],["marcatura","target"],["ritmo e perdita di tempo","clock"],
  ["cosa resta scoperto","warn"],["calci d'angolo","flag"],["come leggere","info"],["tattiche di squadra","clip"],["statistiche","chart"],["indizi","search"],
  ["cartellini gialli","ycard"],["espulsioni","rcard"],["se noti questo","swap"],["con questo punteggio","score"],["matrice per reparto","grid"],["probabilità a inizio partita","pct"],
  ["tre cose da sapere","bulb"],["preparazione","scale"],["moduli","board"],["piano","board"],["altro","info"]];
// Info: le note lunghe di ogni scheda stanno in UN SOLO pulsante «Info», in basso a sinistra della scheda, una sotto l'altra.
// Le note originali restano nella pagina ma nascoste (.folded): a ogni disegno la scatola si ricostruisce da quelle attuali.
const INFO_MIN=90,INFO_OPEN=new Set();
function foldNotes(){
  document.querySelectorAll("main .view").forEach(view=>{
    view.querySelectorAll(":scope>.viewinfo").forEach(b=>b.remove());
    const seen=new Set(),items=[];
    view.querySelectorAll(".note,.rednote>span").forEach(n=>{
      if(n.closest(".viewinfo,summary,.homehd")||n.id==="stats-msg")return;
      const t=n.textContent.trim();if(t.length<INFO_MIN)return;
      n.classList.add("folded");if(!seen.has(t)){seen.add(t);items.push(n.innerHTML)}});
    if(!items.length)return;
    const d=document.createElement("details"),s=document.createElement("summary");
    d.className="more viewinfo";d.dataset.k=view.id;d.open=INFO_OPEN.has(view.id);s.textContent="Info";
    d.append(s);items.forEach(h=>{const p=document.createElement("p");p.className="vi";p.innerHTML=h;d.append(p)});
    view.append(d)});
}
document.addEventListener("toggle",e=>{const d=e.target;if(d.matches&&d.matches("details.viewinfo")){d.open?INFO_OPEN.add(d.dataset.k):INFO_OPEN.delete(d.dataset.k)}},true);
function decorateIcons(){
  document.querySelectorAll("summary b, details.acc .st b, #hero-t, .view>span.label, .oddsbox>.label, .tips>.label, .weights summary>span").forEach(el=>{
    if(el.querySelector(":scope>svg.ico"))return;
    const t=el.textContent.trim().toLowerCase(),m=ICOMAP.find(([k])=>t.startsWith(k));if(!m)return;
    el.insertAdjacentHTML("afterbegin",`<svg class="ico ico-${m[1]}" viewBox="0 0 24 24" aria-hidden="true">${ICO[m[1]]}</svg>`)});
}
// ---------- nuova partita / reset ----------
// tutto ciò che riguarda l'avversario o la partita va via; restano i tuoi dati (modulo, scelte fissate, stelle e OVR tuoi)
let RESET_ARMED=false,_resetT=0;
function newMatch(){
  st.sig=[];st.sigAuto=[];st.stats={};st.reads=[];st.red={mine:[],opp:[]};st.yel={mine:[],opp:[]};
  st.lv={...st.lv,opp:{}};st.lvr={...(st.lvr||{}),opp:{}};st.tag={};st.ovr={};st.odds={};delete st.home;st.modBlank={mine:true,opp:true};cloudReset();   // moduli e OVR tornano «–»
  st.guess={};st.tg={};st.tgMark="";st.mark=null;st.score="pari";st.gf=0;st.ga=0;st.left=null;st.pmode="auto";st.risk=null;gopen="";tgopen="";st.cmpBase=null;
  READMSG="";const m=$("stats-msg");if(m)m.textContent="Pronto per una nuova partita. Azzerati: statistiche, indizi, ipotesi e tattiche dell'avversario, marcatura, cartellini, sue stelle, moduli e OVR, probabilità, casa/fuori, punteggio. Restano le tue stelle e le tue scelte fissate.";
}
function showToast(html,ms=3500){const T=$("toast");T.innerHTML=html;T.hidden=false;clearTimeout(_toastT);_toastT=setTimeout(()=>{T.hidden=true},ms)}
// ---------- azioni ----------
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");
  const pop=$("abpop");if(pop&&!pop.hidden&&!(b&&b.dataset.act==="abinfo"))pop.hidden=true;
  if(!b)return;const a=b.dataset.act,v=b.dataset.v;
  if(a==="abinfo"){if(!pop.hidden){pop.hidden=true;return}
    const C=compute(),V=variant(st.score,C),p=votoF(V.total),sit=SIT[st.score][0].toLowerCase(),W=withMent(mxOf(V.ment),()=>weightsList(C,V));
    pop.innerHTML=`<div class="abp"><b>${p}<small>/100</small></b><div><strong>Preparazione</strong><span>Quanto la formazione consigliata è adatta contro il suo ${esc(fm(st.opp))}, con quello che sai di lui (ipotesi, indizi, stelle). 100 = la migliore possibile contro di lui, 0 = senza istruzioni. Situazione: ${esc(sit)}.</span></div></div>
      <div class="abw"><p class="abwh">Quanto pesa ogni scelta: i punti di preparazione che perderesti (+) o guadagneresti (−) togliendola.</p>${weightsHTML(W)}</div>
      <button class="link" data-act="abclose">Chiudi</button>`;
    pop.style.top=(document.querySelector(".appbar").getBoundingClientRect().bottom+6)+"px";   // sotto la barra, non sopra il tasto
    pop.hidden=false;return}
  if(a==="abclose")return;
  if(a==="sig"){if(st.sig.includes(v)){st.sig=st.sig.filter(x=>x!==v);st.sigAuto=st.sigAuto.filter(x=>x!==v)}else st.sig=[...st.sig,v]}
  else if(a==="sigreset"){st.sig=[];st.sigAuto=[]}
  else if(a==="card"){st.open=st.open||{};st.open[v]=!st.open[v]}
  else if(a==="mxa")st.mxa=v;
  else if(a==="mxb")st.mxb=v;
  else if(a==="mxgo"){st.x=v;st.xrole=byId[v].role;save();render();const el=$("xname");if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return}
  else if(a==="gopen")gopen=gopen===v?"":v;
  else if(a==="gclose")gopen="";
  else if(a==="mopen")mopen=mopen===v?"":v;
  else if(a==="mclose")mopen="";
  else if(a==="guess"){const [k,g]=v.split("|");st.guess=st.guess||{};const G=st.guess[st.opp]=st.guess[st.opp]||{};if(g)G[k]=g;else delete G[k];if(g&&g!=="none")roleStars("opp",k,g)}
  else if(a==="gapply"){const [k,g]=v.split("|");st.guess=st.guess||{};(st.guess[st.opp]=st.guess[st.opp]||{})[k]=g}
  else if(a==="gapplyall"){st.guess=st.guess||{};const G=st.guess[st.opp]=st.guess[st.opp]||{};proposals().forEach(p=>{if(!G[p.s.k])G[p.s.k]=p.id})}
  else if(a==="greset"){if(st.guess)delete st.guess[st.opp];gopen=""}
  else if(a==="extra"){const [k,x]=v.split(":");st.extra[k]=x}
  else if(a==="score"){st.score=v;st.risk=null;normScore()}
  else if(a==="pmode"){st.pmode=st.pmode===v?"auto":v;st.risk=null}
  // gol (tuoi o suoi) e minuti rimasti: la situazione segue la differenza gol
  else if(a==="gl"){const [w,dl]=v.split("|"),k=w==="me"?"gf":"ga";st[k]=Math.max(0,Math.min(20,st[k]+(+dl)));syncSit();st.risk=null}
  else if(a==="tl"){const [,dl]=v.split("|"),b=curMin();st.stats=st.stats||{};st.stats.min=String(Math.max(0,Math.min(130,Math.round(b==null?45:b)+(+dl)*5)));st.risk=null}
  else if(a==="riskreset")st.risk=null;
  else if(a==="safe")st.safe=!st.safe;
  else if(a==="stat"){let [k,d]=v.split("|");if(k==="ps"){k="pm";d=String(-(+d))}st.stats=st.stats||{};const cur=st.stats[k]===undefined||st.stats[k]===""?(k==="pm"?50:0):+st.stats[k];
    let nv=Math.round((cur+(st.stats[k]===undefined||st.stats[k]===""?(k==="pm"?0:Math.max(0,+d)):+d))*10)/10;nv=Math.max(0,k==="pm"?Math.min(100,nv):k==="min"?Math.min(130,nv):nv);st.stats[k]=String(nv)}
  else if(a==="statreset")newMatch();
  // tasto Reset in alto: primo tocco chiede conferma, il secondo (entro 3 secondi) azzera la partita
  else if(a==="reset"){if(!RESET_ARMED){RESET_ARMED=true;clearTimeout(_resetT);_resetT=setTimeout(()=>{RESET_ARMED=false;render()},3000)}
    else{RESET_ARMED=false;clearTimeout(_resetT);newMatch();save();render();SNAP=null;showToast(`<span class="label">Reset fatto</span><div>Partita azzerata: scegli di nuovo i moduli.</div>`);return}}
  else if(a==="lv"){const [side,k,l]=v.split("|"),n=+l,f=side==="mine"?st.mine:st.opp,L={...lvMap(side)};if(n===3||+L[k]===n)delete L[k];else L[k]=n;
    st.lv={...st.lv,[side]:{...((st.lv||{})[side]||{}),[f]:L}}}
  else if(a==="tag"){const [k,t]=v.split("|"),T=tagsOf(k),M={...tagMap(),[k]:T.includes(t)?T.filter(x=>x!==t):[...T,t]};if(!M[k].length)delete M[k];st.tag={...st.tag,[st.opp]:M}}
  else if(a==="lvreset"){st.lvr={};st.lv={mine:{...st.lv.mine,[st.mine]:{}},opp:{...st.lv.opp,[st.opp]:{}}};st.tag={...st.tag,[st.opp]:{}}}
  else if(a==="yel"){const [side,k]=v.split("|"),R=redOf(side),Y=yelOf(side);
    // nessuno → ammonito → secondo giallo (espulso) → nessuno
    if(R.includes(k)){st.red={...st.red,[side]:R.filter(x=>x!==k)};st.yel={...st.yel,[side]:Y.filter(x=>x!==k)}}
    else if(Y.includes(k))st.red={...st.red,[side]:[...R,k].slice(-2)};
    else st.yel={...st.yel,[side]:[...Y,k]}}
  else if(a==="yelreset")st.yel={mine:[],opp:[]};
  else if(a==="statswap")st.statSwap=!st.statSwap;
  else if(a==="red"){const [side,k]=v.split("|");const R=redOf(side);st.red={...st.red,[side]:R.includes(k)?R.filter(x=>x!==k):[...R,k].slice(-2)}}
  else if(a==="redreset")st.red={mine:[],opp:[]};
  else if(a==="sendfinal")st.sendFinal=!st.sendFinal;
  else if(a==="sendmatch"){
    // se manca cloud.js (aggiornamento caricato a metà) lo dico, invece di non fare nulla
    if(typeof sendMatch!=="function"){showToast(`<span class="label">Aggiornamento incompleto</span><div>Manca il file cloud.js: ricarica tutti i file della cartella app e riapri l'app.</div>`,6000);return}
    sendMatch();return}
  else if(a==="theme"){st.theme=themeNow()==="dark"?"light":"dark";applyTheme()}
  else if(a==="intro"){showIntro(0);return}
  else if(a==="guide"){const g=$("guide");g.hidden=false;g.scrollTop=0;g.querySelector(".gx").focus({preventScroll:true});return}
  else if(a==="guideclose"){$("guide").hidden=true;const b=document.querySelector('[data-act="guide"]');if(b)b.focus({preventScroll:true});return}
  else if(a==="intronext"){if(_slide<2){showIntro(_slide+1)}else{closeIntro()}return}
  else if(a==="introskip"){closeIntro();return}
  else if(a==="openmod"){const d=document.querySelector('details.acc[data-acc="1"]');if(d){d.open=true;setTimeout(()=>d.scrollIntoView({behavior:"smooth",block:"start"}),40)}return}
  else if(a==="tgopen")tgopen=tgopen===v?"":v;
  else if(a==="tgset"){const i=v.indexOf("|"),k=v.slice(0,i),o=v.slice(i+1);st.tg=st.tg||{};if(o==="Non so")delete st.tg[k];else st.tg[k]=o;if(!(k==="Marcatura"&&o==="A uomo"))tgopen=""}
  else if(a==="tgreset"){st.tg={};st.tgMark="";tgopen=""}
  else if(a==="markzona")st.mark=null;
  else if(a==="markuomo"){const S=markSuggest();st.mark=S?{mine:S.mine,opp:S.opp}:{mine:mySlots().filter(s=>s.role!=="POR")[0].k,opp:oppSlots().filter(s=>s.role!=="POR")[0].k}}
  else if(a==="markapply"){const [m,o]=v.split("|");st.mark={mine:m,opp:o}}
  else if(a==="mine"){st.mine=v;st.modBlank={...st.modBlank,mine:false}}
  else if(a==="only")st.only=!st.only;
  else if(a==="resetpicks")st.pick={};
  else if(a==="pick"){const [slot,id]=v.split("|"),k=slot==="SQ"?vkey(byId[id]):slot,C=compute();st.pick[k]=C.P[k]===id?"":id;if(slot!=="SQ"&&st.pick[k])roleStars("mine",k,st.pick[k])}
  else if(a==="rstar"){const [side,k,id,l]=v.split("|"),n=+l,f=side==="mine"?st.mine:st.opp;
    if(side==="mine")st.pick[k]=id;else{st.guess=st.guess||{};(st.guess[st.opp]=st.guess[st.opp]||{})[k]=id}
    const R={...(((st.lvr||{})[side])||{})[f]},key=k+"|"+id;if(+R[key]===n)delete R[key];else R[key]=n;
    st.lvr={...st.lvr,[side]:{...((st.lvr||{})[side]||{}),[f]:R}};roleStars(side,k,id)}
  else if(a==="readstats"){
    // prima della lettura fotografo la formazione in campo: il «Cambio tattico» mostra cosa cambia rispetto a quella
    const prevBase=st.cmpBase,V0=variant(st.score,compute());st.cmpBase={key:st.mine+"|"+st.opp,P:{...V0.P},ment:V0.ment,extra:{...V0.extra}};
    const r=readStats();$("stats-msg").textContent=r.msg;if(!r.ok){st.cmpBase=prevBase;save();render();return}
    // letto: scendo al «Cambio tattico», dove si vedono i cambi con la freccia
    READMSG=r.msg;save();render();const el=$("p-lineup");if(el)requestAnimationFrame(()=>el.scrollIntoView({behavior:"smooth",block:"start"}));return}
  else if(a==="jump"){st.open=st.open||{};st.open[v.slice(5)]=true;save();render();const acc=document.querySelector('details.acc[data-acc="4"]');if(acc)acc.open=true;const el=$(v);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return}
  else if(a==="copy"){const txt=assettoText(compute(),b.closest("#view-modulo")?"pari":null,b.closest("#view-modulo")?bestV():null),box=$("copybox"),done=()=>{b.textContent="Copiato";setTimeout(()=>b.textContent="Copia come testo",1500)};
    const fb=()=>{box.hidden=false;box.value=txt;if(location.hash!=="#modulo"&&location.hash!=="")location.hash="#modulo";box.focus();box.select()};
    try{navigator.clipboard.writeText(txt).then(done,fb)}catch(err){fb()}return}
  else return;
  save();render();
});
function grouped(list){ // unisce le voci con lo stesso nome (es. Attacca la profondità per le tre punte)
  const m=new Map();
  list.forEach(o=>{const i=byId[o.id],k=i.name+"|"+o.c+"|"+(o.f||"");if(!m.has(k))m.set(k,{id:o.id,name:i.name,c:o.c,f:o.f,roles:[]});m.get(k).roles.push(SHORT[i.role])});
  return [...m.values()];
}
const REP={DIF:["Difesa",["POR","DC","ED"]],CEN:["Centrocampo",["CC","EC"]],ATT:["Attacco",["ALA","PUN","COP","CEN"]],SQ:["Squadra",["SQ"]]};
function byName(roles){const m=new Map();D.instr.filter(i=>roles.includes(i.role)).forEach(i=>{const k=i.name;if(!m.has(k))m.set(k,{name:k,ids:[],roles:[]});m.get(k).ids.push(i.id);m.get(k).roles.push(SHORT[i.role])});return [...m.values()]}
function renderMatrix(){
  const ks=Object.keys(REP);
  pills($("mxa"),ks.map(k=>[k,REP[k][0]]),st.mxa,v=>st.mxa=v);
  pills($("mxb"),ks.map(k=>[k,REP[k][0]]),st.mxb,v=>st.mxb=v);
  const R=byName(REP[st.mxa][1]),C=byName(REP[st.mxb][1]),E=D.edges;
  const cell=(r,c)=>{const out=[];const add=(ty,list)=>{if(list.length)out.push(`<span class="mxc ${ty}${list.every(e=>e.c==="D")?" d":""}">${ty}</span>`)};
    add("B",E.filter(e=>e.t==="B"&&r.ids.includes(e.w)&&c.ids.includes(e.l)));
    add("A",E.filter(e=>e.t==="N"&&r.ids.includes(e.w)&&c.ids.includes(e.l)));
    add("S",E.filter(e=>e.t==="B"&&c.ids.includes(e.w)&&r.ids.includes(e.l)));
    add("I",E.filter(e=>e.t==="N"&&c.ids.includes(e.w)&&r.ids.includes(e.l)));
    return out.join("")};
  $("mx").innerHTML=`<tr><th></th>${C.map(c=>`<th><span>${esc(c.name.replace(/^.*?: /,""))}</span><small>${esc([...new Set(c.roles)].join(", "))}</small></th>`).join("")}</tr>`+
    R.map(r=>`<tr><th><button class="link" data-act="mxgo" data-v="${r.ids[0]}">${esc(r.name)}</button><small>${esc([...new Set(r.roles)].join(", "))}</small></th>${C.map(c=>`<td>${cell(r,c)}</td>`).join("")}</tr>`).join("");
}
function renderCounter(){
  renderMatrix();
  pills($("xrole"),Object.entries(D.roles),st.xrole,v=>{st.xrole=v;st.x=D.instr.find(i=>i.role===v).id});
  pills($("xinstr"),D.instr.filter(i=>i.role===st.xrole).map(i=>[i.id,i.name]),st.x,v=>st.x=v);
  const i=byId[st.x],E=D.edges;
  $("xname").textContent=i.name;
  $("xdesc").innerHTML=`${esc(D.roles[i.role])}. ${esc(i.desc)}${D.notes[i.id]?` <span class="note">${esc(D.notes[i.id])}</span>`:""}`;
  const col=(t,cls,list)=>`<div class="card col ${cls}"><h3>${t}</h3><div>${list.length?grouped(list).map(g=>`<button class="chip${dCls(g)}"${dTip(g)} data-go="${g.id}">${esc(g.name)}<small>${g.roles.join(", ")}</small></button>`).join(""):`<span class="empty">Nessuna relazione nota</span>`}</div></div>`;
  const ann=E.filter(e=>e.w===i.id&&e.t==="N").map(e=>({id:e.l,c:e.c,f:e.f}));
  $("xcols").innerHTML=
    col("Batte","g",E.filter(e=>e.w===i.id&&e.t==="B").map(e=>({id:e.l,c:e.c,f:e.f})))+
    (ann.length?col("Annulla","g",ann):"")+
    col("Soffre","b",E.filter(e=>e.l===i.id&&e.t==="B").map(e=>({id:e.w,c:e.c,f:e.f})))+
    col("È inutile contro","n",E.filter(e=>e.l===i.id&&e.t==="N").map(e=>({id:e.w,c:e.c,f:e.f})));
  $("xcols").onclick=e=>{const b=e.target.closest("[data-go]");if(b){st.x=b.dataset.go;st.xrole=byId[st.x].role;save();render()}};
}
// Quanto pesa ogni scelta: di quanti punti scenderebbe la preparazione se la togliessi (positivo = aiuta, negativo = danneggia).
// Va chiamata dentro withMent(mxOf(V.ment),…) come tipsHTML, così i numeri sono quelli della formazione mostrata.
function weightsList(C,V){
  const all=Object.entries(V.P).filter(([k,v])=>v),mk=markIdOf(V.P),om=oppMarkIdOf(V.P),mw=myWOf(V.P),tot=evalSet(all.map(x=>x[1]),C.S,1,mk,om,mw);
  const em=effMark();
  return all.map(([k,id])=>{const g=tot-evalSet(all.filter(([q])=>q!==k).map(x=>x[1]),C.S,1,em&&k===em.mine?null:mk,k===st.tgMark?null:om,mw);
    const s=C.SL.find(s=>s.k===k);return{k,id,g,p:ptsF(g),l:s?s.l:k.startsWith("SQ:")?k.slice(3):k}}).sort((a,b)=>b.g-a.g)}
function weightsHTML(W){
  return W.map(w=>`<div class="wrow"><span><b>${esc(w.l)}</b> ${esc(byId[w.id].name.replace(/^.*?: /,""))}</span><span class="sv ${w.p>0?"g":w.p<0?"b":""}">${w.p>0?"+":""}${w.p}</span></div>`).join("")}function tipsHTML(C,V){return withMent(ENG().ment?mxOf(V.ment):null,()=>tipsHTML0(C,V))}
function tipsHTML0(C,V){
  const H=h2h(V),tips=[];
  // motore nuovo: spiego perché la mentalità non è equilibrata (il rischio dipende da OVR, probabilità, uomini in più/in meno, valore del pareggio)
  if(ENG().ment&&st.score==="pari"&&V.ment!=="Equilibrata")tips.push(["acc","Mentalità",{
    "Molto offensiva":"Molto offensiva: sei nettamente favorito, quindi conviene spingere al massimo. Crei molto di più ma ti scopri molto: le istruzioni che coprono i tuoi buchi pesano parecchio.",
    "Offensiva":"Offensiva: sei favorito, quindi conviene attaccare di più. Crei di più ma lasci più spazio: le istruzioni che coprono i tuoi buchi pesano di più.",
    "Difensiva":"Difensiva: il rischio è alto (sfavorito, in inferiorità o il pareggio ti vale molto). Crei meno ma ti scopri molto meno.",
    "Molto difensiva":"Molto difensiva: il rischio è molto alto (nettamente sfavorito o in inferiorità). Crei poco ma ti scopri pochissimo."}[V.ment]]);
  const lab=(SL,P,id)=>{const k=Object.keys(P).find(k=>P[k]===id);if(!k)return"";if(k.startsWith("SQ:"))return"squadra";const s=SL.find(s=>s.k===k);return s?s.l.toLowerCase():""};
  if(H.losses.length){const r=H.losses[0];tips.push(["warn","Occhio",`il suo ${byId[r.w].name} (${r.wl}) ${r.t==="N"?"annulla":"batte"} il tuo ${byId[r.l].name} (${r.ll}).`])}
  const iv=infoValue();
  if(iv.length)tips.push(["acc","Guarda per primo",`cosa fa il suo ${iv[0].s.l.toLowerCase()}: da lì dipende ${iv[0].changed.slice(0,2).join(" e ").toLowerCase()}.`]);
  const W=weightsList(C,V);
  const best=W[0];
  if(best&&best.p>0){const nm=byId[best.id].name.replace(/^.*?: /,"");
    tips.push(["good","La chiave",`${best.k.startsWith("SQ:")?`${best.l} ${nm.toLowerCase()}`:`${nm} al ${best.l.toLowerCase()}`}: è la scelta che pesa di più. Senza, la preparazione scenderebbe di ${best.p} punti (elenco qui sotto).`])}
  const sm=strongMarkHTML();
  if(!tips.length&&!sm)return"";

  return `<div class="tips"><span class="label">Tre cose da sapere</span>${sm}${tips.slice(0,sm?2:3).map(([c,h,x])=>`<div class="tip ${c}"><b>${esc(h)}</b><span>${esc(x)}</span></div>`).join("")}</div>`;
}
function setSum(k,txt){document.querySelectorAll(`[data-sum="${k}"]`).forEach(el=>el.textContent=txt)}
function updateSums(C){
  const r=D.forms[st.opp],V=variant(st.score,C),nT=Object.keys(st.tg||{}).length,nG=Object.keys(guesses()).length;
  const att=r.includes("PUN")?"punta unica":r.includes("COP")?"due attaccanti":"centravanti e ali";
  const cross=(r.includes("ALA")||r.includes("EC")||r.includes("ED"))?"cross possibili":"niente cross";
  const holes=s=>{const n=(s.match(/tag bad">Scoperto/g)||[]).length;return n?`${n} ${n===1?"minaccia scoperta":"minacce scoperte"}`:"nessuna minaccia scoperta"};
  const tv=tipsHTML(C,bestV());document.querySelectorAll("[data-tips]").forEach(el=>el.innerHTML=tv);
  setSum("guess",nG?`${nG} ${nG===1?"ipotesi":"ipotesi"}`:"tocca un giocatore per un'ipotesi");
  setSum("1",`Tu ${fm(st.mine)} · Lui ${fm(st.opp)}${nG?` · ${nG} ${nG===1?"ipotesi":"ipotesi"}`:""}`);
  setSum("2",`${att}, ${cross}`);
  setSum("3",`${SIT[st.score][0]} · ${st.sig.length} ${st.sig.length===1?"indizio":"indizi"} · ${nT} sue tattiche`);
  setSum("stats",(st.reads||[]).length?`letture: ${st.reads.map(r=>r.min+"'").join(", ")}`:Object.values(st.stats||{}).some(v=>String(v).trim()!=="")?"numeri inseriti, premi «Leggi»":"copia i numeri da Stats");
  const RC=redCount();setSum("red",RC.me||RC.him?`${RC.n-RC.me} contro ${RC.o-RC.him}`:"nessuna");
  const ym=myBooked().length,yo=oppBooked().length;setSum("yel",ym||yo?[ym?`tu ${ym}`:"",yo?`lui ${yo}`:""].filter(Boolean).join(" · "):"nessuno");
  setSum("sig",st.sig.length?`${st.sig.length} ${st.sig.length===1?"segnato":"segnati"}`:"nessuno segnato");
  setSum("tg",nT?`${nT} ${nT===1?"impostata":"impostate"}`:"tutte «Non so»");
  setSum("4",`preparazione ${votoF(C.total)} in pareggio`);
  setSum("mark",markLabel(st.mark));
  setSum("extra",`Ritmo ${st.extra.ritmo} · Perdita di tempo ${st.extra.tempo}`);
  setSum("holes",holes(holesHTML(C,variant("pari",C))));
  setSum("holes-sit",holes(holesHTML(C,V)));
  setSum("5",`Pareggio · preparazione ${votoF(variant("pari",C).total)}`);
  setSum("risk",`prudenza ${Math.round((lamOf(st.score)-.3)/1.7*100)}/100${st.safe?" · sul sicuro":""}`);
  document.querySelectorAll("[data-appbar]").forEach(el=>el.innerHTML=`<div class="abr1"><b>LAVAGNA<br>PICK 7</b>
    <div class="abmid"><button class="abpill${RESET_ARMED?" armed":""}" data-act="reset" aria-label="${RESET_ARMED?"Tocca di nuovo per azzerare la partita":"Azzera la partita"}">${RESET_ARMED?"SICURO?":"RESET"}</button><button class="abpill abbig" data-act="sendmatch" aria-label="Invia la partita al database condiviso">INVIA</button></div>
    <div class="abtools"><div class="abrow"><button class="help" data-act="guide" aria-label="Quando usare la Lavagna durante la partita">⏱</button><button class="help theme" data-act="theme" aria-label="${themeNow()==="dark"?"Passa al tema chiaro":"Passa al tema scuro"}">${themeNow()==="dark"?"☀":"☾"}</button><button class="help" data-act="intro" aria-label="Come funziona">?</button></div></div></div>
    <div class="abr2"><span class="absub">Tu <em class="me">${esc(fmSide("mine"))}</em> · Lui <em class="him">${esc(fmSide("opp"))}</em> · ${RC.me||RC.him?`${RC.n-RC.me} contro ${RC.o-RC.him}`:esc(SIT[st.score][0])}</span>
    <div class="abnums">${LIVE.view==="modulo"?`<span class="xp"><button class="ab" data-act="abinfo" aria-label="Preparazione ${votoF(V.total)} su 100: cosa vuol dire"><span class="abv">${votoF(V.total)}</span><small>PREPARAZIONE</small></button></span>`:""}</div>${LIVE.on?prevHTML():""}`);
}

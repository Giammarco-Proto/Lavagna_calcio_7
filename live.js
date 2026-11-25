// Partita: formazione per punteggio, tempo e minuti, Previsione V/P/S e scontro diretto.
"use strict";
// ---------- formazione per situazione di punteggio ----------
const SIT={svantaggio:["Sto perdendo",.5],pari:["Pareggio",1],vantaggio:["Sto vincendo",1.6]};
// Regole fisse per situazione: ciò che non ha senso fare in quel punteggio, e ciò che va sempre fatto.
const RULES={
  svantaggio:{ban:["tq_linea_bassa","tq_press_basso"],force:{"SQ:Mentalità":"tq_ment_off"},extra:{ritmo:"Veloce",tempo:"No"},ment:"Offensiva"},
  vantaggio:{ban:["tq_ment_off","tq_press_alto"],force:{"SQ:Transizioni":"tq_tr_contro"},extra:{ritmo:"Lento",tempo:"Sì"},ment:"Difensiva"}};
function variant(sit,C){return memo("V"+sit,()=>variantRaw(sit,C))}
// I correttivi (uomini in più/in meno, forza, valore del pareggio) si sommano, così effetti opposti si annullano,
// e insieme non spostano il rischio più del 50% in su o del 33% in giù. Un correttivo piccolo da solo resta quasi uguale;
// più correttivi nella stessa direzione si attenuano man mano che si avvicinano al limite.
const CORRMAX=Math.log(1.5);
const combineF=(...f)=>{const s=f.reduce((a,x)=>a+Math.log(x),0);return Math.exp(CORRMAX*Math.tanh(s/CORRMAX))};
const corrOf=sit=>combineF(manF(),strengthF(),sitF(sit));
// l'assetto base è quello del pareggio
const baseLam=()=>Math.round(corrOf("pari")*100)/100;
// ---------- punteggio e tempo (scheda Partita) ----------
// Il rischio dipende anche da quanti gol di differenza e da quanto tempo resta. Vale solo in Partita (LIVE.on):
// Prepara resta il piano di inizio partita. Le probabilità iniziali pesano sempre (forza, valore del pareggio) tramite corrOf.
//  Sotto: servono n gol in t minuti → più urgenza = meno prudenza (n/t a 45' ≈ la base di prima). Sopra: più il vantaggio è
//  largo rispetto al tempo che manca, più ti copri; con tanto tempo davanti il vantaggio è fragile, quindi puoi ancora osare un po'.
//  Pari: il tempo conta solo se l'hai inserito: da favorito un pari tardi è una sconfitta (spingi), da sfavorito è un buon risultato (proteggi).
const LIVE={on:false};
const goalsOf=()=>{const a=Math.max(0,Math.min(20,Math.round(+st.gf)||0)),b=Math.max(0,Math.min(20,Math.round(+st.ga)||0));return{me:a,him:b,d:a-b}};
// minuto attuale della partita: è lo stesso della scheda Statistiche. Minuti che mancano al 90': 0 oltre il 90'
function curMin(){const m=parseFloat(String((st.stats||{}).min??"").replace(",","."));return isNaN(m)?null:Math.max(0,m)}
function leftMin(){const m=curMin();return m==null?null:Math.max(0,Math.min(90,90-m))}
// Curve a tratti (minuti rimasti → moltiplicatore del rischio), stime mie.
//  Vantaggio: la prudenza sale piano e solo negli ultimi 10' ti chiudi a riccio (Molto difensiva). Svantaggio: il contrario.
//  Pari: «Chiudila» (cerchi il gol) sale d'intensità col passare dei minuti; «Cerca i supplementari» (temporeggi) idem verso la prudenza.
const interp=(P,x)=>{if(x<=P[0][0])return P[0][1];for(let i=1;i<P.length;i++)if(x<=P[i][0]){const a=P[i-1],b=P[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])}return P[P.length-1][1]};
const CURVE={
  lead:[[0,1.25],[5,1.1],[10,.9],[15,.85],[30,.78],[60,.65],[90,.55]],
  trail:[[0,.55],[10,.6],[15,.75],[30,1],[60,1.4],[90,1.6]],
  close:[[0,.5],[10,.55],[30,.7],[60,.85],[90,.95]],
  sup:[[0,1.6],[10,1.5],[30,1.3],[60,1.12],[90,1.02]]};
// forza di partenza (probabilità se ci sono, altrimenti OVR): da −1 (sfavorito) a +1 (favorito)
const edgeNow=()=>{const P=oddsP(),g=ovrGap();return P?P.edge:g!=null?Math.max(-1,Math.min(1,g/20))*.5:null};
const PMODES=["auto","sup","close"];
// consiglio nel pareggio: da favorito il pari vale come una sconfitta (chiudila), da sfavorito ti va bene (supplementari)
function pariRec(){const e=edgeNow();return e==null?null:e>=.12?"close":e<=-.12?"sup":null}
// modo in uso nel pareggio: quello scelto a mano o, in automatico, il consigliato quando il tempo è poco
const liveExtra=()=>{const ex={...st.extra};if(LIVE.on){const m=pariMode();if(m==="sup")ex.ritmo="Lento";else if(m==="close")ex.ritmo="Veloce"}return ex};
function pariMode(){const m=PMODES.includes(st.pmode)?st.pmode:"auto";if(m!=="auto")return m;const t=leftMin();return t!=null&&t<=45?pariRec():null}
function liveF(sit){
  if(!LIVE.on)return 1;
  const G=goalsOf(),t0=leftMin(),t=t0==null?45:t0;
  if(sit==="svantaggio"){const n=Math.min(3,Math.max(1,-G.d)),adj=1/(1+.25*(n-1));return (t0==null?1:interp(CURVE.trail,t))*adj}
  if(sit==="vantaggio"){const n=Math.min(3,Math.max(1,G.d)),adj=1+.1*(n-1);return Math.min(1.25,(t0==null?1:interp(CURVE.lead,t))*adj)}
  const m=PMODES.includes(st.pmode)?st.pmode:"auto";
  // scelta a mano: vale la tua intenzione (poco corretta dalla forza di partenza), non il rischio di inizio partita
  if(m!=="auto")return interp(CURVE[m],t)*Math.sqrt(strengthF())/Math.max(.3,baseLam());
  const e=edgeNow();if(t0==null||e==null)return 1;
  const L=Math.max(0,Math.min(1,(60-t)/60));return Math.max(.5,Math.min(1.6,Math.exp(-2.2*e*L)));
}
// Sopra/sotto con i minuti inseriti: scelgo direttamente la prudenza (0-100) dal tempo, senza passare dal rischio di inizio partita,
// che con probabilità estreme saturava e non lasciava più muovere la prudenza. Le probabilità/OVR spostano di pochi punti (±15), i gol di differenza e gli uomini in meno un po'.
//  Sopra: sale col passare dei minuti, Molto difensiva (≥65) solo negli ultimi 12'. Sotto: scende, Molto offensiva (≤23) dagli ultimi 25'.
const POSC={
  // 100 = nessun rischio (ultimi 10' in vantaggio), 0 = tutto o niente (ultimi 10' sotto). Oltre 100 / sotto 0 lascia margine alle correzioni.
  lead:[[0,115],[10,115],[12,80],[15,62],[20,56],[30,48],[45,38],[60,30],[90,15]],
  trail:[[0,-15],[10,-12],[15,8],[25,16],[45,22],[60,28],[75,34],[90,40]]};
function liveLam(sit){
  if(!LIVE.on||sit==="pari")return null;
  const t0=leftMin();if(t0==null)return null;
  const G=goalsOf(),e=edgeNow()||0,man=(manF()-1)*30;
  const pos=sit==="vantaggio"?interp(POSC.lead,t0)+6*(Math.min(3,Math.max(1,G.d))-1)-15*e+man
    :interp(POSC.trail,t0)-5*(Math.min(3,Math.max(1,-G.d))-1)-12*e+man;
  return .3+1.7*Math.max(0,Math.min(100,pos))/100}
// ---- Previsione: vittoria · pareggio · sconfitta mentre si gioca ----
// Parto dalle probabilità di Prepara (o, se mancano, da OVR; senza niente, partita alla pari) e ne ricavo quanti gol fa in media
// ogni squadra in 90' (Poisson). Da lì: gol già fatti, minuti che restano e uomini in meno cambiano la previsione.
// Le due funzioni «pure» (poissonRow, forecastWDL) non toccano né `st` né la pagina: sono quelle provate in tests.html.
const FC={
  MATCH_MIN:90,            // durata della partita
  RED_SCORE:.78,           // un uomo in meno: segna il 22% in meno…
  RED_CONCEDE:1.12,        // …e concede il 12% in più
  DRAW_NO_DATA:.27,        // senza probabilità né OVR: pareggio al 27%
  EDGE_TO_WIN:.35,         // quanto il vantaggio (OVR) sposta la vittoria
  MAX_GOALS:14};           // gol considerati per squadra (oltre, la probabilità è trascurabile)
const _fcCal={};
/** Probabilità di fare 0,1,2… gol con media `lam`. */
const poissonRow=(lam,n=FC.MAX_GOALS)=>{const a=[Math.exp(-lam)];for(let k=1;k<n;k++)a.push(a[k-1]*lam/k);return a};
/** [vittoria, pareggio, sconfitta] se `x` e `y` sono i gol medi che restano e `lead` è il vantaggio attuale in gol. */
function resultOdds(x,y,lead){
  const A=poissonRow(x),B=poissonRow(y);let W=0,D=0,L=0;
  for(let i=0;i<A.length;i++)for(let j=0;j<B.length;j++){const p=A[i]*B[j],z=i-j+lead;if(z>0)W+=p;else if(z===0)D+=p;else L+=p}
  return[W,D,L]}
/** Gol medi in 90' [tu, lui] che riproducono le probabilità di partenza w/d/l (somma 1). Cerca su una griglia e poi affina. */
function calibrateGoals(w,d,l){
  const key=[w,d,l].map(x=>x.toFixed(3)).join();if(_fcCal[key])return _fcCal[key];
  let best=[1.3,1.3],bestErr=9;
  const scan=(x0,x1,y0,y1,step)=>{for(let x=x0;x<=x1+1e-9;x+=step)for(let y=y0;y<=y1+1e-9;y+=step){if(x<.05||y<.05)continue;const r=resultOdds(x,y,0),e=(r[0]-w)**2+(r[1]-d)**2+(r[2]-l)**2;if(e<bestErr){bestErr=e;best=[x,y]}}};
  scan(.1,4,.1,4,.1);scan(best[0]-.1,best[0]+.1,best[1]-.1,best[1]+.1,.01);
  return _fcCal[key]=best}
/**
 * Previsione completa, funzione pura.
 * @param {{w:number,d:number,l:number}} start  probabilità di inizio partita (somma 1)
 * @param {{goalDiff:number, minute:(number|null), redMe:number, redHim:number}} now  gol di scarto, minuto attuale, espulsi
 * @returns {{w:number,d:number,l:number}} percentuali intere che sommano a 100
 */
function forecastWDL(start,now){
  const [lm,lh]=calibrateGoals(start.w,start.d,start.l),m=now.minute==null?0:now.minute;
  const left=Math.max(0,Math.min(FC.MATCH_MIN,FC.MATCH_MIN-m))/FC.MATCH_MIN;
  const mine=Math.pow(FC.RED_SCORE,now.redMe)*Math.pow(FC.RED_CONCEDE,now.redHim),his=Math.pow(FC.RED_SCORE,now.redHim)*Math.pow(FC.RED_CONCEDE,now.redMe);
  const raw=resultOdds(lm*left*mine,lh*left*his,now.goalDiff).map(x=>x*100),f=raw.map(Math.floor);
  const missing=100-f.reduce((a,b)=>a+b,0);   // arrotondamento: i punti che mancano vanno ai resti più grandi
  raw.map((x,i)=>[x-f[i],i]).sort((a,b)=>b[0]-a[0]).slice(0,missing).forEach(x=>f[x[1]]++);
  return{w:f[0],d:f[1],l:f[2]}}
/** Raccoglie i dati dallo stato dell'app e chiama forecastWDL. `est`: nessuna probabilità inserita, stima da OVR. */
function forecast(){
  const P=oddsP();let start,est=false;
  if(P)start={w:P.w,d:P.d,l:P.l};
  else{est=true;const e=edgeNow()||0,d=FC.DRAW_NO_DATA,w=Math.max(.04,Math.min(.92-d,(1-d)/2+e*FC.EDGE_TO_WIN));start={w,d,l:1-d-w}}
  const R=redCount(),m=curMin();
  return{...forecastWDL(start,{goalDiff:goalsOf().d,minute:m,redMe:R.me,redHim:R.him}),est,known:m!=null}}
function prevHTML(){const F=forecast();
  return `<div class="prev" role="img" aria-label="Previsione: vittoria ${F.w}%, pareggio ${F.d}%, sconfitta ${F.l}%">
    <div class="pvrow"><span class="pvt">Previsione</span><div class="pvbar"><i class="w" style="width:${F.w}%"></i><i class="d" style="width:${F.d}%"></i><i class="l" style="width:${F.l}%"></i></div></div>
    <div class="pvk"><span class="w"><i></i>Vittoria <b>${F.w}%</b></span><span class="d"><i></i>Pareggio <b>${F.d}%</b></span><span class="l"><i></i>Sconfitta <b>${F.l}%</b></span></div></div>`}
const lamOf=sit=>{if(st.risk!=null)return st.risk;
  {const L=liveLam(sit);if(L!=null)return Math.round(L*100)/100}
  const raw=(sit==="pari"?baseLam():SIT[sit][1]*corrOf(sit))*liveF(sit);
  return Math.round((LIVE.on?Math.max(.3,Math.min(2,raw)):raw)*100)/100};
function variantRaw(sit,C){
  const lam=lamOf(sit),NE=!!ENG().ment;
  if(sit==="pari"&&NE){
    // motore nuovo: senza rischio scelto a mano il pareggio è già l'assetto base; altrimenti la mentalità si riconsidera con quel rischio
    if(st.risk==null&&Math.abs(lam-baseLam())<.02)return{P:C.P,extra:liveExtra(),ment:mentLabel(C.mx),total:C.total,lam};
    const mx=mentFor(lam),f=st.pick["SQ:Mentalità"]===undefined?{"SQ:Mentalità":isOff(mx)?"tq_ment_off":""}:{};
    return withMent(mx,()=>{const P=optimize(C.K,C.S,{...C.P,...f},f,lam,[],.1),me=P["SQ:Mentalità"]?(mx==="voff"?"voff":"off"):isDef(mx)?mx:"eq";
      return withMent(me,()=>({P,extra:liveExtra(),ment:mentLabel(me),total:evalSet(Object.values(P).filter(Boolean),C.S,1,markIdOf(P),oppMarkIdOf(P),myWOf(P)),lam}))});
  }
  if(sit==="pari"){
    if(Math.abs(lam-1)<.02)return{P:C.P,extra:liveExtra(),ment:C.P["SQ:Mentalità"]?"Offensiva":"Equilibrata",total:C.total,lam};
    const P=optimize(C.K,C.S,{...C.P},{},lam,[],.1);
    return{P,extra:liveExtra(),ment:P["SQ:Mentalità"]?"Offensiva":"Equilibrata",total:evalSet(Object.values(P).filter(Boolean),C.S,1,markIdOf(P),oppMarkIdOf(P),myWOf(P)),lam};
  }
  const R=RULES[sit],start={...C.P,...R.force};
  Object.keys(start).forEach(k=>{if(R.ban.includes(start[k]))start[k]=""});
  // motore nuovo: in svantaggio attacchi almeno «Offensiva», in vantaggio ti copri almeno «Difensiva»; il rischio può spingerti al «Molto»
  const m0=NE?mentFor(lam):null,mxs=!NE?null:sit==="svantaggio"?(isOff(m0)?m0:"off"):(isDef(m0)?m0:"dif");
  return withMent(mxs,()=>{
    const P=optimize(C.K,C.S,start,R.force,lam,R.ban,.1);
    return{P,extra:{...R.extra},ment:NE?mentLabel(mxs):R.ment,total:evalSet(Object.values(P).filter(Boolean),C.S,1,markIdOf(P),oppMarkIdOf(P),myWOf(P)),lam};
  });
}
const SHORTSLOT={POR:"Portiere",DC1:"Centrale",DC2:"Centrale",ED1:"Terzino sx",ED2:"Terzino dx",CC1:"Centroc.",CC2:"Centroc.",EC1:"Esterno sx",EC2:"Esterno dx",PUN1:"Punta",COP1:"Attacc. sx",COP2:"Attacc. dx",ALA1:"Ala sx",CEN1:"Centravanti",ALA2:"Ala dx"};
// Caso peggiore: la combinazione di istruzioni e tattiche avversarie che fa più male al tuo assetto
// (rispetta le tue ipotesi e gli indizi che hai segnato).
function worstCase(P){return memo("W"+JSON.stringify(P),()=>worstRaw(P))}
function worstRaw(P){
  const mine=Object.values(P).filter(Boolean),G=guesses(),keys=[];
  oppSlots().forEach(s=>{const opts=D.instr.filter(i=>i.role===s.role).map(i=>i.id);
    keys.push({k:"o:"+s.k,label:s.l,opts:G[s.k]?[G[s.k]==="none"?"":G[s.k]]:["",...opts]})});
  const sigN={};D.signals.filter(g=>st.sig.includes(g.id)).forEach(g=>g.nodes.forEach(n=>sigN[vkey(byId[n])]=n));
  const gr={};Object.keys(D.prior).forEach(id=>(gr[vkey(byId[id])]=gr[vkey(byId[id])]||[]).push(id));
  Object.entries(gr).forEach(([k,o])=>{const tv=tgOf(k.slice(3)),T=TGMAP[k.slice(3)];
    keys.push({k,label:k.slice(3),opts:tv&&T&&T.map?[T.map[tv]||""]:sigN[k]?[sigN[k]]:["",...o]})});
  const O={};keys.forEach(x=>O[x.k]=x.opts.length===1?x.opts[0]:"");
  const mk=markIdOf(P),mo=effMark()?"o:"+effMark().opp:"";
  const M=()=>{const m=new Map(),lp=new Map(),wt=new Map();Object.entries(O).forEach(([k,v])=>{if(v){m.set(v,1);lp.set(v,Math.max(lp.get(v)||0,k===mo?MARKF:1));if(k.startsWith("o:")){const w=oppW(k.slice(2),v);if(w!==1)wt.set(v,Math.max(wt.get(v)||0,w))}}});m.lossP=lp;m.wt=wt;return m};
  const om=oppMarkIdOf(P),mw=myWOf(P),evalSet=(a,M,l)=>evalSetBase(a,M,l,mk,om,mw);
  for(let pass=0;pass<3;pass++){let ch=false;
    keys.forEach(x=>{if(x.opts.length<2)return;const cur=O[x.k];let best=cur,bv=Infinity;
      x.opts.forEach(o=>{O[x.k]=o;const v=evalSet(mine,M());if(v<bv-1e-9){bv=v;best=o}});O[x.k]=best;if(best!==cur)ch=true});
    if(!ch)break}
  // esposizione: il danno netto delle sue scelte che ti colpiscono senza che tu le copra abbastanza
  const mineSet=new Set(mine);
  const decisive=keys.filter(x=>x.opts.length>1&&O[x.k]).map(x=>{const cur=O[x.k];O[x.k]="";const d=evalSet(mine,M())-evalSet(mine,(O[x.k]=cur,M()));
      const hits=[...new Set((BEATS[cur]||[]).filter(e=>mineSet.has(e.l)).map(e=>e.l))];return{x,id:cur,d,hits}})
    .filter(r=>r.d>.03).sort((a,b)=>b.d-a.d);
  return{exposure:decisive.reduce((s,r)=>s+r.d,0),decisive};
}
// ---------- scontro diretto: e se anche lui usasse la Lavagna? ----------
const INV={svantaggio:"vantaggio",vantaggio:"svantaggio",pari:"pari"};
function theirPlan(){return memo("TP",()=>{
  const keep={gf:st.gf,ga:st.ga,mine:st.mine,opp:st.opp,pick:st.pick,guess:st.guess,sig:st.sig,mark:st.mark,safe:st.safe,score:st.score,risk:st.risk,extra:st.extra,red:st.red,yel:st.yel,lv:st.lv,tag:st.tag,ovr:st.ovr,home:st.home,tg:st.tg,tgMark:st.tgMark};
  try{
    // il suo punto di vista: conosce solo il tuo modulo; se tu perdi, lui vince
    // le tattiche che hai visto fare a LUI non sono informazioni che lui ha su di te
    st.tg={};st.tgMark="";
    st.red={mine:redOf("opp"),opp:redOf("mine")};st.yel={mine:yelOf("opp"),opp:yelOf("mine")};st.lv={mine:{...(keep.lv||{}).opp},opp:{...(keep.lv||{}).mine}};st.tag={};st.ovr={mine:(keep.ovr||{}).opp,opp:(keep.ovr||{}).mine};st.home=keep.home===true?false:keep.home===false?true:undefined;
    st.gf=keep.ga;st.ga=keep.gf;
    st.mine=keep.opp;st.opp=keep.mine;st.pick={};st.guess={};st.sig=[];st.mark=null;st.safe=false;st.risk=null;st.score=INV[keep.score];st.extra={ritmo:"Normale",tempo:"No"};
    const C=compute(),V=variant(st.score,C);
    // quanto lui può permettersi di rischiare (dal suo punto di vista: forza, uomini, punteggio)
    return{P:{...V.P},SL:C.SL,lam:lamOf(st.score)};
  }finally{Object.assign(st,keep)}
})}
function h2h(V){return memo("H2H"+JSON.stringify(V.P),()=>{
  const T=theirPlan(),em=effMark();
  const det=(P,markedKey)=>{const m=new Map(),lp=new Map();Object.entries(P).forEach(([k,v])=>{if(v){m.set(v,1);lp.set(v,Math.max(lp.get(v)||0,k===markedKey?MARKF:1))}});m.lossP=lp;return m};
  const my=Object.values(V.P).filter(Boolean),th=Object.values(T.P).filter(Boolean);
  // ognuno pesa il rischio come lo pesa nello scegliere: chi è più forte può permettersi istruzioni più esposte.
  // Così lo scontro misura la tattica, non chi è favorito (quello lo dicono probabilità e OVR).
  const a=evalSet(my,det(T.P,em?em.opp:null),V.lam||1,markIdOf(V.P),oppMarkIdOf(V.P),myWOf(V.P)),b=evalSet(th,det(V.P,null),T.lam||1,null),net=a-b;
  const myS=new Set(my),thS=new Set(th),where=(P,id)=>{const k=Object.keys(P).find(k=>P[k]===id);return !k?"":k.startsWith("SQ:")?"squadra":null};
  const lab=(SL,P,id)=>{const w=where(P,id);if(w==="squadra")return "squadra";const s=SL.find(s=>P[s.k]===id);return s?s.l.toLowerCase():""};
  const pairs=(A,B,PA,PB,SLA,SLB)=>D.edges.filter(e=>A.has(e.w)&&B.has(e.l)).map(e=>({w:e.w,l:e.l,t:e.t,c:e.c,wl:lab(SLA,PA,e.w),ll:lab(SLB,PB,e.l),v:EW(e)}))
    .sort((x,y)=>y.v-x.v);
  return{net,score:r5(50+50*Math.tanh(net/2)),wins:pairs(myS,thS,V.P,T.P,mySlots(),T.SL),losses:pairs(thS,myS,T.P,V.P,T.SL,mySlots()),T};
})}
function worstHTML(V){
  const W=worstCase(V.P);
  if(!W.decisive.length)return `<div class="worst"><div><b>Se lui si adatta a te</b><small>Nessuna sua scelta ti colpisce senza che tu la copra: assetto robusto.</small></div>${vbarR(0)}</div>`;
  return `<div class="worst"><div><b>Se lui si adatta a te</b><small>Rischio ${rischio(W.exposure)}/100. Può toglierti fino a ${ptsF(W.exposure)} punti di preparazione con:</small>
    <ul>${W.decisive.slice(0,4).map(r=>`<li><b>${esc(r.x.k.startsWith("o:")?r.x.label+": "+byId[r.id].name:byId[r.id].name)}</b> contro ${r.hits.map(h=>esc(byId[h].name)).join(", ")} ${svP(-ptsF(r.d))}</li>`).join("")}</ul></div>${vbarR(W.exposure)}</div>`;
}
function shortSlot(s,f){
  const [,d,m]=(f||st.mine).split("-");
  if(s.k==="DC1"||s.k==="DC2")return d==="2"?(s.k==="DC1"?"Centrale sx":"Centrale dx"):"Centrale";
  if(s.k==="CC1"||s.k==="CC2")return m==="2"?(s.k==="CC1"?"Centroc. sx":"Centroc. dx"):"Centroc.";
  return SHORTSLOT[s.k]||s.l;
}
// Tattiche di squadra con le sezioni, l'ordine e i nomi della schermata «Strategia avanzata» del gioco: [voce, valore di V, valore di B, automatica]
function sezOf(V,B){
  const val=(P,k,def)=>{const id=P["SQ:"+k];return id?byId[id].name.split(": ")[1]:def};
  const markV=m=>{if(!m)return"A zona";const a=mySlots().find(s=>s.k===m.mine),o=oppSlots().find(s=>s.k===m.opp);return a&&o?`A uomo: ${a.l} → loro ${o.l}`:"A zona"};
  const tempo=x=>x==="Sì"?"Sì, in vantaggio":"No";
  return [
    ["Atteggiamento",[["Mentalità",V.ment,B.ment],["Ritmo",V.extra.ritmo,B.extra.ritmo],["Perdita di tempo",tempo(V.extra.tempo),tempo(B.extra.tempo)]]],
    ["Senza palla",[["Linea difensiva",val(V.P,"Linea difensiva","Media"),val(B.P,"Linea difensiva","Media")],["Pressing",val(V.P,"Pressing","Medio"),val(B.P,"Pressing","Medio")],
      ["Marcatura",markV(st.mark),markV(st.mark)],["Contrasti",val(V.P,"Contrasti","Normali"),val(B.P,"Contrasti","Normali")]]],
    ["Con la palla",[["Passaggi",val(V.P,"Passaggi","Misti"),val(B.P,"Passaggi","Misti")],["Ampiezza",val(V.P,"Ampiezza","Normale"),val(B.P,"Ampiezza","Normale")],
      ["Transizioni",val(V.P,"Transizioni","Equilibrate"),val(B.P,"Transizioni","Equilibrate")],["Tiri da fuori",val(V.P,"Tiri da fuori","Normale"),val(B.P,"Tiri da fuori","Normale")]]],
    ["Palle inattive",[["Schema sugli angoli",val(V.P,"Angoli","A tua scelta"),val(B.P,"Angoli","A tua scelta")],
      ["Chi tira i rigori","Automatico","Automatico",1],["Chi tira le punizioni","Automatico","Automatico",1],["Chi batte gli angoli","Automatico","Automatico",1],["Ordine dei rigori finali","Automatico","Automatico",1]]]];
}
// «Cambio tattico» (Partita): le voci cambiate dall'ultima lettura si vedono con la freccia, la nuova in verde
const arrowH=(a,b)=>`<span class="was">${esc(a)}</span><i class="arw">→</i><span class="now">${esc(b)}</span>`;
function lineup3HTML(C,forced,compact,mode){
  const cmp=mode==="cmp",cb=st.cmpBase&&st.cmpBase.key===st.mine+"|"+st.opp?st.cmpBase:null,best=mode==="best",sit=forced||st.score,V=best?bestV():variant(sit,C),B=best?V:cmp?(cb||variant("pari",C)):variant("pari",C),SL=C.SL,diff=cmp||sit!=="pari";
  const line=r=>["PUN","COP","CEN","ALA"].includes(r)?0:["CC","EC"].includes(r)?1:["DC","ED"].includes(r)?2:3;
  const nm=id=>id?byId[id].name:"Nessuna istruzione";
  const SB=best?{}:stability(sit),RM=redOf("mine"),SLall=slots(st.mine);
  const box=s=>{if(RM.includes(s.k))return `<div class="ls red"><b>${esc(shortSlot(s))}</b><span>Espulso</span></div>`;
    const id=V.P[s.k],ch=diff&&(id||"")!==(B.P[s.k]||""),un=SB[s.k]&&!SB[s.k].solid;
    const mk=st.mark&&st.mark.mine===s.k?`<em class="mk">marca: loro ${esc((oppSlots().find(x=>x.k===st.mark.opp)||{l:""}).l)}</em>`:"";
    return `<div class="ls${ch?" ch":""}${id?"":" none"}${yelOf("mine").includes(s.k)?" yel":""}${un?" un":""}${FLASH.has(s.k)?" flash":""}"><b>${esc(shortSlot(s))}</b><span>${ch&&cmp?arrowH(nm(B.P[s.k]),nm(id)):esc(nm(id))}</span>${ch&&!cmp?`<i>cambia</i>`:""}${un?`<em class="unc">incerto</em>`:""}${mk}${lvBadge("mine",s.k)}</div>`};
  const pitchH=(compact?ovrNoteHTML():"")+redNoteHTML(V.P)+`<div class="lpitch">${[0,1,2,3].map(n=>SLall.filter(s=>line(s.role)===n)).filter(r=>r.length).map(r=>`<div>${r.map(box).join("")}</div>`).join("")}</div>`;
  const SEZ=sezOf(V,B);
  const voci=SEZ.flatMap(s=>s[1]).filter(v=>!v[3]);
  const sq=`<div class="gsq">${SEZ.map(([h,rows])=>`<div class="gsec"><span class="label">${esc(h)}</span>${rows.map(([k,a,b,auto])=>{const ch=diff&&a!==b;
    const fk="SQ:"+(k==="Schema sugli angoli"?"Angoli":k);
    return `<div class="grow${ch?" ch":""}${auto?" auto":""}${FLASH.has(fk)?" flash":""}"><span>${esc(k)}</span><b>${ch&&cmp?arrowH(b,a):esc(a)}</b>${ch&&!cmp?`<i>cambia</i>`:""}</div>`}).join("")}</div>`).join("")}
    <p class="note xp">«Automatico» sui battitori: la Lavagna non li gestisce, lascia la scelta del gioco. Sugli angoli «A tua scelta» vuol dire che nessuno schema conviene in modo netto (il Secondo palo non è valutato).</p></div>`;
  const nch=!diff?0:SL.filter(s=>(V.P[s.k]||"")!==(B.P[s.k]||"")).length+voci.filter(([k,a,b])=>a!==b).length;
  const what=cmp?(cb?"dall'ultima lettura":"dalla formazione di Prepara"):"rispetto al pareggio";
  const head=`<div class="total"><div><b>${esc(SIT[sit][0])}${st.risk!=null?" · rischio personalizzato":""}${st.safe?" · sul sicuro":""} · ${esc(fm(st.mine))} contro ${esc(fm(st.opp))}</b><small>${best?"La migliore contro di lui, senza le scelte fatte a mano.":sit==="pari"&&!cmp?(st.risk!=null?"Le tue scelte, ricalcolate con il rischio che hai scelto.":"Le tue scelte: l'assetto base.")+"":nch?`${nch} ${nch===1?"cambio":"cambi"} ${what}${cmp?", con la freccia":", evidenziati"}.`:`Nessun cambio ${what}.`}</small></div><div class="plab xp"><span class="label">Preparazione</span>${vbarF(V.total,true)}</div></div>`;
  const nun=SL.filter(s=>SB[s.k]&&!SB[s.k].solid).length;
  const stabNote=`<p class="note xp">${nun?`${nun} ${nun===1?"posto è incerto":"posti sono incerti"} (bordo tratteggiato): la scelta cambia se le mie stime sono un po' diverse. Lì decidi tu.`:"Tutte le scelte sono solide: non cambiano anche variando le mie stime."}</p>`;
  const sqBlock=`<h3 style="font-size:17px;margin-top:4px">Tattiche di squadra${compact&&nch?` <small class="nchg">${nch} ${nch===1?"cambio evidenziato":"cambi evidenziati"}</small>`:""}</h3>`+sq;
  return head+pitchH+stabNote+sqBlock+
    `<p class="note xp">${sit==="svantaggio"?"Da perdente conto il rischio a metà e preferisco ciò che batte l'avversario anche se ti espone. Regole fisse: Mentalità offensiva e Ritmo veloce sempre; niente Linea bassa né Pressing basso. La preparazione mostrata è calcolata a rischio normale, per confrontarla con il pareggio.":sit==="vantaggio"?"Da vincente il rischio pesa di più e preferisco ciò che non si fa battere. Regole fisse: Contropiede, Ritmo lento e Perdita di tempo; niente Mentalità offensiva né Pressing alto. Ritmo lento è una mia deduzione.":"Le versioni da perdente e da vincente partono da questo assetto e cambiano solo dove, con un diverso peso del rischio, conviene davvero."}</p>`;
}
// Prepara: la formazione migliore (100 su 100), calcolata senza le scelte fatte a mano
function bestV(){return memo("OPT",()=>{const keep=st.pick;try{st.pick={};return variantRaw("pari",computeRaw())}finally{st.pick=keep}})}
function redCount(){const n=slots(st.mine).length,o=slots(st.opp).length;return{me:n-mySlots().length,him:o-oppSlots().length,n,o}}
function redNoteHTML(P){
  const R=redCount(),YM=myBooked(),YO=oppBooked();let out="";
  const who=(f,keys)=>slots(f).filter(s=>keys.includes(s.k)).map(s=>s.l.toLowerCase()).join(" e ");
  if(R.me||R.him){
    const parts=[R.me?`Senza il tuo ${who(st.mine,redOf("mine"))}: le scelte sono rifatte con chi resta.`:"",R.him?`Senza il suo ${who(st.opp,redOf("opp"))}: le sue istruzioni non contano più.`:"",
      R.me>R.him?"In inferiorità conto il rischio di più: preferisco ciò che non si fa battere.":R.him>R.me?"In superiorità conto il rischio di meno: puoi osare di più.":""].filter(Boolean);
    out+=`<div class="rednote"><b>${R.n-R.me} contro ${R.o-R.him}</b><span>${esc(parts.join(" "))}</span></div>`}
  if(YM.length||YO.length){
    const parts=[];
    if(YM.length){const SB=mySlots().filter(s=>YM.includes(s.k));
      const kept=P?SB.filter(s=>DUEL.includes(P[s.k])):[],avoided=[...new Set(SB.filter(s=>!kept.includes(s)).flatMap(s=>DUEL.filter(id=>byId[id].role===s.role).map(id=>byId[id].name)))];
      parts.push(`Ammonito il tuo ${who(st.mine,YM)}: rischia il secondo giallo.${avoided.length?` Per lui evito ${avoided.join(", ")}.`:""}${kept.length?` Tengo ${kept.map(s=>byId[P[s.k]].name+" al "+s.l.toLowerCase()).join(", ")} anche da ammonito: vale molto più del rischio. Se vuoi stare tranquillo, toglilo.`:""} Contrasti duri sconsigliati.`);
      const em=effMark();if(em&&YM.includes(em.mine))parts.push("Attenzione: è lui a marcare a uomo, valuta di passare a zona.")}
    if(YO.length)parts.push(`Ammonito il suo ${who(st.opp,YO)}: entrerà meno deciso nei contrasti, quindi le sue istruzioni da contrasto pesano la metà. Puntalo: attaccare dalla sua parte rende di più.`);
    out+=`<div class="rednote y"><b>${YM.length+YO.length} ${YM.length+YO.length===1?"ammonito":"ammoniti"}</b><span>${esc(parts.join(" "))}</span></div>`}
  return out;
}
const lvBadge=(side,k)=>{const n=lvOf(side,k),t=side==="opp"?tagsOf(k):[],x=[...t].filter(Boolean);return `<em class="lvb" aria-label="${n} ${n===1?"stella":"stelle"}"><span class="stl">${"★".repeat(n)}</span>${x.length?` ${esc(x.join(" · "))}`:""}</em>`};
// colore delle stelle, graduale dal bianco (1★) all'arancione (5★): usato per le stelle e per il bordo dei pallini
const STARCOL=["#ffffff","#ffe1b5","#ffc46b","#ff9f33","#ff7300"];
// Un giocatore ha più ruoli e stelle diverse per ciascuno: ogni ruolo ha le sue 5 stelle.
// Toccare una stella sceglie quel ruolo e mette quelle stelle al posto; tocca di nuovo la stessa per tornare a 3.
const lvrOf=(side,k,id)=>{const f=side==="mine"?st.mine:st.opp,n=+((((st.lvr||{})[side]||{})[f]||{})[k+"|"+id]);return n>=1&&n<=5?n:0};
function roleCard(side,k,id,name,on,act,actv,badge){
  const n=lvrOf(side,k,id)||(on?lvOf(side,k):3);
  return `<div class="rcard${on?" on":""}"><button class="rname" data-act="${act}" data-v="${actv}" aria-pressed="${on}"><span class="rbadge">${badge||""}</span><b>${esc(name)}</b></button>
    <div class="xp rst"><div class="stars${n<3?" lo":n>3?" hi":""}" style="--sc:${STARCOL[n-1]}" role="group" aria-label="Stelle in ${esc(name)}: ${n}">${[1,2,3,4,5].map(i=>`<button data-act="rstar" data-v="${side}|${k}|${id}|${i}" aria-pressed="${i<=n}" aria-label="${i} ${i===1?"stella":"stelle"}">★</button>`).join("")}<span>${n}</span></div></div></div>`}
// porta sul posto le stelle ricordate per il ruolo scelto (senza ricordo: 3)
function roleStars(side,k,id){
  const f=side==="mine"?st.mine:st.opp,n=lvrOf(side,k,id),L={...lvMap(side)};
  if(n&&n!==3)L[k]=n;else delete L[k];
  st.lv={...st.lv,[side]:{...((st.lv||{})[side]||{}),[f]:L}}}
// campo con pannello a destra: il campo si sposta a sinistra e il pannello compare accanto, senza scorrere la pagina
const pfield=(side,pitch,panel)=>`<div class="pfield${panel?" open":""}">${pitch}${panel?`<aside class="ppanel ${side}">${panel}</aside>`:""}</div>`;
const pTags=k=>PUNTE.includes(slots(st.opp).find(s=>s.k===k).role)?`<div class="lvtags">${["veloce","fisico"].map(t=>`<button class="pill" data-act="tag" data-v="${k}|${t}" aria-pressed="${tagsOf(k).includes(t)}">${t==="veloce"?"Veloce":"Fisico"}</button>`).join("")}</div>`:"";
let mopen="";
function myPitchHTML(C){
  const ALL=slots(st.mine),RM=redOf("mine"),line=r=>["PUN","COP","CEN","ALA"].includes(r)?0:["CC","EC"].includes(r)?1:["DC","ED"].includes(r)?2:3;
  const RL={POR:"Portiere",DC:"Centrale",ED:"Terzino",CC:"Centroc.",EC:"Esterno",PUN:"Punta",COP:"Attaccante",CEN:"Centravanti",ALA:"Ala"};
  const s=ALL.find(x=>x.k===mopen&&!RM.includes(x.k)),d=s&&C.data.find(x=>x.key===s.k);
  const pitch=`<div class="pitch mine">${[0,1,2,3].map(n=>ALL.filter(x=>line(x.role)===n)).filter(r=>r.length).map(r=>`<div>${r.map(x=>RM.includes(x.k)?`<span class="oslot red"><b>${RL[x.role]}</b><span>Espulso</span></span>`:
    `<button class="oslot${C.fixed&&C.fixed[x.k]!==undefined?" set":""}${yelOf("mine").includes(x.k)?" yel":""}" data-side="mine"${x.role!=="POR"?` data-slot="${x.k}"`:""} data-act="mopen" data-v="${x.k}" aria-pressed="${mopen===x.k}" aria-label="${esc(x.l)}"><b>${RL[x.role]}</b><span>${C.P[x.k]?esc(byId[C.P[x.k]].name):"Nessuna istr."}</span>${lvBadge("mine",x.k)}</button>`).join("")}</div>`).join("")}</div>`;
  let panel="";
  if(s&&d){const rows=d.rows.filter(({i,j})=>!st.only||j.c==="good"||j.c==="warn"||C.P[s.k]===i.id);
    panel=`<div class="bar"><b>${esc(s.l)}</b><button class="link" data-act="mclose">Chiudi</button></div>
      <span class="label">Ruolo e stelle</span>
      <div class="rgrid">${rows.map(({i,j})=>roleCard("mine",s.k,i.id,i.name,C.P[s.k]===i.id,"pick",`${s.k}|${i.id}`,`<i class="tag ${j.c}">${j.v}</i>`)).join("")||`<span class="note">Nessuna istruzione consigliata per questo posto.</span>`}</div>
      <span class="note">Tocca il nome per scegliere il ruolo, o una stella per sceglierlo con quelle stelle. Tocca di nuovo per toglierlo.</span>`}
  return pfield("mine",pitch,panel);
}
function lvHTML(){
  const any=Object.keys(lvMap("mine")).length||Object.keys(lvMap("opp")).length||Object.keys(tagMap()).length;
  return `<p class="note">Stelle: copia quelle che il gioco dà al giocatore in quel ruolo (media tuoi ${starMean("mine").toFixed(1).replace(".",",")}★, suoi ${starMean("opp").toFixed(1).replace(".",",")}★). Tutti partono da 3; tocca di nuovo la stessa stella per tornare a 3. Veloce: DRI alto. Fisico: FIS e AER alti. Il suo modulo lo scopri a partita iniziata: le stelle si possono segnare anche dopo.</p>
    <p class="note">${teamStrengthKnown()?`Hai inserito ${oddsP()?"le probabilità":"l'OVR"}: la forza generale delle squadre la danno già quelle, quindi le stelle contano solo rispetto ai compagni (media tuoi ${starMean("mine").toFixed(1).replace(".",",")}★, suoi ${starMean("opp").toFixed(1).replace(".",",")}★). Ogni stella sopra o sotto la media sposta del 20% quanto pesa il giocatore.`:"Senza OVR né probabilità le stelle sono l'unica misura della forza: ogni stella sopra o sotto il 3 sposta del 20% quanto pesa il giocatore."}</p>
    <p class="note">Come conta (stima mia): i suoi giocatori con più stelle vanno coperti per primi; i tuoi con meno stelle coprono meno. Punta veloce: la Linea alta rischia di più. Punta fisica: le Uscite alte rischiano di più.</p>
    ${any?`<div class="bar"><span></span><button class="link" data-act="lvreset">Tutti a 3 stelle</button></div>`:""}`;
}
function yelHTML(){
  const row=(side,f,who)=>`<div class="redrow"><span class="label">${who}</span><div class="pills">${slots(f).filter(s=>s.role!=="POR").map(s=>{const r=redOf(side).includes(s.k),y=yelOf(side).includes(s.k);
    return `<button class="pill yelp${r?" isred":""}" data-act="yel" data-v="${side}|${s.k}" aria-pressed="${r||y}" aria-label="${esc(s.l)}${r?", espulso":y?", ammonito":""}">${esc(shortSlot(s,f))}</button>`}).join("")}</div></div>`;
  const any=yelOf("mine").length||yelOf("opp").length;
  return row("mine",st.mine,"I tuoi")+row("opp",st.opp,"I suoi")+
    `<div class="bar"><span class="note">Tocca una volta: giallo. Tocca due volte: rosso, e il giocatore esce dal calcolo. Una terza volta annulla.</span>${any?`<button class="link" data-act="yelreset">Nessun cartellino</button>`:""}</div>`;
}
function markLabel(m){if(!m)return"A zona";const a=mySlots().find(s=>s.k===m.mine),b=oppSlots().find(s=>s.k===m.opp);return a&&b?`A uomo: tuo ${a.l} → loro ${b.l}`:"A zona"}
function markHTML(C){
  const S=markSuggest(),on=!!st.mark;
  const sel=(attr,list,cur)=>`<select ${attr} aria-label="${attr==="data-markmine"?"Il tuo marcatore":"Il giocatore da marcare"}">${list.map(s=>`<option value="${s.k}"${s.k===cur?" selected":""}>${esc(s.l)}</option>`).join("")}</select>`;
  const mineL=mySlots().filter(s=>s.role!=="POR"),oppL=oppSlots().filter(s=>s.role!=="POR");
  return `<div class="pills"><button class="pill" data-act="markzona" aria-pressed="${!on}">A zona</button><button class="pill" data-act="markuomo" aria-pressed="${on}">A uomo</button></div>
    ${on?`<div class="markrow"><span>Il tuo</span>${sel("data-markmine",mineL,st.mark.mine)}<span>segue il loro</span>${sel("data-markopp",oppL,st.mark.opp)}</div>`:""}
    ${strongMarkHTML()}
    <div class="hint"><b>Consiglio</b><span>${S?`${esc(markLabel(S))}: ${sgn(ptsF(S.gain))} punti di preparazione rispetto alla zona.${st.mark&&st.mark.mine===S.mine&&st.mark.opp===S.opp?" È quella impostata.":` <button class="link" data-act="markapply" data-v="${S.mine}|${S.opp}">Applica</button>`}`:"A zona: nessuna marcatura a uomo migliora la formazione contro questo avversario."}</span></div>`;
}
let tgopen="";
function tgHTML(){
  const sigVal=k=>{let r=null;D.signals.filter(g=>st.sig.includes(g.id)).forEach(g=>g.nodes.forEach(n=>{if(vkey(byId[n])==="SQ:"+k)r=byId[n].name.split(": ")[1]}));return r};
  const myL=mySlots().filter(s=>s.role!=="POR");
  return `<div class="gsq">${TGV.map(([h,rows])=>`<div class="gsec"><span class="label">${esc(h)}</span>${rows.map(([k,opts,map])=>{
    const v=tgOf(k),sv=!v&&sigVal(k),label=k==="Angoli"?"Schema sugli angoli":k;
    let shown=v?(k==="Marcatura"&&v==="A uomo"?`A uomo${st.tgMark&&myL.some(s=>s.k===st.tgMark)?" su "+(myL.find(s=>s.k===st.tgMark).l):""}`:v):sv?sv:"Non so";
    const cls=v?"":sv?" fromsig":" unk";
    const open=tgopen===k;
    let panel="";
    if(open){panel=`<div class="tgpanel">${["Non so",...opts].map(o=>`<button class="pill" data-act="tgset" data-v="${esc(k)}|${esc(o)}" aria-pressed="${(v||"Non so")===o}">${esc(o)}</button>`).join("")}
      ${k==="Marcatura"&&v==="A uomo"?`<div class="markrow"><span>Marca il tuo</span><select data-tgmark aria-label="Il tuo giocatore marcato"><option value="">— scegli —</option>${myL.map(s=>`<option value="${s.k}"${s.k===st.tgMark?" selected":""}>${esc(s.l)}</option>`).join("")}</select></div>`:""}
      ${map===null?`<span class="note">Non cambia i calcoli: questa voce non ha incroci con le tue istruzioni.</span>`:""}</div>`}
    return `<button class="grow tgrow${cls}" data-act="tgopen" data-v="${esc(k)}" aria-expanded="${open}"><span>${esc(label)}</span><b>${esc(shown)}${sv?' <small class="rl">indizio</small>':""}</b></button>${panel}`}).join("")}</div>`).join("")}</div>`;
}
const STATS=[["Possesso %","pm",5,null],["Tiri","tm",1,"ts"],["Tiri in porta","qm",1,"qs"],["Gol attesi (xG)","xm",.1,"xs"],["Angoli","am",1,"as"],["Falli","fm",1,"fs"],["Fuorigioco","om",1,"os"]];
// valore di una casella: «ps» è il suo possesso, sempre 100 meno il tuo
function statVal(k){const S=st.stats||{},raw=S[k==="ps"?"pm":k];if(raw===undefined||raw==="")return null;return k==="ps"?100-(+raw):+raw}
const statShow=(k,v)=>v===null?"":(k==="xm"||k==="xs")?v.toFixed(1).replace(".",","):String(v);
function stepper(k,step,lab){const v=statVal(k);
  return `<span class="stp"><button data-act="stat" data-v="${k}|-${step}" aria-label="Meno">−</button><input data-sk="${k}" type="text" inputmode="${step<1?"decimal":"numeric"}" enterkeyhint="next" autocomplete="off" value="${statShow(k,v)}" placeholder="–" aria-label="${esc(lab||k)}"><button data-act="stat" data-v="${k}|${step}" aria-label="Più">+</button></span>`}
function steppersHTML(){
  const sw=!!st.statSwap,two=(a,b)=>sw?b+a:a+b;
  return `<div class="sthead"><button class="swap" data-act="statswap" aria-label="Scambia le colonne Tu e Lui">⇄ Scambia</button>${two(`<span class="label me">Tu</span>`,`<span class="label">Lui</span>`)}</div>`+
    STATS.map(([l,k,s,o])=>`<div class="strow"><span>${l}</span>${two(stepper(k,s,l+", tu"),stepper(o||"ps",s,l+", lui"))}</div>`).join("");
}
function renderShared(C){
  document.querySelectorAll("[data-steppers]").forEach(el=>el.innerHTML=steppersHTML());
  document.querySelectorAll("[data-statlast]").forEach(el=>el.innerHTML=statLastHTML());
  document.querySelectorAll("[data-yel]").forEach(el=>el.innerHTML=yelHTML());
  document.querySelectorAll("[data-lv]").forEach(el=>el.innerHTML=lvHTML());
  document.querySelectorAll("[data-my-pitch]").forEach(el=>el.innerHTML=myPitchHTML(C));
  document.querySelectorAll("[data-ovrnote]").forEach(el=>el.innerHTML=ovrNoteHTML());
  document.querySelectorAll("input[data-ovr]").forEach(el=>{if(el!==document.activeElement){const n=ovrOf(el.dataset.ovr);el.value=n==null?"":String(n)}});
  document.querySelectorAll("input[data-odds]").forEach(el=>{if(el!==document.activeElement){const x=(st.odds||{})[el.dataset.odds];el.value=x===undefined||x===""?"":String(x)}});
  document.querySelectorAll('[data-act="home"]').forEach(b=>b.setAttribute("aria-pressed",String(st.home===(b.dataset.v==="1"))));
  document.querySelectorAll("[data-oddslab]").forEach(el=>{const isH=el.dataset.oddslab==="h",me=st.home===true?isH:st.home===false?!isH:null;el.textContent=(isH?"Casa":"Ospite")+(me===true?" (tu)":me===false?" (lui)":"");el.classList.toggle("me",me===true)});
  document.querySelectorAll("[data-tg]").forEach(el=>el.innerHTML=tgHTML());
  document.querySelectorAll("[data-tgreset]").forEach(el=>el.hidden=!Object.keys(st.tg||{}).length);
  document.querySelectorAll('[data-pills="score3"]').forEach(el=>el.innerHTML=[["svantaggio","Sto perdendo"],["pari","Pareggio"],["vantaggio","Sto vincendo"]].map(([v,l])=>`<button class="pill" data-act="score" data-v="${v}" aria-pressed="${st.score===v}">${l}</button>`).join(""));
  const Vs=variant(st.score,C),V0=variant("pari",C);
  document.querySelectorAll("[data-lineup3]").forEach(el=>{const m=el.dataset.lineup3,cmp=m==="cmp",best=m==="best";el.innerHTML=lineup3HTML(C,cmp?null:best?"pari":(m||null),!m||cmp,cmp?"cmp":best?"best":"")});
  document.querySelectorAll("[data-holes-sit]").forEach(el=>el.innerHTML=holesHTML(C,Vs));
  document.querySelectorAll("[data-corners-sit]").forEach(el=>el.innerHTML=cornersHTML(C,Vs));
  document.querySelectorAll("[data-opp-pitch]").forEach(el=>el.innerHTML=oppPitchHTML());
  document.querySelectorAll("[data-sigs]").forEach(el=>el.innerHTML=sigsHTML());
  document.querySelectorAll("[data-holes]").forEach(el=>el.innerHTML=holesHTML(C,V0));
  document.querySelectorAll("[data-live]").forEach(el=>{{const a=document.activeElement;if(!(a&&a.matches&&a.matches("input[data-lin]")&&el.contains(a)))el.innerHTML=liveHTML()}});
  document.querySelectorAll('[data-pills="score"]').forEach(el=>el.innerHTML=[["svantaggio","Sto perdendo"],["pari","Pareggio"],["vantaggio","Sto vincendo"]].map(([v,l])=>`<button class="segb ${v}" data-act="score" data-v="${v}" aria-pressed="${st.score===v}">${l}</button>`).join(""));
  document.querySelectorAll("[data-extra]").forEach(el=>el.innerHTML=
    `<div style="display:flex;flex-direction:column;gap:10px"><div><span class="label">Ritmo</span><div class="pills" style="margin-top:6px">${["Lento","Normale","Veloce"].map(v=>`<button class="pill" data-act="extra" data-v="ritmo:${v}" aria-pressed="${st.extra.ritmo===v}">${v}</button>`).join("")}</div></div>
     <div><span class="label">Perdita di tempo</span><div class="pills" style="margin-top:6px">${[["No","No"],["Sì","Sì, in vantaggio"]].map(([v,l])=>`<button class="pill" data-act="extra" data-v="tempo:${v}" aria-pressed="${st.extra.tempo===v}">${l}</button>`).join("")}</div></div></div>`);
  document.querySelectorAll("[data-corners]").forEach(el=>el.innerHTML=cornersHTML(C,V0));
  document.querySelectorAll("[data-safe]").forEach(el=>el.innerHTML=`<button class="pill safe" data-act="safe" aria-pressed="${!!st.safe}">${st.safe?"✓ ":""}Gioca sul sicuro</button><span class="note">${st.safe?"Le scelte chiudono anche i buchi che un avversario attento sfrutterebbe, a costo di un po' di preparazione.":"Attivalo per chiudere i buchi che un avversario attento sfrutterebbe."}</span>`);
  document.querySelectorAll("[data-mark]").forEach(el=>el.innerHTML=markHTML(C));
  const lam=lamOf(st.score),pos=Math.round((lam-.3)/1.7*100);
  document.querySelectorAll("[data-risk]").forEach(el=>{if(document.activeElement!==el)el.value=pos});
  document.querySelectorAll("[data-risk-val]").forEach(el=>el.textContent="prudenza "+Math.max(0,Math.min(100,pos))+"/100"+(st.risk==null?" ("+SIT[st.score][0].toLowerCase()+")":""));
  document.querySelectorAll("[data-risk-reset]").forEach(el=>el.hidden=st.risk==null);
  $("sigreset").hidden=!st.sig.length;
}
function renderModulo(C){
  const fl=Object.keys(D.forms).map(f=>[f,fm(f)]);
  const blank=s=>(st.modBlank||{})[s],opts=s=>blank(s)?[["","–"],...fl]:fl;
  pills($("opp"),opts("opp"),blank("opp")?"":st.opp,v=>{if(v){st.opp=v;st.modBlank={...st.modBlank,opp:false}}});
  pills($("mine"),opts("mine"),blank("mine")?"":st.mine,v=>{if(v){st.mine=v;st.modBlank={...st.modBlank,mine:false}}});
  $("cmp-title").textContent=`Moduli consigliati contro il suo ${fmSide("opp")}`; $("cmp").innerHTML=cmpHTML();
  // casa a sinistra, ospite a destra: lo scambio vale anche per la scheda Partita
  {const sw=!!st.statSwap;$("selrow").classList.toggle("swp",sw);
   document.querySelector('[data-sidelab="mine"]').textContent=sw?"Tu · ospite":"Tu · in casa";
   document.querySelector('[data-sidelab="opp"]').textContent=sw?"Avversario · in casa":"Avversario · ospite"}
  $("facts").innerHTML=facts();
  $("only").setAttribute("aria-pressed",String(!!st.only));
  const seen=new Set(), roleRows=C.data.filter(d=>{if(seen.has(d.role))return false;seen.add(d.role);return true});
  $("summary").innerHTML=roleRows.map(d=>{
    const keys=d.role==="SQ"?Object.keys(C.P).filter(k=>k.startsWith("SQ:")):C.data.filter(x=>x.role===d.role).map(x=>x.key);
    const chosen=[...new Set(keys.map(k=>C.P[k]).filter(Boolean))];
    const avoid=d.rows.filter(r=>r.j.c==="bad"&&!chosen.includes(r.i.id));
    const line=id=>{const j=judge(id,C.S);return d.role==="SQ"?`${esc(byId[id].name)} ${svI(j.score)}`:`<span class="tag ${j.c}">${j.v}</span><span>${esc(byId[id].name)}</span>${vbarI(j.score)}`};
    return `<div class="sumrow"><button data-act="jump" data-v="role-${d.key}">${esc(D.roles[d.role])}</button><div class="picks">
      ${chosen.length?(d.role==="SQ"?`<div><span>${chosen.map(line).join(", ")}</span></div>`:chosen.map(id=>`<div>${line(id)}</div>`).join("")):`<div><span class="tag idle">Nessuna</span><span class="none">Nessuna istruzione: ogni opzione rischia più di quanto rende</span></div>`}
      ${avoid.length?`<div><span class="tag bad">Evita</span><span>${avoid.map(r=>esc(r.i.name)).join(", ")}</span></div>`:""}</div></div>`}).join("");
  const rel=(cls,t,list)=>list.length?`<div class="rel ${cls}"><i>${t}</i><div>${list.map(chip).join("")}</div></div>`:"";
  $("mycards").innerHTML=C.data.map(d=>{
    const isSQ=d.role==="SQ";
    const on=i=>isSQ?C.P[vkey(i)]===i.id:C.P[d.key]===i.id;
    const vis=d.rows.filter(({i,j})=>!st.only||j.c==="good"||j.c==="warn"||on(i));
    const open=!!(st.open||{})[d.key];
    const keysH=isSQ?Object.keys(C.P).filter(k=>k.startsWith("SQ:")&&C.P[k]):[d.key];
    const cur=isSQ?(keysH.length?keysH.map(k=>esc(byId[C.P[k]].name.split(": ")[1])+" ("+esc(k.slice(3))+")").join(", "):"Tutto equilibrato"):(C.P[d.key]?esc(byId[C.P[d.key]].name):"Nessuna istruzione");
    const mineFlag=!isSQ&&C.fixed[d.key]!==undefined?` <span class="rl">scelta tua</span>`:"";
    const SB=stability("pari"),stH=isSQ?"":stabTag(SB[d.key]);
    const headH=`<button class="rhead" data-act="card" data-v="${d.key}" aria-expanded="${open}"><span><b>${esc(d.label)}</b><small>${cur}${mineFlag} ${stH}</small></span>${!isSQ&&C.P[d.key]?vbarI(judge(C.P[d.key],C.S).score):""}<i>${open?"Chiudi":"Apri"}</i></button>`;
    const sr=SB[d.key],unc=!isSQ&&sr&&!sr.solid?` <span class="unc">Scelta incerta: con stime un po' diverse diventa ${sr.altId?esc(byId[sr.altId].name):"Nessuna istruzione"}. Qui conta il tuo giudizio.</span>`:"";
    const whyH=isSQ?"":`<div class="why"><b>Perché</b> ${whyText(C,d.key)}${unc}</div>`;
    if(!open)return `<div class="card role closed" id="role-${d.key}">${headH}${whyH}</div>`;
    return `<div class="card role" id="role-${d.key}">${headH}${whyH}`+(vis.length?vis.map(({i,j})=>{const o=on(i);return `<div class="row ${j.c==="idle"?"":j.c}${o?" picked":""}">
      <div class="head"><b>${esc(i.name)}</b><span class="r">${vbarI(j.score)}<span class="tag ${j.c}">${j.v}</span><button class="choose" data-act="pick" data-v="${isSQ?"SQ":d.key}|${i.id}" aria-pressed="${o}">${o?"Scelta":"Scegli"}</button></span></div>
      <div class="desc">${esc(i.desc)}</div>
      ${rel("g","Batte",j.w.filter(e=>e.t==="B").map(e=>({id:e.l,c:e.c,f:e.f,p:e.p})))}
      ${rel("g","Annulla",j.w.filter(e=>e.t==="N").map(e=>({id:e.l,c:e.c,f:e.f,p:e.p})))}
      ${rel("b","Soffre",j.l.map(e=>({id:e.w,c:e.c,f:e.f,p:e.p})))}
      ${rel("n","Inutile se",j.n.map(e=>({id:e.w,c:e.c,f:e.f,p:e.p})))}
      ${D.notes[i.id]?`<div class="note">${esc(D.notes[i.id])}</div>`:""}
    </div>`}).join(""):`<div class="row"><span class="note">Nessuna istruzione consigliata per questo posto.</span></div>`)+`</div>`}).join("");
}
function renderPartita(C){
  $("p-title").textContent=`Tu ${fm(st.mine)} contro ${fm(st.opp)}`;
  $("p-score").innerHTML=SCORE[st.score].map(x=>`<li>${esc(x)}</li>`).join("");
  $("p-if").innerHTML=ifHTML(C);
  const rm=$("p-readmsg");rm.hidden=!READMSG;rm.textContent=READMSG;
  renderSendbox();
}

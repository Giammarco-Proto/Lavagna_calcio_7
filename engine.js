// Motore: scala 0-100, espulsioni e cartellini, livelli, OVR, probabilità di inizio partita e calcolo della formazione.
"use strict";
// ---------- scala 0-100 ----------
const r5=x=>Math.round(Math.max(0,Math.min(100,x))/5)*5;
const votoI=s=>r5(50+50*Math.tanh(s*ENG().tanh));                    // istruzione: 50 = neutra
function bestTotal(){return memo("BT",()=>{const keep={mine:st.mine,pick:st.pick,safe:st.safe,mark:st.mark};let b=0;
  try{st.pick={};st.safe=false;st.mark=null;NOSTARS=true;Object.keys(D.forms).forEach(f=>{st.mine=f;b=Math.max(b,computeRaw().total)})}finally{NOSTARS=false;Object.assign(st,keep)}return b})}
const votoF=x=>r5(x/Math.max(bestTotal(),x,.01)*100);          // formazione: 100 = la migliore contro questo avversario, 0 = nessuna istruzione
const EXPMAX=3;
const rischio=e=>r5(e/EXPMAX*100);                             // esposizione: 0 = nessun buco
const ptsF=d=>Math.round(d/Math.max(bestTotal(),.01)*100);      // punti sul voto della formazione
const sgn=n=>(n>0?"+":n<0?"−":"")+Math.abs(n);
function vbar(v,mode,lg){ // mode: "c" centrata a 50, "g" da 0 verde, "r" da 0 rossa
  const L=mode==="c"?Math.min(50,v):0,W=mode==="c"?Math.abs(v-50):v,c=mode==="r"?"b":mode==="g"?"g":(v>=50?"g":"b");
  const tc=mode==="r"?(v>0?"b":"g"):mode==="g"?"g":(v>52?"g":v<48?"b":"");
  return `<span class="sbar${lg?" lg":""}${mode==="c"?"":" nc"}" aria-label="${v} su 100"><i class="${c}" style="left:${L}%;width:${W}%"></i><em class="${tc}">${v}</em></span>`}
const vbarI=s=>vbar(votoI(s),"c"), vbarF=(x,lg)=>vbar(votoF(x),"g",lg), vbarR=e=>vbar(rischio(e),"r");
const svI=s=>{const v=votoI(s);return `<span class="sv ${v>52?"g":v<48?"b":""}">${v}</span>`};
const svP=n=>`<span class="sv ${n>0?"g":n<0?"b":""}">${sgn(n)} punti</span>`;
const sv=s=>`<span class="sv ${s>0.005?"g":s<-0.005?"b":""}">${fmt(s)}</span>`;
const pct=p=>p>=.995?"":` <small class="pc">${Math.round(p*100)}%</small>`;
function facts(){
  const r=D.forms[st.opp],F=[];
  const cr=[r.includes("ALA")&&"ali",r.includes("EC")&&"esterni di centrocampo",r.includes("ED")&&"terzini in sovrapposizione"].filter(Boolean);
  F.push(cr.length?["Cross","Possibili","warn",`Da: ${cr.join(", ")}. Uscite alte, Domina in area e Marca l'ala hanno un bersaglio.`]
    :["Cross","Impossibili","good","Nessun giocatore di fascia: Uscite alte, Domina in area, Marca l'ala, Tornante e Rientra non fermano nulla."]);
  F.push((r.includes("ALA")||r.includes("EC"))?["Tagli verso il centro","Possibili","warn","Li fermano Tornante e Rientra, li punisce la Sovrapposizione; soffrono Marca l'ala e Domina in area."]
    :["Tagli verso il centro","Impossibili","good","Non ha ali né esterni di centrocampo: nessuno può tagliare dentro."]);
  F.push(r.includes("ED")?["Terzini","Presenti","warn","Crossa punisce quello che si accentra o si stacca; Tornante e Rientra fermano quello che spinge."]
    :["Terzini","Assenti","idle","Tornante e Rientra perdono la sovrapposizione come bersaglio; Crossa non ha un terzino da punire."]);
  if(r.includes("PUN"))F.push(["Attacco","Punta unica","warn","È l'unico attaccante che può fare Pressing sul portiere: Costruzione corta e Imposta rischiano. Può anche fare il Falso nove."]);
  if(r.includes("COP"))F.push(["Attacco","In coppia","warn","Niente Falso nove né Pressing sul portiere, ma può esserci la Seconda punta: punisce la Copertura della profondità, la ferma l'Incontrista."]);
  if(r.includes("CEN"))F.push(["Attacco","Centravanti e ali","warn","Può fare Riferimento, Attacca la profondità o Falso nove; nelle schermate non ha Pressing sul portiere."]);
  F.push(["Tattiche di squadra",Object.keys(st.tg||{}).length?"Impostate da te":"Non visibili","idle",Object.keys(st.tg||{}).length?"Hai indicato alcune sue tattiche nella scheda Partita: per quelle voci il calcolo le considera certe.":st.sig.length?"Gli indizi segnati nella scheda Partita rendono certe le tattiche che suggeriscono; per le altre voci uso la probabilità di partenza.":"Dal modulo non si leggono: conto ogni opzione con la sua probabilità di partenza (per esempio Pressing alto 1 su 3). Segna nella scheda Partita quello che noti."]);
  return F.map(([t,s,c,p])=>`<div class="card fact"><div class="top"><b>${t}</b><span class="tag ${c}">${s}</span></div><p>${p}</p></div>`).join("");
}
const vkey=i=>"SQ:"+i.name.split(":")[0];
function slots(f){
  const [,d,m,a]=f.split("-").map(Number),S=[{k:"POR",role:"POR",l:"Portiere"}];
  if(d===1)S.push({k:"DC1",role:"DC",l:"Centrale"});
  if(d===2)S.push({k:"DC1",role:"DC",l:"Centrale sinistro"},{k:"DC2",role:"DC",l:"Centrale destro"});
  if(d===3)S.push({k:"ED1",role:"ED",l:"Terzino sinistro"},{k:"DC1",role:"DC",l:"Centrale"},{k:"ED2",role:"ED",l:"Terzino destro"});
  if(m===1)S.push({k:"CC1",role:"CC",l:"Centrocampista"});
  if(m===2)S.push({k:"CC1",role:"CC",l:"Centrocampista sinistro"},{k:"CC2",role:"CC",l:"Centrocampista destro"});
  if(m===3)S.push({k:"EC1",role:"EC",l:"Esterno sinistro"},{k:"CC1",role:"CC",l:"Centrocampista"},{k:"EC2",role:"EC",l:"Esterno destro"});
  if(a===1)S.push({k:"PUN1",role:"PUN",l:"Punta unica"});
  if(a===2)S.push({k:"COP1",role:"COP",l:"Attaccante sinistro"},{k:"COP2",role:"COP",l:"Attaccante destro"});
  if(a===3)S.push({k:"ALA1",role:"ALA",l:"Ala sinistra"},{k:"CEN1",role:"CEN",l:"Centravanti"},{k:"ALA2",role:"ALA",l:"Ala destra"});
  return S;
}
// ---------- espulsioni: il giocatore espulso esce dal calcolo (le sue istruzioni non contano più) ----------
const redOf=side=>{const r=(st.red||{})[side];return Array.isArray(r)?r:[]};
const mySlots=()=>slots(st.mine).filter(s=>!redOf("mine").includes(s.k));
const oppSlots=()=>slots(st.opp).filter(s=>!redOf("opp").includes(s.k));
// ---------- cartellini gialli ----------
// Stime mie: le istruzioni «da contrasto» espongono al secondo giallo. Il gioco lo dice solo per Contrasti duri («prendi più gialli»).
const yelOf=side=>{const r=(st.yel||{})[side];return Array.isArray(r)?r:[]};
const DUEL=["dc_marc","ed_marca","cc_inc","pun_press"];
const YPEN=.2,YPEN_SQ=.15,YOPP=.5;
const myBooked=()=>yelOf("mine").filter(k=>mySlots().some(s=>s.k===k));
const oppBooked=()=>yelOf("opp").filter(k=>oppSlots().some(s=>s.k===k));
// tuo ammonito: un'istruzione da contrasto costa (rischio di restare in inferiorità); Contrasti duri costa per ogni ammonito
function yellowPen(P){const B=myBooked();if(!B.length)return 0;let p=0;B.forEach(k=>{if(DUEL.includes(P[k]))p+=YPEN});if(P["SQ:Contrasti"]==="tq_contr_duri")p+=YPEN_SQ*B.length;return p}
// ---------- livello dei giocatori (facoltativo) ----------
// Stelle nel ruolo da 1 a 5 (3 = normale, il valore di partenza). Stima mia: ogni stella sposta del 20%
// quanto il giocatore esegue la sua istruzione: 1★ 0,6 · 2★ 0,8 · 3★ 1 · 4★ 1,2 · 5★ 1,4.
// Suo giocatore: pesano di più (o di meno) i danni che fa e il valore di coprirlo. Tuo giocatore: copre di più (o di meno).
const STARF=.2,TAGF=1.3,TAGPEN=.15,DBLK=1.25;
const PROF=["pun_prof","cen_prof","cop_prof"],AERI=["pun_rif","cen_rif","cop_prima"],PUNTE=["PUN","COP","CEN"];
let NOSTARS=false; // nel confronto fra moduli le tue stelle non contano: valgono solo per il modulo in cui le hai messe
const lvMap=side=>{const m=(((st.lv||{})[side])||{})[side==="mine"?st.mine:st.opp];return m&&typeof m==="object"?m:{}};
const lvOf=(side,k)=>{if(side==="mine"&&NOSTARS)return 3;const n=+lvMap(side)[k];return n>=1&&n<=5?n:3};
// Se c'è già una misura della forza della squadra (OVR o probabilità), le stelle non la ripetono:
// contano solo rispetto ai compagni (chi è sopra o sotto la media della sua squadra). Senza OVR né probabilità
// le stelle sono l'unica misura della forza e contano rispetto a 3.
const teamStrengthKnown=()=>oddsP()!=null||ovrGap()!=null;
function starMean(side){const S=side==="mine"?mySlots():oppSlots();return S.length?S.reduce((a,s)=>a+lvOf(side,s.k),0)/S.length:3}
const starRef=side=>teamStrengthKnown()?starMean(side):3;
const lvF=(side,k)=>1+(lvOf(side,k)-starRef(side))*STARF;
const tagMap=()=>{const m=(st.tag||{})[st.opp];return m&&typeof m==="object"&&!Array.isArray(m)?m:{}};
const tagsOf=k=>{const t=tagMap()[k];return Array.isArray(t)?t:[]};
// testo del gioco: Linea alta «soffre le punte veloci»; Uscite alte: «la punta fisica lo anticipa»
function oppW(k,id){let f=lvF("opp",k);const t=tagsOf(k);if(t.includes("veloce")&&PROF.includes(id))f*=TAGF;if(t.includes("fisico")&&AERI.includes(id))f*=TAGF;return f}
function myWOf(P){if(!P||NOSTARS||!Object.keys(lvMap("mine")).length)return null;const W=new Map();
  mySlots().forEach(s=>{const id=P[s.k],f=lvF("mine",s.k);if(id&&f!==1)W.set(id,Math.max(W.get(id)||0,f))});return W}
function tagPen(P){let p=0;oppSlots().filter(s=>PUNTE.includes(s.role)).forEach(s=>{const t=tagsOf(s.k);
  if(t.includes("veloce")&&P["SQ:Linea difensiva"]==="tq_linea_alta")p+=TAGPEN;if(t.includes("fisico")&&P.POR==="por_uscite")p+=TAGPEN});return p}
// ---------- OVR di squadra ----------
// Stima mia: ogni punto di OVR in più dell'avversario toglie il 3% al peso del rischio (puoi osare), ogni punto in meno lo aggiunge.
// Limiti: da 0,7 (+10 o più) a 1,3 (−10 o meno). Conta solo se hai inserito entrambi gli OVR.
const OVRK=.03;
const ovrOf=side=>{const n=+((st.ovr||{})[side]);return n>=1&&n<=99?n:null};
const ovrGap=()=>{const m=ovrOf("mine"),o=ovrOf("opp");return m!=null&&o!=null?m-o:null};
const ovrF=()=>{const g=ovrGap();return g==null?1:Math.max(.7,Math.min(1.3,1-OVRK*g))};
// ---------- probabilità del gioco a inizio partita (casa · pareggio · ospite) ----------
// Mettono insieme OVR e intesa: quando ci sono, sostituiscono la differenza di OVR.
// Stime mie: vantaggio = tua vittoria − sua vittoria; ogni 10 punti di vantaggio tolgono il 6% al peso del rischio (limiti 0,7–1,3).
// Valore del pareggio: da favorito in parità osi di più (il pari è un mezzo passo falso), da sfavorito proteggi il pari
// e, se sei avanti, il vantaggio. Se il pareggio è molto probabile ogni gol pesa di più.
const ODDK=.6,DRAWK=.25;
function oddsP(){const O=st.odds||{},h=st.home;if(h!==true&&h!==false)return null;
  const v=k=>{const n=+O[k];return O[k]!==undefined&&O[k]!==""&&n>=0&&n<=100?n:null};let H=v("h"),Dr=v("d"),A=v("a");
  const known=[H,Dr,A].filter(x=>x!=null).length;if(known<2)return null;
  if(H==null)H=Math.max(0,100-Dr-A);else if(Dr==null)Dr=Math.max(0,100-H-A);else if(A==null)A=Math.max(0,100-H-Dr);
  const s=H+Dr+A;if(s<=0)return null;const w=(h?H:A)/s,d=Dr/s,l=(h?A:H)/s;return{w,d,l,edge:w-l}}
const clampF=x=>Math.max(.7,Math.min(1.3,x));
// forza: probabilità se ci sono, altrimenti OVR
const strengthF=()=>{const P=oddsP();return P?clampF(1-ODDK*P.edge):ovrF()};
// correzione per situazione di punteggio (solo con le probabilità)
function sitF(sit){const P=oddsP();if(!P)return 1;const e=P.edge;
  if(sit==="pari")return clampF((e>0?1-DRAWK*e:1+DRAWK*-e)*(1+Math.max(0,P.d-.25)*.6));
  if(sit==="vantaggio"&&e<0)return clampF(1+DRAWK*-e);
  return 1}
function ovrNoteHTML(){
  const P=oddsP(),g=ovrGap();
  if(P){const W=Math.round(P.w*100),Dr=Math.round(P.d*100),L=Math.round(P.l*100),E=W-L,pct=Math.round((1-strengthF())*100);
    const lead=E>0?`Sei favorito di ${E} punti: il rischio pesa il ${pct}% in meno.`:E<0?`Sei sfavorito di ${-E} punti: il rischio pesa il ${-pct}% in più.`:"Partita alla pari: il rischio conta come al solito.";
    const draw=E>=5?" In parità osa ancora un po' di più: per te il pareggio è un mezzo passo falso.":E<=-5?" In parità e in vantaggio sii più prudente: per te il pareggio è già un buon risultato.":"";
    const dd=P.d>.3?` Pareggio molto probabile (${Dr}%): ogni gol pesa, in parità conto il rischio un po' di più.`:"";
    return `<div class="rednote o${E>0?" up":E<0?" down":""}"><b>Vinci ${W} · pari ${Dr} · perdi ${L}</b><span>${esc(lead+draw+dd)}${g!=null?" <small>Uso queste al posto dell'OVR: contano anche l'intesa.</small>":""}</span></div>`}
  if(st.home!==true&&st.home!==false&&Object.values(st.odds||{}).some(x=>x!==undefined&&x!==""))return `<div class="rednote o"><b>Probabilità</b><span>Scegli «In casa» o «Fuori casa» per usarle.</span></div>`;
  if(g==null)return "";
  const pct=Math.round((1-ovrF())*100);
  const msg=g===0?"Stesso OVR: il rischio conta come al solito.":g>0?`Sei più forte di ${g} di OVR: il rischio pesa il ${pct}% in meno, quindi puoi osare di più.`:`Sei più debole di ${-g} di OVR: il rischio pesa il ${-pct}% in più, quindi meglio non scoprirsi.`;
  return `<div class="rednote o${g>0?" up":g<0?" down":""}"><b>OVR ${ovrOf("mine")} contro ${ovrOf("opp")}</b><span>${esc(msg)}</span></div>`}
// in inferiorità numerica il rischio pesa di più, in superiorità di meno
const manF=()=>{const R=redCount();return Math.max(.7,Math.min(1.5,1+.2*(R.me-R.him)))};
// ---------- calcolo ----------
// Indici delle relazioni per il calcolo d'insieme
const BEATS={},HITS={};D.edges.forEach(e=>{(BEATS[e.w]=BEATS[e.w]||[]).push(e);(HITS[e.l]=HITS[e.l]||[]).push(e)});
// Convenienza di un insieme di scelte: ogni minaccia conta una volta sola.
// Guadagno = la copertura migliore che hai contro di lei; perdita = il colpo più forte che ti dà (dimezzato se la copri), più metà se ti rende inutile qualcosa.
const evalSetBase=(...a)=>evalSet(...a);
// Marcatura a uomo (una sola): il suo giocatore marcato conta la metà; l'istruzione del tuo marcatore rende la metà.
const MARKF=.5;                      // stima mia: «tocca molti meno palloni» / «la zona del marcatore resta più scoperta»
const MK={id:null};
// marcatura valida per i moduli attuali (senza modificare lo stato durante i calcoli)
function effMark(){const m=st.mark;return m&&mySlots().some(s=>s.k===m.mine)&&oppSlots().some(s=>s.k===m.opp)?m:null}
const markIdOf=P=>{const m=effMark();return m&&P?P[m.mine]||null:null};
// lui marca a uomo un tuo giocatore (impostato nel riquadro delle sue tattiche)
const oppMarkIdOf=P=>{const s=st.tg&&st.tg.Marcatura==="A uomo"&&st.tgMark;return s&&P&&mySlots().some(x=>x.k===s)?P[s]||null:null};
function evalSet(ids,M,lam=1,mk=MK.id,omk=null,mw=null){
  const mine=new Set(ids);let gain=0,loss=0;
  const G=ENG(),CV=G.cv,US=G.us;                      // motore: quanto del colpo resta se lo copri · peso di «ti rende inutile»
  const MF=G.ment&&MENTX.v?G.ment[MENTX.v]:null,GF=MF?MF.g:1,LF=MF?MF.l:1; // mentalità: pesa su ciò che crei e su ciò che subisci
  const solo=mk&&ids.filter(x=>x===mk).length===1;   // se un altro tuo giocatore ha la stessa istruzione, la copertura resta piena
  const soloO=omk&&ids.filter(x=>x===omk).length===1; // tuo giocatore marcato a uomo da lui: tocca meno palloni
  const mwf=w=>(mw&&mw.get(w))||1;                    // livello del tuo giocatore che la esegue
  const fac=w=>(solo&&w===mk?MARKF:1)*(soloO&&w===omk?MARKF:1)*mwf(w);
  const WT=M.wt;
  M.forEach((p,y)=>{
    let cov=0,cov2=0,hit=0,use=0;
    (HITS[y]||[]).forEach(e=>{if(mine.has(e.w)){const c=EW(e)*fac(e.w);if(c>cov){cov2=cov;cov=c}else if(c>cov2)cov2=c}});
    (BEATS[y]||[]).forEach(e=>{if(mine.has(e.l)){if(e.t==="B")hit=Math.max(hit,EW(e));else use=Math.max(use,EW(e))}});
    const pl=M.lossP&&M.lossP.has(y)?M.lossP.get(y):p,wy=WT&&WT.has(y)?WT.get(y):1; // livello del suo giocatore
    // contro un suo giocatore forte conta anche la seconda copertura (raddoppio): a 5★ vale metà, a 4★ un quarto
    const dbl=wy>1?Math.min(1,DBLK*(wy-1))*cov2:0;
    gain+=p*(cov+dbl)*wy;loss+=pl*wy*(hit*(cov?(cov2&&wy>1?CV-CV*.5*Math.min(1,DBLK*(wy-1)):CV):1)+US*use);
  });
  // valore d'attacco (motore nuovo): le stelle del giocatore contano 2,5 volte di più che per la copertura, e il rischio lo sposta (favorito = vale di più)
  let atk=0;if(G.atk){for(const id of ids){const v=ATK[id];if(v){const f=fac(id);atk+=v*Math.max(.2,1+2.5*(f-1))}}atk*=G.atk*Math.max(.4,Math.min(1.8,1+1.5*(1-lam)))*GF}
  return G.imp*(GF*gain-lam*LF*loss+atk)+PARAM.base*(ids.filter(id=>byId[id].role!=="SQ").reduce((s,id)=>s+mwf(id),0)-(solo?1-MARKF:0)-(soloO?1-MARKF:0));
}
// giocatori di fascia: ali, esterni di centrocampo, terzini. Senza di loro «Ampiezza: Larga» («attacchi sulle fasce») non ha chi la fa
const WIDE=["ALA","EC","ED"];
const hasWide=f=>WIDE.some(r=>D.forms[f].includes(r));
function keysFor(SL){
  const wide=SL.some(s=>WIDE.includes(s.role));
  const K=[],g={};D.instr.filter(i=>i.role==="SQ"&&(wide||i.id!=="tq_amp_larga")).forEach(i=>(g[vkey(i)]=g[vkey(i)]||[]).push(i.id));
  Object.entries(g).forEach(([k,o])=>K.push({k,opts:o}));
  SL.forEach(s=>K.push({k:s.k,opts:D.instr.filter(i=>i.role===s.role).map(i=>i.id)}));
  return K;
}
// Scelte coordinate: un posto alla volta, tenendo conto di cosa coprono gli altri, finché nulla migliora.
// Esposizione: quanto può toglierti un avversario che sceglie, giocatore per giocatore e voce per voce, ciò che ti colpisce di più.
function oppKeys(){
  const G=guesses(),keys=[],sigK=new Set();
  oppSlots().forEach(s=>{if(!G[s.k])keys.push(D.instr.filter(i=>i.role===s.role).map(i=>i.id))});
  D.signals.filter(g=>st.sig.includes(g.id)).forEach(g=>g.nodes.forEach(n=>sigK.add(vkey(byId[n]))));
  const gr={};Object.keys(D.prior).forEach(id=>{const k=vkey(byId[id]);if(!sigK.has(k)&&!tgOf(k.slice(3)))(gr[k]=gr[k]||[]).push(id)});
  return keys.concat(Object.values(gr));
}
function exposure(ids,OK){
  const mine=new Set(ids),dmg=y=>{let cov=0,hit=0,use=0;
    (HITS[y]||[]).forEach(e=>{if(mine.has(e.w))cov=Math.max(cov,EW(e))});
    (BEATS[y]||[]).forEach(e=>{if(mine.has(e.l)){if(e.t==="B")hit=Math.max(hit,EW(e));else use=Math.max(use,EW(e))}});
    return Math.max(0,hit*(cov?ENG().cv:1)+ENG().us*use-cov)};
  const used=new Set();let s=0;
  OK.forEach(opts=>{let b=0,by="";opts.forEach(y=>{if(used.has(y))return;const d=dmg(y);if(d>b){b=d;by=y}});if(by){used.add(by);s+=b}});
  return s;
}
const KAPPA=.6;                      // quanto pesa l'esposizione quando giochi sul sicuro
function optimize(K,M,start,fixed,lam,ban,thr){
  const P={...start},ids=()=>Object.values(P).filter(Boolean),OK=st.safe?oppKeys():null;
  const IMP=ENG().imp;                  // le penalità seguono lo stesso peso del resto, altrimenti col motore nuovo conterebbero di meno
  const evalSet=(a,M,l)=>evalSetBase(a,M,l,markIdOf(P),oppMarkIdOf(P),myWOf(P))-IMP*((OK?KAPPA*exposure(a,OK):0)+yellowPen(P)+tagPen(P));
  for(let pass=0;pass<4;pass++){
    let changed=false;
    K.forEach(({k,opts})=>{
      if(fixed[k]!==undefined){P[k]=fixed[k];return}
      const cur=P[k]||"",allowed=["",...opts].filter(o=>!ban.includes(o));
      let best="",bv=-Infinity,cv=-Infinity;
      allowed.forEach(o=>{P[k]=o;const v=evalSet(ids(),M,lam);if(o===cur)cv=v;if(v>bv+1e-9){bv=v;best=o}});
      P[k]=(allowed.includes(cur)&&bv<=cv+thr)?cur:best;
      if(P[k]!==cur)changed=true;
    });
    if(!changed)break;
  }
  // due tuoi giocatori nello stesso ruolo e allo stesso livello sono intercambiabili: fisso l'ordine per non mostrare scambi inutili
  const em=effMark(),lock=new Set([...Object.keys(fixed),em&&em.mine,st.tgMark,...myBooked()].filter(Boolean)),grp={};
  mySlots().forEach(s=>{if(lock.has(s.k)||!K.some(q=>q.k===s.k))return;const g=s.role+"|"+lvF("mine",s.k);(grp[g]=grp[g]||[]).push(s.k)});
  Object.values(grp).forEach(ks=>{if(ks.length<2)return;const v=ks.map(k=>P[k]||"").sort();ks.forEach((k,i)=>P[k]=v[i])});
  return P;
}
const _memo=new Map();
function memo(tag,fn){
  const k=tag+"|"+JSON.stringify([st.opp,st.mine,st.pick,st.sig,st.guess&&st.guess[st.opp],st.extra,st.risk,st.score,!!st.safe,PARAM,st.mark,st.tg,st.tgMark,st.red,st.yel,st.lv,st.tag,st.ovr,st.odds,st.home,LIVE.on?[st.gf,st.ga,st.left,(st.stats||{}).min,st.pmode]:0]);
  if(_memo.has(k))return _memo.get(k);
  const v=fn(); if(_memo.size>600)_memo.clear(); _memo.set(k,v); return v;
}
function compute(){return memo("C",computeRaw)}
// Affidabilità: ricalcolo la formazione variando le mie stime; se la scelta di un posto cambia, è «incerta».
function stability(sit){return memo("ST"+sit,()=>{
  const PERTURB=ENG().pert;
  const C0=compute(),V0=variant(sit,C0).P,keep={...PARAM},res={};
  Object.keys(V0).forEach(k=>res[k]={same:0,alt:{}});
  try{PERTURB.forEach(p=>{Object.assign(PARAM,keep,p);const C=computeRaw(),V=(sit==="pari"&&st.risk==null)?C.P:variantRaw(sit,C).P;
    Object.keys(V0).forEach(k=>{const a=V[k]||"";if(a===(V0[k]||""))res[k].same++;else res[k].alt[a]=(res[k].alt[a]||0)+1})})}
  finally{Object.assign(PARAM,keep)}
  Object.values(res).forEach(r=>{r.solid=r.same===PERTURB.length;const a=Object.entries(r.alt).sort((x,y)=>y[1]-x[1])[0];r.altId=a?a[0]:null});
  return res;
})}
function stabTag(r){if(!r)return"";return r.solid?`<span class="stb ok">solido</span>`:`<span class="stb un" title="Con stime un po' diverse diventa ${r.altId?esc(byId[r.altId].name):"Nessuna istruzione"}">incerto</span>`}
function markSuggest(){return memo("MS",()=>{
  const keep=st.mark;let base,best=null;
  try{st.mark=null;base=compute().total;
    mySlots().filter(s=>s.role!=="POR").forEach(a=>oppSlots().filter(s=>s.role!=="POR"&&canMark(a,s)).forEach(b=>{
      st.mark={mine:a.k,opp:b.k};const t=compute().total;if(!best||t>best.t)best={mine:a.k,opp:b.k,t}}))}
  finally{st.mark=keep}
  return best&&best.t>base+.05?{...best,gain:best.t-base}:null;
})}
// chi può marcare chi: i suoi attaccanti li marcano i tuoi difensori o centrocampisti, i suoi centrocampisti i tuoi
// centrocampisti o difensori, i suoi difensori i tuoi attaccanti o centrocampisti (un attaccante non marca un attaccante)
const LINE=r=>["PUN","COP","CEN","ALA"].includes(r)?0:["CC","EC"].includes(r)?1:["DC","ED"].includes(r)?2:3;
const canMark=(mine,opp)=>{const a=LINE(mine.role),b=LINE(opp.role);return a<3&&b<3&&(b===0?a>=1:b===1?a>=1:a<=1)};
// il suo giocatore con più stelle (almeno 4): chi dei tuoi lo marca meglio a uomo, e quanto rende rispetto alla zona
// con OVR o probabilità deve anche spiccare sui compagni (se sono tutti 5★ nessuno è «il più forte»)
function strongTarget(){const ref=starRef("opp");return oppSlots().filter(s=>s.role!=="POR"&&lvOf("opp",s.k)>=4&&lvOf("opp",s.k)-ref>=.5).sort((a,b)=>lvOf("opp",b.k)-lvOf("opp",a.k))[0]||null}
function strongMark(){return memo("SMK",()=>{
  const t=strongTarget();if(!t)return null;const keep=st.mark;let base,best=null;
  try{st.mark=null;base=compute().total;
    mySlots().filter(s=>canMark(s,t)).forEach(a=>{st.mark={mine:a.k,opp:t.k};const v=compute().total;if(!best||v>best.t)best={mine:a.k,opp:t.k,t:v}})}
  finally{st.mark=keep}
  return best?{...best,gain:best.t-base,target:t,stars:lvOf("opp",t.k)}:null})}
function strongMarkHTML(){
  const S=strongMark();if(!S)return "";
  const a=mySlots().find(s=>s.k===S.mine),p=ptsF(S.gain),on=st.mark&&st.mark.mine===S.mine&&st.mark.opp===S.opp,other=st.mark&&st.mark.opp===S.opp&&!on;
  const txt=on?`Il suo ${S.target.l.toLowerCase()} (${S.stars}★) è marcato a uomo dal tuo ${a.l.toLowerCase()}.`
    :other?`Il suo ${S.target.l.toLowerCase()} (${S.stars}★) è già marcato a uomo.`
    :`Il suo ${S.target.l.toLowerCase()} ha ${S.stars}★: marcalo a uomo con il tuo ${a.l.toLowerCase()}. ${p>0?`Rende ${p} punti di preparazione in più della zona.`:p===0?"Costa quasi niente rispetto alla zona.":`Costa ${-p} punti di preparazione, ma tocca molti meno palloni: decidi tu.`}`;
  return `<div class="tip ${p>0||on?"good":"warn"}"><b>Il suo più forte</b><span>${esc(txt)}${on||other?"":` <button class="link" data-act="markapply" data-v="${S.mine}|${S.opp}">Marcalo</button>`}</span></div>`;
}
function whyText(C,k){
  const id=C.P[k];
  const all=Object.entries(C.P).filter(([kk,v])=>v);
  if(!id)return "Nessuna istruzione: qui ogni opzione rischia più di quanto aggiunge, visto cosa coprono gli altri.";
  const others=new Set(all.filter(([kk])=>kk!==k).map(([kk,v])=>v)),uniq=[],shared=[],hit=[];
  C.S.forEach((p,y)=>{if(p<.08)return;
    if((HITS[y]||[]).some(e=>e.w===id))((HITS[y]||[]).some(e=>others.has(e.w))?shared:uniq).push([y,p]);
    if((BEATS[y]||[]).some(e=>e.l===id&&e.t==="B"))hit.push([y,p])});
  const top=(a,n)=>a.sort((x,y)=>y[1]-x[1]).slice(0,n).map(([y,p])=>esc(byId[y].name)+(p<.995?" "+Math.round(p*100)+"%":"")).join(", ");
  const mk=markIdOf(C.P),om=oppMarkIdOf(C.P),mw=myWOf(C.P),gain=evalSet(all.map(([kk,v])=>v),C.S,1,mk,om,mw)-evalSet(all.filter(([kk])=>kk!==k).map(([kk,v])=>v),C.S,1,k===(effMark()&&effMark().mine)?null:mk,k===st.tgMark?null:om,mw);
  let s=uniq.length?`Copre ${top(uniq,3)}, che nessun altro tuo giocatore ferma.`:shared.length?`Rinforza la copertura di ${top(shared,2)}.`:"Nessun incrocio forte: vale soprattutto come istruzione adatta al ruolo.";
  if(hit.length)s+=` Rischia contro ${top(hit,2)}.`;
  if(ENG().atk&&ATK[id]>=.3)s+=` Crea occasioni: ${ATK[id]>=.6?"molto":"abbastanza"} offensiva.`;
  return s+` Contributo alla preparazione: ${sgn(ptsF(gain))} punti.`;
}
function computeRaw(){
  const S=oppSet(), SL=mySlots(), K=keysFor(SL);
  const rowsFor=role=>D.instr.filter(i=>i.role===role).map(i=>({i,j:judge(i.id,S)})).sort((a,b)=>b.j.score-a.j.score);
  const data=[{key:"SQ",role:"SQ",label:D.roles.SQ,rows:rowsFor("SQ")},...SL.map(s=>({key:s.k,role:s.role,label:s.l,rows:rowsFor(s.role)}))];
  const fixed={};Object.entries(st.pick).forEach(([k,v])=>{const x=K.find(q=>q.k===k);if(x&&(v===""||x.opts.includes(v)))fixed[k]=v});
  // motore nuovo: la mentalità la decide il rischio (OVR, probabilità, uomini in più/in meno, valore del pareggio) e poi pesa sul calcolo
  const lam0=baseLam(),mx=mentFor(lam0),ff={...fixed};
  if(mx!==null&&ff["SQ:Mentalità"]===undefined&&K.some(q=>q.k==="SQ:Mentalità"))ff["SQ:Mentalità"]=isOff(mx)?"tq_ment_off":"";
  const start={};K.forEach(x=>start[x.k]=ff[x.k]!==undefined?ff[x.k]:"");
  // OVR di squadra e uomini in più/in meno cambiano già l'assetto base (non solo le varianti per punteggio)
  // se scegli tu l'istruzione «Mentalità offensiva» ma il rischio chiede più prudenza, vale «Offensiva»; se la togli, vale il lato prudente o l'equilibrio
  const mxe=mx===null?null:ff["SQ:Mentalità"]===undefined||mx===null?mx:ff["SQ:Mentalità"]?(mx==="voff"?"voff":"off"):isDef(mx)?mx:"eq";
  return withMent(mxe,()=>{
    const P=optimize(K,S,start,ff,lam0,[],0);
    const sel=SL.filter(s=>P[s.k]).map(s=>({k:s.k,id:P[s.k]}));
    const all=Object.values(P).filter(Boolean);
    const ids=[...new Set(all)];
    const total=evalSet(all,S,1,markIdOf(P),oppMarkIdOf(P),myWOf(P));
    return{S,SL,K,data,P,sel,ids,total,fixed,mx:mxe};
  });
}
const nm=id=>`${esc(byId[id].name)} <span class="rl">${SHORT[byId[id].role]}</span>`;
function sigsHTML(){
  const one=g=>`<button class="sig" data-act="sig" aria-pressed="${st.sig.includes(g.id)}" data-v="${g.id}"><b>${esc(g.label)}</b><span>${esc(g.clue)}</span></button>`;
  const S=D.signals.filter(g=>g.src!=="live"),L=D.signals.filter(g=>g.src==="live");
  return `<span class="label sigh">Dalle statistiche</span>${S.map(one).join("")}<span class="label sigh">Da quello che vedi in Live</span>${L.map(one).join("")}`;
}
function assettoText(C,sit,Vo){
  sit=sit||st.score;const V=Vo||variant(sit,C),nmx=id=>id?byId[id].name:"Nessuna istruzione";
  const sq=Object.entries(V.P).filter(([k,v])=>k.startsWith("SQ:")&&v&&k!=="SQ:Mentalità").map(([k,v])=>byId[v].name);
  const L=[`${SIT[sit][0]} · ${fm(st.mine)} contro ${fm(st.opp)} · preparazione ${votoF(V.total)}/100`,`Mentalità: ${V.ment} · Ritmo: ${V.extra.ritmo} · Perdita di tempo: ${V.extra.tempo}`,`Marcatura: ${markLabel(st.mark)}`,"Squadra: "+(sq.join(", ")||"equilibrata")];
  slots(st.mine).forEach(s=>L.push(`${s.l}: ${redOf("mine").includes(s.k)?"espulso":nmx(V.P[s.k])}`));
  return L.join("\n");
}
function holesHTML(C,V){
  C={...C,ids:[...new Set(Object.values(V.P).filter(Boolean))],P:V.P};
  const E=D.edges,red=[],amb=[],grn=[];
  const mine=new Set(D.instr.filter(i=>i.role==="SQ"||C.SL.some(s=>s.role===i.role)).map(i=>i.id));
  [...C.S.keys()].filter(y=>PR(C.S,y)>=TH/2&&(byId[y].role!=="SQ"||PR(C.S,y)>=.99)).sort((a,b)=>PR(C.S,b)-PR(C.S,a)).forEach(y=>{
    const hit=C.ids.filter(p=>E.some(e=>e.w===y&&e.l===p)), cov=C.ids.filter(p=>E.some(e=>e.w===p&&e.l===y));
    if(hit.length&&!cov.length){const fix=[...new Set(E.filter(e=>e.l===y&&mine.has(e.w)).map(e=>e.w))].slice(0,3);
      red.push(`<div class="hole"><span class="tag bad">Scoperto</span><div>${nm(y)}${pct(PR(C.S,y))} colpisce ${hit.map(nm).join(", ")}<small>${fix.length?"Lo ferma: "+fix.map(f=>esc(byId[f].name)).join(", "):"Nessuna tua opzione lo ferma: valuta di togliere l'istruzione colpita"}</small></div></div>`)}
    else if(hit.length)amb.push(`<div class="hole"><span class="tag warn">Duello</span><div>${nm(y)}${pct(PR(C.S,y))} colpisce ${hit.map(nm).join(", ")}<small>Ma lo ferma ${cov.map(f=>esc(byId[f].name)).join(", ")}</small></div></div>`);
    else if(cov.length)grn.push(nm(y)+pct(PR(C.S,y)));
  });
  const waste=C.ids.filter(p=>{const j=judge(p,C.S);return j.useless});
  return (red.length||amb.length?red.join("")+amb.join(""):`<div class="hole"><span class="tag good">Nessuno</span><div>Nessuna minaccia probabile colpisce le tue scelte.</div></div>`)+
    (waste.length?`<div class="hole"><span class="tag idle">Sprecate</span><div>${waste.map(nm).join(", ")}<small>Non hanno nulla da fermare contro questo avversario</small></div></div>`:"")+
    fatigueHTML(C,V)+
    (grn.length?`<div class="hole"><span class="tag good">Coperte</span><div>${grn.join(", ")}</div></div>`:"");
}
function fatigueHTML(C,V){
  const f=[];
  if(V.extra.ritmo==="Veloce")f.push("Ritmo veloce");
  if(C.ids.includes("tq_press_alto"))f.push("Pressing alto");
  if(C.ids.includes("cc_b2b"))f.push("Box-to-box");
  const press=st.sig.includes("s_press")&&C.ids.includes("cc_b2b");
  if(f.length<2&&!press)return "";
  const msg=f.length>=2?`Hai ${f.length} scelte che stancano: ${f.join(", ")}. Nel secondo tempo togli per prima ${esc(f[0])}${f[0]==="Ritmo veloce"?" (non ha incroci, perdi poco)":""}.`:"";
  const pm=press?" Il Box-to-box si sfinisce contro il pressing, e l'avversario sembra pressarti alto.":"";
  return `<div class="hole"><span class="tag warn">Stanchezza</span><div>${msg}${pm}</div></div>`;
}
function cornersHTML(C,V){
  C={...C,ids:[...new Set(Object.values(V.P).filter(Boolean))],P:V.P};
  const mine=C.P["SQ:Angoli"], out=[];
  out.push(`<div class="hole"><span class="tag good">A favore</span><div>${mine?`Batti <b>${esc(byId[mine].name.replace("Angoli: ",""))}</b>. `:""}Corto annulla le Uscite alte del suo portiere e, per deduzione, il Domina in area dei suoi centrali; Primo palo annulla solo le Uscite alte.<small>Secondo palo: il testo del gioco non era disponibile, quindi non lo valuto.</small></div></div>`);
  const mineDef=C.ids.filter(p=>p==="por_uscite"||p==="dc_dom");
  out.push(`<div class="hole"><span class="tag ${mineDef.length?"warn":"idle"}">Contro</span><div>${mineDef.length?`Sugli angoli suoi, ${mineDef.map(p=>esc(byId[p].name)).join(" e ")} non servono se batte Corto o Primo palo.`:"Sugli angoli suoi non hai istruzioni che possa annullare."}
    ${st.sig.includes("s_largo")?"<small>Ha molti angoli: le palle alte in area contano più del solito.</small>":""}</div></div>`);
  return out.join("");
}
function cmpHTML(){return memo("CMP",cmpRaw)}
function cmpRaw(){
  const keep={mine:st.mine,pick:st.pick};let rows;
  try{st.pick={};NOSTARS=true;rows=Object.keys(D.forms).map(f=>{st.mine=f;const C=computeRaw();return{f,t:C.total,w:worstRaw(C.P).exposure}})}finally{NOSTARS=false;Object.assign(st,keep)}
  rows.forEach(r=>{r.p=votoF(r.t);r.r=rischio(r.w);r.tot=r5((r.p+(100-r.r))/2)});
  const s=[...rows].sort((a,b)=>b.tot-a.tot),best=s[0].tot>s[1].tot?s[0].f:"";
  // cerchi in righe per numero di difensori (1, 2, 3), in ogni riga prima chi ha meno centrocampisti e poi meno attaccanti.
  // Colore: 100 oro più chiaro, 90 e 95 oro, sotto 90 lo stesso oro molto attenuato.
  const col=p=>p>=100?"g":p>=90?"o":"r",num=f=>f.split("-").map(Number);
  const circ=r=>`<button class="mcir ${col(r.p)}" data-act="mine" data-v="${r.f}" aria-pressed="${r.f===st.mine}" aria-label="Modulo ${fm(r.f)}, preparazione ${r.p}${r.f===best?", consigliato":""}"><b>${fm(r.f)}</b><span>${r.p}</span><i>${r.f===best?"consigliato":r.f===st.mine?"in uso":""}</i></button>`;
  return [1,2,3].map(d=>{const L=rows.filter(r=>num(r.f)[1]===d).sort((a,b)=>num(a.f)[2]-num(b.f)[2]||num(a.f)[3]-num(b.f)[3]);
    return L.length?`<div class="mrow"><span class="mlab">Difesa a ${d}</span><div class="mline">${L.map(circ).join("")}</div></div>`:""}).join("");
}
const SCORE={vantaggio:["Perdita di tempo: Sì, quando si è in vantaggio. Si gioca meno per entrambe; rischi qualche ammonizione.","Mentalità più prudente e Transizioni in Contropiede: chi insegue si sbilancia, e il contropiede punisce chi si scopre.","Aspettati più pressione: se inizia a pressarti alto, segna l'indizio e passa a Passaggi lunghi o Rinvio lungo."],
  pari:["Nessuna correzione legata al punteggio: resta sulle scelte del tuo assetto."],
  svantaggio:["Mentalità più offensiva e Ritmo veloce creano più occasioni, ma ti scopri: rischioso contro chi riparte.","Se lui si abbassa per difendere il vantaggio, segna «Aspetta basso»: rendono Tiri da fuori incoraggiati e Trequartista.","Perdita di tempo: No."]};
function ifHTML(C){
  const E=D.edges,out=[];
  D.signals.filter(g=>!st.sig.includes(g.id)).forEach(g=>{
    const S2=new Map(C.S);S2.wt=C.S.wt;S2.lossP=C.S.lossP?new Map(C.S.lossP):null;g.nodes.forEach(n=>{S2.set(n,1);if(S2.lossP)S2.lossP.set(n,1)});
    const sqAff=Object.entries(C.P).filter(([k,v])=>k.startsWith("SQ:")&&v&&g.nodes.some(n=>E.some(e=>e.w===n&&e.l===v)));
    const slAff=C.sel.filter(s=>g.nodes.some(n=>E.some(e=>e.w===n&&e.l===s.id)));
    if(!sqAff.length&&!slAff.length)return;
    const alt=rows=>rows.map(i=>({i,j:judge(i.id,S2)})).sort((a,b)=>b.j.score-a.j.score)[0];
    const gain=(cur,a)=>{const c=judge(cur,S2).score;return (a&&a.j.score>0?a.j.score:0)-c};
    const moves=[...sqAff.map(([k,v])=>{const a=alt(D.instr.filter(i=>i.role==="SQ"&&vkey(i)===k&&i.id!==v));return `${esc(byId[v].name)} → ${a&&a.j.score>0?esc(a.i.name):"toglila"} ${svP(ptsF(gain(v,a)))}`}),
      ...slAff.map(s=>{const a=alt(D.instr.filter(i=>i.role===byId[s.id].role&&i.id!==s.id));const lab=C.SL.find(x=>x.k===s.k).l;return `${esc(lab)}: ${esc(byId[s.id].name)} → ${a&&a.j.score>0?esc(a.i.name):"togli l'istruzione"} ${svP(ptsF(gain(s.id,a)))}`})];
    out.push(`<div class="hole"><div><b>${esc(g.label)}</b><small>${esc(g.clue)}</small></div><div style="margin-left:auto;text-align:right">${moves.join("<br>")}</div></div>`)});
  return out.length?out.join("")+`<p class="note">Accanto a ogni cambio: quanti punti di preparazione guadagni facendolo, se l'indizio si verifica.</p>`:`<p class="note">Nessun indizio non ancora segnato metterebbe in crisi il tuo assetto.</p>`;
}
let gopen="";
function proposals(){
  const G=guesses(),out=[];
  st.sig.forEach(sid=>(D.sigmap[sid]||[]).forEach(([role,id])=>oppSlots().filter(s=>s.role===role&&!G[s.k]).forEach(s=>out.push({s,id,sid}))));
  return out;
}
function infoValue(){return memo("IV",infoValueRaw)}
function infoValueRaw(){
  const G0=st.guess,P0=st.pick,base={...guesses()},SLm=mySlots(),res=[];
  st.pick={};
  try{
    oppSlots().filter(s=>!base[s.k]).forEach(s=>{
      const opts=["none",...D.instr.filter(i=>i.role===s.role).map(i=>i.id)];
      const picks=opts.map(o=>{st.guess={...(G0||{}),[st.opp]:{...base,[s.k]:o}};return compute().P});
      const changed=Object.keys(picks[0]).filter(k=>new Set(picks.map(p=>p[k]||"")).size>1)
        .map(k=>k.startsWith("SQ:")?k.slice(3):(SLm.find(x=>x.k===k)||{l:k}).l);
      if(changed.length)res.push({s,changed});
    });
  }finally{st.guess=G0;st.pick=P0}
  return res.sort((a,b)=>b.changed.length-a.changed.length);
}
function watchHTML(){
  const iv=infoValue();
  if(!iv.length)return `<div class="hint xp"><b>Da osservare</b><span>Qualunque cosa facciano i giocatori che non hai ancora ipotizzato, le tue scelte consigliate non cambiano.</span></div>`;
  return `<div class="hint xp"><b>Da osservare per primo</b>${iv.slice(0,2).map(x=>`<span><button class="link" data-act="gopen" data-v="${x.s.k}">${esc(x.s.l)}</button>: da cosa fa dipende ${x.changed.map(esc).join(", ")}.</span>`).join("")}</div>`;
}
function propHTML(){
  const pr=proposals(); if(!pr.length)return "";
  return `<div class="hint prop"><b>Gli indizi suggeriscono</b>${pr.map(p=>`<span>${esc(p.s.l)} → ${esc(byId[p.id].name)} <small>(${esc(D.signals.find(g=>g.id===p.sid).label)})</small> <button class="link" data-act="gapply" data-v="${p.s.k}|${p.id}">Applica</button></span>`).join("")}
    ${pr.length>1?`<button class="link" data-act="gapplyall">Applica tutte</button>`:""}</div>`;
}
function oppPitchHTML(){
  const SL=oppSlots(),ALL=slots(st.opp),RO=redOf("opp"),G=guesses(),line=r=>["PUN","COP","CEN","ALA"].includes(r)?0:["CC","EC"].includes(r)?1:["DC","ED"].includes(r)?2:3;
  const rows=[0,1,2,3].map(n=>ALL.filter(s=>line(s.role)===n));
  const lab=g=>g==="none"?"Nessuna istr.":g?byId[g].name:"Tocca";
  const n=Object.keys(G).filter(k=>SL.some(s=>s.k===k)).length;
  let panel="";
  const s=SL.find(x=>x.k===gopen);
  if(s){const opts=D.instr.filter(i=>i.role===s.role),g=G[s.k];
    panel=`<div class="bar"><b>${esc(s.l)}</b><button class="link" data-act="gclose">Chiudi</button></div>
      ${pTags(s.k)?`<div class="xp">${pTags(s.k)}</div>`:""}
      <div class="rtop">${[["","Non so"],["none","Nessuna"]].map(([v,l])=>`<button class="gopt" data-act="guess" data-v="${s.k}|${v}" aria-pressed="${(g||"")===v}"><b>${l}</b></button>`).join("")}</div>
      <span class="label">Ruolo e stelle</span>
      <div class="rgrid">${opts.map(i=>roleCard("opp",s.k,i.id,i.name,g===i.id,"guess",`${s.k}|${i.id}`,"")).join("")}</div>
      <span class="note">Tocca il nome per scegliere il ruolo, o una stella per sceglierlo con quelle stelle.</span>`}
  const pitch=`<div class="pitch opp">${rows.filter(r=>r.length).map(r=>`<div>${r.map(s=>RO.includes(s.k)?`<span class="oslot red"><b>${({DC:"Centrale",ED:"Terzino",CC:"Centroc.",EC:"Esterno",PUN:"Punta",COP:"Attaccante",CEN:"Centravanti",ALA:"Ala"})[s.role]||""}</b><span>Espulso</span></span>`:`<button class="oslot${G[s.k]?" set":""}${yelOf("opp").includes(s.k)?" yel":""}" data-side="opp"${s.role!=="POR"?` data-slot="${s.k}"`:""} data-act="gopen" data-v="${s.k}" aria-pressed="${gopen===s.k}" aria-label="${esc(s.l)}"><b>${({POR:"Portiere",DC:"Centrale",ED:"Terzino",CC:"Centroc.",EC:"Esterno",PUN:"Punta",COP:"Attaccante",CEN:"Centravanti",ALA:"Ala"})[s.role]}</b><span>${esc(lab(G[s.k]))}</span>${lvBadge("opp",s.k)}</button>`).join("")}</div>`).join("")}</div>`;
  return pfield("opp",pitch,panel)+`${propHTML()}${watchHTML()}<div class="bar"><span class="note">Tocca un giocatore e scegli cosa pensi che faccia.${n?` Ipotesi: ${n}.`:""}</span>${n?`<button class="link" data-act="greset">Azzera ipotesi</button>`:""}</div>`;
}
function planTotal(p){
  if(p===st.plan)return null; const o=st.plans[p]; if(!o)return null;
  const keep={mine:st.mine,pick:st.pick,extra:st.extra};
  try{st.mine=o.mine;st.pick=o.pick||{};st.extra=o.extra||st.extra;return compute().total}finally{Object.assign(st,keep)}
}

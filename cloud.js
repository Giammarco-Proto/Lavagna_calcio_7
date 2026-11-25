// Invio volontario e anonimo delle partite al database condiviso (Supabase). Si carica dopo views.js.
"use strict";
// La chiave «publishable» è pensata per stare nel codice della pagina: da sola può solo AGGIUNGERE righe nella tabella `partite`
// (lo decide la sicurezza del database, non l'app). Leggere, cambiare o cancellare è impossibile da qui.
// L'invio parte SOLO quando premi INVIA in alto. Una partita può avere più invii (stesso partita_id, numero 1, 2, 3…):
// ognuno è una «fotografia» di moduli, giocatori con le stelle, tattica e statistiche in quel momento.
const CLOUD={
  url:"https://dhdppnyfqbtjxmmnuytj.supabase.co/rest/v1/partite",
  key:"sb_publishable_Xzrgse74KLWDTECMUwbtqQ_nDSeRSww",
  appVersion:"88"};         // alza insieme a CACHE in sw.js

const uuid=()=>crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,k=>{const r=Math.random()*16|0;return(k==="x"?r:r&3|8).toString(16)});
/** Codice casuale di questo telefono: non identifica nessuno, serve solo a raggruppare le partite di chi le invia. */
function phoneCode(){
  try{let c=localStorage.getItem("lavagna-telefono");if(!c){c=uuid();localStorage.setItem("lavagna-telefono",c)}return c}catch(e){return null}}

/** Le tre cose che distinguono una fotografia dalla precedente: servono a scrivere il «motivo» dell'invio. */
function cloudKeys(C){
  const V=variant(st.score,C);
  return{modulo:st.mine+"|"+st.opp,tattica:JSON.stringify([V.P,V.ment]),statistiche:(st.reads||[]).length}}

/** Coppie «tuo / suo» delle statistiche del gioco: nome nel database → chiavi dell'app (m = tu, s = lui). */
const STAT_PAIRS=[["tiri","tm","ts"],["tiri_porta","qm","qs"],["xg","xm","xs"],["angoli","am","as"],["falli","fm","fs"],["fuorigioco","om","os"]];
const periodNum=v=>{const n=parseFloat(String(v==null?"":v).replace(",","."));return isNaN(n)?null:n};
/**
 * Statistiche A PERIODO. Il gioco dà TOTALI dall'inizio: qui li trasformo in ciò che è successo tra una lettura e la successiva.
 * Letture al 45' e al 70' → periodo 0-45 (i totali del 45') e periodo 45-70 (totali del 70' meno totali del 45').
 * Il possesso è una media dall'inizio, quindi il possesso del periodo si ricava da (media2·minuto2 − media1·minuto1) / durata.
 * Funzione pura: non legge `st`. Un dato mancante resta null e non falsa il periodo dopo (si riparte dall'ultimo valore noto).
 * @param {{min:number,s:Object}[]} reads  letture in ordine di minuto
 * @returns {Object[]} un periodo per lettura: {da,a, possesso:{io,lui}, tiri:{io,lui}, …}
 */
function statPeriods(reads){
  const out=[],base={},pm={min:0,v:50};let prev=0;
  for(const r of reads||[]){
    const min=periodNum(r&&r.min);if(min==null||min<=prev)continue;
    const p={da:prev,a:min},s=r.s||{};
    const v=periodNum(s.pm);
    if(v!=null){const io=Math.max(0,Math.min(100,Math.round((v*min-pm.v*pm.min)/(min-pm.min))));p.possesso={io,lui:100-io};pm.min=min;pm.v=v}else p.possesso={io:null,lui:null};
    for(const [name,km,ks] of STAT_PAIRS){
      const one=k=>{const t=periodNum(s[k]);if(t==null)return null;const d=Math.max(0,Math.round((t-(base[k]||0))*10)/10);base[k]=t;return d};
      p[name]={io:one(km),lui:one(ks)}}
    out.push(p);prev=min}
  return out}
/** Le letture salvate più, se ci sono, i numeri scritti ma non ancora «Letti» (segnati letta:false). */
function periodsForReport(){
  const reads=[...(st.reads||[])],last=reads[reads.length-1],min=periodNum((st.stats||{}).min);
  let pending=false;
  if(min!=null&&min>0&&(!last||min>last.min)){
    const s={...st.stats};delete s.min;
    if(Object.values(s).some(x=>periodNum(x)!=null)){reads.push({min,s});pending=true}}
  const P=statPeriods(reads);
  if(pending&&P.length)P[P.length-1].letta=false;
  return P}
/** Costruisce la riga da inviare dallo stato dell'app. Non invia nulla. `motivo`: cosa è cambiato. */
function buildReport(motivo){
  const G=goalsOf(),P=oddsP(),m=curMin(),C=compute(),V=variant(st.score,C),F=forecast();
  const pct=x=>x==null?null:Math.round(x*100);
  if(!st.matchId)st.matchId=uuid();
  const lvr=side=>(((st.lvr||{})[side])||{})[side==="mine"?st.mine:st.opp]||{};
  return{
    telefono:phoneCode(),partita_id:st.matchId,numero:(st.sendN||0)+1,motivo:motivo&&motivo.length?motivo:["manuale"],versione_app:CLOUD.appVersion,
    mio_modulo:st.mine,suo_modulo:st.opp,
    mio_ovr:(st.ovr||{}).mine||null,suo_ovr:(st.ovr||{}).opp||null,
    p_vittoria:P?pct(P.w):null,p_pareggio:P?pct(P.d):null,p_sconfitta:P?pct(P.l):null,
    in_casa:st.home===true||st.home===false?st.home:null,
    gol_fatti:G.me,gol_subiti:G.him,minuto:m==null?0:Math.min(130,Math.round(m)),finale:!!st.sendFinal,
    dati:{
      situazione:st.score,previsione:{v:F.w,p:F.d,s:F.l},mentalita:V.ment,consiglio:V.P,
      // giocatori: stelle per posto e per ruolo (chiave «posto|ruolo»), etichette veloce/fisico dell'avversario
      giocatori:{io:{stelle:lvMap("mine"),stelle_ruolo:lvr("mine")},lui:{stelle:lvMap("opp"),stelle_ruolo:lvr("opp"),etichette:tagMap()}},
      mie_scelte:st.pick||{},sue_ipotesi:(st.guess||{})[st.opp]||{},sue_tattiche:st.tg||{},
      marcatura:{mia:st.mark||null,sua:st.tgMark||null},ritmo:st.extra||{},
      indizi:st.sig||[],periodi:periodsForReport(),
      rossi:{io:redOf("mine").length,lui:redOf("opp").length},gialli:{io:yelOf("mine").length,lui:yelOf("opp").length}}}}
/** Impronta della fotografia (senza numero, motivo e minuto): serve a non rimandare due volte la stessa cosa. */
const reportSig=r=>JSON.stringify({...r,numero:0,motivo:0,minuto:null});

let SENDING=false;
/** Si chiama dal tasto INVIA. Chiede conferma, manda una fotografia e mostra sempre l'esito. */
async function sendMatch(){
  if(SENDING)return false;
  const B=st.modBlank||{};
  if(B.mine||B.opp){showToast(`<span class="label">Manca qualcosa</span><div>Scegli prima il tuo modulo e quello dell'avversario.</div>`);return false}
  const keys=cloudKeys(compute()),last=st.lastKeys,changed=last?Object.keys(keys).filter(k=>keys[k]!==last[k]):[];
  const rep=buildReport(changed);if(!rep.telefono){showToast(`<span class="label">Non posso inviare</span><div>Il telefono non permette di salvare il codice anonimo.</div>`);return false}
  const sig=reportSig(rep);
  if(st.lastSent===sig){showToast(`<span class="label">Già inviata</span><div>Non è cambiato nulla dall'ultimo invio.</div>`);return false}
  // Niente finestra di conferma del telefono: su alcuni telefoni non compare e l'invio sembra morto. INVIA è già un gesto voluto.
  SENDING=true;showToast(`<span class="label">Invio…</span><div>Sto mandando l'analisi.</div>`,10000);
  try{
    const r=await fetch(CLOUD.url,{method:"POST",headers:{"apikey":CLOUD.key,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(rep)});
    if(!r.ok)throw new Error(String(r.status));
    st.lastSent=sig;st.lastKeys=keys;st.sendN=rep.numero;save();
    // da Prepara è l'analisi pre-match: messaggio di buon augurio; in partita un semplice grazie con il numero dell'invio
    showToast(LIVE.view==="modulo"
      ?`<span class="label">Ottimo!</span><div>L'analisi pre-match è stata inviata.</div><div><b>IN BOCCA AL 🐺 PER LA PARTITA!</b></div>`
      :`<span class="label">Inviata</span><div>Grazie! Invio n° ${rep.numero} di questa partita.</div>`,6500);
    return true;
  }catch(e){
    showToast(`<span class="label">Non inviata</span><div>${navigator.onLine?`Il database non risponde (${esc(String(e&&e.message||e))}): riprova tra poco.`:"Nessuna connessione: riprova quando torna internet."}</div>`,6000);
    return false;
  }finally{SENDING=false}}

/** Dopo un Reset: nuova partita, nuovo codice, numerazione da 1. */
function cloudReset(){st.matchId=null;st.sendN=0;st.lastSent=null;st.lastKeys=null}

/** Aggiorna il tasto «La partita è finita» nella scheda Partita. */
function renderSendbox(){
  document.querySelectorAll('[data-act="sendfinal"]').forEach(b=>b.setAttribute("aria-pressed",String(!!st.sendFinal)));
}

// Price trend overlay: shows the buyer's daily rates from the Telegram "Price Update" message as a graph.
// Opened by the Trend button. Prices are stored on the shared server (same passcode as the book).
(()=>{
'use strict';
const KEYSTORE='pst.book.key',CACHE='pst.prices.v1';
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const $=(s,r=document)=>r.querySelector(s);
const fmt=n=>Number(n).toLocaleString('en-IN');
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- read the Telegram message ---------- */
function parsePriceMessage(text){
  const t=String(text||'').replace(/[*`_]/g,'');
  const head=t.match(/Price\s*Update\s*(\d{1,2})\s*([A-Za-z]{3,9})(?:\s*(\d{4}))?\s*Valid\s*(\d{1,2}:\d{2}\s*[AP]M)?\s*(?:\(\s*([^)]*?)\s*\))?/i);
  if(!head)return {error:'Could not find the "Price Update <date>" line.'};
  const month=MON.findIndex(m=>m.toLowerCase()===head[2].slice(0,3).toLowerCase());
  if(month<0)return {error:'Unknown month: '+head[2]};
  const rates={},re=/₹\s*(\d{3,5})\s*Play\s*station\s*:?\s*₹\s*([\d,]+)[^\n]*\n?[^\n]*?\(\s*0*(\d+)\s*pcs?\s*Minimum\s*\)/gi;
  let m;
  while((m=re.exec(t))){
    const price=+m[2].replace(/,/g,''),pcs=+m[3],r=rates[m[1]]||(rates[m[1]]={});
    if(pcs===1)r.p1=price;else if(pcs===5)r.p5=price;
  }
  for(const k of Object.keys(rates))if(rates[k].p1===undefined&&rates[k].p5===undefined)delete rates[k];
  if(!Object.keys(rates).length)return {error:'No rates found in the message.'};
  return {day:+head[1],month,year:head[3]?+head[3]:null,valid:(head[4]||'').replace(/\s+/g,' ').trim()||null,session:(head[5]||'').trim()||null,rates};
}
// Turn the parsed message into the record we store. The message has no year, so use this year
// (or last year if that would put the date in the future).
function toRecord(p,now=new Date()){
  let y=p.year||now.getFullYear();
  if(!p.year&&Date.UTC(y,p.month,p.day)>now.getTime()+2*864e5)y--;
  const date=`${y}-${pad(p.month+1)}-${pad(p.day)}`;
  let hh=12,mm=0;
  const v=p.valid&&p.valid.match(/(\d{1,2}):(\d{2})\s*([AP])M/i);
  if(v){hh=+v[1]%12+(v[3].toUpperCase()==='P'?12:0);mm=+v[2]}
  const ts=Date.UTC(y,p.month,p.day,hh,mm)-330*6e4; // times in the message are IST
  return {id:date+'|'+(p.session||p.valid||'update').toLowerCase().replace(/[^a-z0-9: ]/g,'').slice(0,30),date,ts,session:p.session,valid:p.valid,rates:p.rates};
}
const dLabel=r=>{const [y,m,d]=r.date.split('-');return `${+d} ${MON[+m-1]}`};
const dFull=r=>dLabel(r)+(r.session?' · '+r.session:'');

/* ---------- storage: server first, this device keeps a copy ---------- */
const getKey=()=>{try{return localStorage.getItem(KEYSTORE)||''}catch(e){return ''}};
function ensureKey(){if(getKey())return true;const k=(prompt('Enter the book passcode')||'').trim();if(!k)return false;try{localStorage.setItem(KEYSTORE,k)}catch(e){}return true}
async function api(method,path,body){
  const r=await fetch('/api/book'+path,{method,headers:{'content-type':'application/json','x-book-key':getKey()},body:body?JSON.stringify(body):undefined});
  if(r.status===401){try{localStorage.removeItem(KEYSTORE)}catch(e){}throw new Error('auth')}
  if(!r.ok)throw new Error('http '+r.status);
  return r.json();
}
const readCache=()=>{try{return JSON.parse(localStorage.getItem(CACHE))||[]}catch(e){return []}};
const writeCache=l=>{try{localStorage.setItem(CACHE,JSON.stringify(l))}catch(e){}};
let prices=readCache(),face='1000',pcs='p1',range=7,note='';

/* ---------- overlay shell ---------- */
const ov=document.createElement('div');
ov.id='tOverlay';ov.className='overlay';ov.hidden=true;
ov.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="tTitle">
  <div class="mhead"><div><h2 id="tTitle">Price trend</h2><p id="tNote">Buy rates from the Telegram price update</p></div>
  <button id="tClose" class="btn icon sm" data-ripple aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
  <div id="tBody"></div></section>`;
document.body.appendChild(ov);
const body=$('#tBody',ov);

const faces=()=>{const s=new Set();prices.forEach(p=>Object.keys(p.rates).forEach(k=>s.add(k)));return [...s].sort((a,b)=>a-b)};
const val=(p,f,k)=>p.rates[f]?p.rates[f][k]:undefined;
const seriesOf=(f,k)=>prices.filter(p=>val(p,f,k)!==undefined);
function inRange(list){
  if(!range||!list.length)return list;
  const cut=list[list.length-1].ts-range*864e5;
  return list.filter(p=>p.ts>=cut);
}
const chg=(a,b)=>{const d=a-b;return {d,pct:b?d/b*100:0}};
const chgTxt=c=>c.d===0?'no change':`${c.d>0?'▲':'▼'} ₹${fmt(Math.abs(c.d))} (${Math.abs(c.pct).toFixed(1)}%)`;
const chgCls=c=>c.d===0?'':c.d>0?'up':'down';

function chartSvg(list,k){
  const W=340,H=170,L=44,R=10,T=10,B=22,n=list.length;
  const vs=list.map(p=>val(p,face,k));
  let mn=Math.min(...vs),mx=Math.max(...vs);
  if(mn===mx){mn-=5;mx+=5}
  const pr=(mx-mn)*.15;mn-=pr;mx+=pr;
  const x=i=>n===1?(L+W-R)/2:L+(W-L-R)*i/(n-1),y=v=>T+(H-T-B)*(1-(v-mn)/(mx-mn));
  const pts=vs.map((v,i)=>[x(i),y(v)]);
  let g='';
  for(let i=0;i<3;i++){const v=mn+(mx-mn)*i/2,yy=y(v);g+=`<line class="gl" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text x="${L-6}" y="${yy+3}" text-anchor="end">${fmt(Math.round(v))}</text>`}
  const line=pts.map(p=>p.join(',')).join(' ');
  const area=n>1?`<polygon class="ar" points="${pts[0][0]},${H-B} ${line} ${pts[n-1][0]},${H-B}"/>`:'';
  const dots=n<=24?pts.map(p=>`<circle class="dt" cx="${p[0]}" cy="${p[1]}" r="2.6"/>`).join(''):'';
  const lab=(i,a)=>`<text x="${x(i)}" y="${H-6}" text-anchor="${a}">${dLabel(list[i])}</text>`;
  return {pts,svg:`<svg viewBox="0 0 ${W} ${H}" id="tSvg"><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ad07d" stop-opacity=".28"/><stop offset="1" stop-color="#3ad07d" stop-opacity="0"/></linearGradient></defs>${g}${area}${n>1?`<polyline class="ln" points="${line}"/>`:''}${dots}${n>1?lab(0,'start')+lab(n-1,'end'):lab(0,'middle')}<line id="tCur" class="cur" y1="${T}" y2="${H-B}" x1="-9" x2="-9"/></svg>`,W};
}

function render(){
  const fs=faces();
  $('#tNote',ov).textContent=note||'Buy rates from the Telegram price update';
  if(!prices.length){
    body.innerHTML=`<div class="tnone">No prices saved yet.<br>Paste your first Telegram price update below.</div>${addBox()}`;
    wireAdd();return;
  }
  if(!fs.includes(face))face=fs[0];
  const all=seriesOf(face,pcs),list=inRange(all);
  const latest=all[all.length-1],prev=all[all.length-2];
  const cur=latest?val(latest,face,pcs):0;
  const c=prev?chg(cur,val(prev,face,pcs)):null;
  const vs=list.map(p=>val(p,face,pcs));
  const hi=Math.max(...vs),lo=Math.min(...vs),avg=Math.round(vs.reduce((a,b)=>a+b,0)/vs.length);
  const ch=list.length?chartSvg(list,pcs):null;
  const rows=fs.map(f=>{
    const a=seriesOf(f,pcs),l=a[a.length-1],pv=a[a.length-2];
    if(!l)return '';
    const cc=pv?chg(val(l,f,pcs),val(pv,f,pcs)):null,o=pcs==='p1'?'p5':'p1',ov2=val(l,f,o);
    return `<div class="tl ${f===face?'sel':''}" data-f="${f}"><div class="f">₹${fmt(f)}<small>${ov2!==undefined?(pcs==='p1'?'5 pcs ':'1 pc ')+'₹'+fmt(ov2):''}</small></div><div class="v">₹${fmt(val(l,f,pcs))}</div><div class="c ${cc?chgCls(cc):''}">${cc?(cc.d===0?'–':(cc.d>0?'▲ ':'▼ ')+fmt(Math.abs(cc.d))):''}</div></div>`;
  }).join('');
  const hist=prices.slice(-8).reverse().map(p=>`<div class="thist"><span><b>${esc(dFull(p))}</b>${p.valid?' · valid '+esc(p.valid):''}</span><button data-del="${esc(p.id)}">Delete</button></div>`).join('');
  body.innerHTML=`
  <div class="tt" id="tFace">${fs.map(f=>`<button data-f="${f}" class="${f===face?'on':''}">${fmt(f)}</button>`).join('')}</div>
  <div class="tt" id="tPcs"><button data-p="p1" class="${pcs==='p1'?'on':''}">1 pc min</button><button data-p="p5" class="${pcs==='p5'?'on':''}">5 pcs min</button>
    <span style="flex:.3"></span>${[[7,'7d'],[30,'30d'],[0,'All']].map(([r,l])=>`<button data-r="${r}" class="${range===r?'on':''}">${l}</button>`).join('')}</div>
  ${latest?`<div class="tbig"><b>₹${fmt(cur)}</b>${c?`<span class="${chgCls(c)}">${chgTxt(c)}</span>`:''}</div>
  <p class="tsub" id="tTip">${esc(dFull(latest))}${latest.valid?' · valid '+esc(latest.valid):''}</p>`:`<div class="tnone">No ${pcs==='p1'?'1 pc':'5 pcs'} rate saved for ₹${fmt(face)}.</div>`}
  ${ch?`<div class="tchart">${ch.svg}</div>
  <div class="tstats"><div>Highest<b>₹${fmt(hi)}</b></div><div>Average<b>₹${fmt(avg)}</b></div><div>Lowest<b>₹${fmt(lo)}</b></div></div>`:''}
  <div class="th">Latest rates (${pcs==='p1'?'1 pc':'5 pcs'} min)</div>${rows}
  <div class="th">Saved updates</div>${hist}${addBox()}`;
  if(ch)wireChart(list,ch);
  wire();wireAdd();
}

function wireChart(list,ch){
  const svg=$('#tSvg',ov),cur=$('#tCur',ov),tip=$('#tTip',ov),base=tip.innerHTML;
  const move=e=>{
    const r=svg.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*340;
    let bi=0,bd=1e9;ch.pts.forEach((p,i)=>{const d=Math.abs(p[0]-px);if(d<bd){bd=d;bi=i}});
    const p=list[bi];cur.setAttribute('x1',ch.pts[bi][0]);cur.setAttribute('x2',ch.pts[bi][0]);
    tip.textContent=`${dFull(p)} · ₹${fmt(val(p,face,pcs))}`;
  };
  svg.addEventListener('pointermove',move);svg.addEventListener('pointerdown',move);
  svg.addEventListener('pointerleave',()=>{cur.setAttribute('x1',-9);cur.setAttribute('x2',-9);tip.innerHTML=base});
}
function wire(){
  body.querySelectorAll('#tFace button').forEach(b=>b.onclick=()=>{face=b.dataset.f;render()});
  body.querySelectorAll('#tPcs [data-p]').forEach(b=>b.onclick=()=>{pcs=b.dataset.p;render()});
  body.querySelectorAll('#tPcs [data-r]').forEach(b=>b.onclick=()=>{range=+b.dataset.r;render()});
  body.querySelectorAll('.tl').forEach(r=>r.onclick=()=>{face=r.dataset.f;render()});
  body.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.del,p=prices.find(x=>x.id===id);
    if(!p||!confirm('Delete the '+dFull(p)+' update?'))return;
    try{await api('DELETE','/prices/'+encodeURIComponent(id));prices=prices.filter(x=>x.id!==id);writeCache(prices);note='deleted';render()}
    catch(e){alert(e.message==='auth'?'Wrong passcode.':'Could not delete (offline?).')}
  });
}

/* ---------- paste box ---------- */
const addBox=()=>`<div class="tadd"><button class="ghost" id="tToggle">+ Add price update</button>
  <div id="tForm" hidden><textarea id="tText" placeholder="Paste the Telegram price message here" spellcheck="false"></textarea>
  <div class="tprev" id="tPrev"></div><button class="go" id="tSave" disabled>Save update</button></div></div>`;
function wireAdd(){
  const tg=$('#tToggle',ov);if(!tg)return;
  tg.onclick=()=>{const f=$('#tForm',ov);f.hidden=!f.hidden;if(!f.hidden)$('#tText',ov).focus()};
  const ta=$('#tText',ov),pv=$('#tPrev',ov),sv=$('#tSave',ov);let rec=null;
  ta.oninput=()=>{
    rec=null;sv.disabled=true;
    if(!ta.value.trim()){pv.textContent='';pv.className='tprev';return}
    const p=parsePriceMessage(ta.value);
    if(p.error){pv.textContent=p.error;pv.className='tprev bad';return}
    rec=toRecord(p);
    const n=Object.keys(rec.rates).length,old=prices.some(x=>x.id===rec.id);
    pv.className='tprev ok';
    pv.textContent=`${dFull(rec)}${rec.valid?' · valid '+rec.valid:''} · ${n} amount${n>1?'s':''}${old?' · will replace the saved one':''}`;
    sv.disabled=false;
  };
  sv.onclick=async()=>{
    if(!rec||!ensureKey())return;
    sv.disabled=true;sv.textContent='Saving…';
    try{
      await api('PUT','/prices',rec);
      prices=prices.filter(x=>x.id!==rec.id).concat(rec).sort((a,b)=>a.ts-b.ts);writeCache(prices);note='saved';render();
    }catch(e){sv.textContent='Save update';sv.disabled=false;pv.className='tprev bad';pv.textContent=e.message==='auth'?'Wrong passcode. Tap Save again to re-enter it.':'Could not save (offline?). Try again.'}
  };
}

/* ---------- open / close ---------- */
async function refresh(){
  if(!ensureKey()){note='passcode needed for live prices';render();return}
  try{const d=await api('GET','/prices');prices=d.prices||[];writeCache(prices);note='';}
  catch(e){note=e.message==='auth'?'wrong passcode - tap the button again':'offline - showing last saved copy'}
  render();
}
function open(){render();ov.hidden=false;document.body.style.overflow='hidden';refresh()}
function close(){if(ov.hidden)return;ov.classList.add('closing');setTimeout(()=>{ov.hidden=true;ov.classList.remove('closing');document.body.style.overflow=''},250)}
$('#tClose',ov).onclick=close;
ov.onclick=e=>{if(e.target===ov)close()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ov.hidden)close()});
$('#trendBtn').onclick=open;
window.__trend={parsePriceMessage,toRecord};
})();

// Price trend overlay: shows the buyer's daily rates from the WhatsApp "Price Update" message as a graph.
// Opened by the Trend button. Prices are stored on the shared server (same passcode as the book).
(()=>{
'use strict';
const KEYSTORE='pst.book.key',CACHE='pst.prices.v1';
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const $=(s,r=document)=>r.querySelector(s);
const fmt=n=>Number(n).toLocaleString('en-IN');
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- read the WhatsApp price messages ---------- */
// Handles: format 1 (several products, 2000-5000 with one rate line), format 2 (PlayStation only, 1pc + 5pcs lines),
// and the limited-time "offer" message. Several messages can be pasted at once; only PlayStation rates are kept.
const clean=t=>String(t||'').replace(/[*`_~]/g,'');
function psRates(lines){
  const rates={};
  lines.forEach((ln,i)=>{
    const m=ln.match(/₹\s*(\d{3,5})\s*Play\s*station[^₹\n]*₹\s*([\d,]+)/i);if(!m)return;
    let pcs=1;const nx=lines[i+1]||'';
    if(!/Play\s*station/i.test(nx)){const n=nx.match(/(\d+)\s*pcs?\s*Minimum/i);if(n)pcs=+n[1]}
    const r=rates[m[1]]||(rates[m[1]]={}),price=+m[2].replace(/,/g,'');
    if(pcs===1)r.p1=price;else if(pcs===5)r.p5=price;
  });
  for(const k of Object.keys(rates))if(rates[k].p1===undefined&&rates[k].p5===undefined)delete rates[k];
  return rates;
}
const HEAD=/Price\s*Update\s*(\d{1,2})\s*([A-Za-z]{3,9})(?:\s*(\d{4}))?\s*Valid\s*(\d{1,2}:\d{2}\s*[AP]M)?\s*(?:\(\s*([^)]*?)\s*\))?/i;
const OFFER_LINE=/^[^A-Za-z0-9]*offer[^A-Za-z0-9]*$/i;
const WINDOW=/\(\s*(\d{1,2}:\d{2}\s*[AP]M)\s*To\s*(\d{1,2}:\d{2}\s*[AP]M)\s*\)/i;
const hm=(t,def)=>{const v=t&&t.match(/(\d{1,2}):(\d{2})\s*([AP])M/i);return v?[+v[1]%12+(v[3].toUpperCase()==='P'?12:0),+v[2]]:def};
// IST times in the messages -> epoch ms
const istTs=(y,mo,d,h,mi)=>Date.UTC(y,mo,d,h,mi)-330*6e4;
function parseAll(text,fallbackDate,now=new Date()){
  const lines=clean(text).split(/\r?\n/);
  const heads=[];lines.forEach((l,i)=>{if(/Price\s*Update/i.test(l))heads.push(i)});
  const segs=[];
  if(!heads.length)segs.push({head:null,lines});
  else{
    if(heads[0]>0)segs.push({head:null,lines:lines.slice(0,heads[0])});
    heads.forEach((h,k)=>segs.push({head:lines[h].match(HEAD)||'bad',lines:lines.slice(h,heads[k+1]||lines.length)}));
  }
  const recs=[],warn=[];let last=null,needDate=false;
  for(const sg of segs){
    let reg=sg.lines,off=[];
    const oi=sg.lines.findIndex(l=>OFFER_LINE.test(l));
    if(oi>=0){reg=sg.lines.slice(0,oi);off=sg.lines.slice(oi+1)}
    if(sg.head==='bad'){warn.push('a "Price Update" line could not be read');continue}
    if(sg.head){
      const h=sg.head,month=MON.findIndex(m=>m.toLowerCase()===h[2].slice(0,3).toLowerCase());
      if(month<0){warn.push('unknown month '+h[2]);continue}
      let y=h[3]?+h[3]:now.getFullYear();
      if(!h[3]&&Date.UTC(y,month,+h[1])>now.getTime()+2*864e5)y--;
      const date=`${y}-${pad(month+1)}-${pad(+h[1])}`,rates=psRates(reg);
      last={y,month,d:+h[1],date};
      if(!Object.keys(rates).length)warn.push(`${+h[1]} ${MON[month]}: no PlayStation rates found`);
      else{
        const [hh,mm]=hm(h[4],[12,0]),session=(h[5]||'').trim()||null,valid=(h[4]||'').replace(/\s+/g,' ').trim()||null;
        recs.push({id:date+'|'+(session||valid||'update').toLowerCase().replace(/[^a-z0-9: ]/g,'').slice(0,30),date,ts:istTs(y,month,+h[1],hh,mm),session,valid,rates});
      }
    }
    const orates=psRates(off);
    if(Object.keys(orates).length){
      let d=last;
      if(!d){
        const f=String(fallbackDate||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);needDate=true;
        if(!f){warn.push('an offer has no date');continue}
        d={y:+f[1],month:+f[2]-1,d:+f[3],date:fallbackDate};
      }
      const w=off.join('\n').match(WINDOW),[hh,mm]=hm(w&&w[1],[12,0]);
      const win=w?w[1].replace(/\s+/g,'')+' - '+w[2].replace(/\s+/g,''):null;
      let id=d.date+'|offer-'+pad(hh)+pad(mm);
      while(recs.some(r=>r.id===id))id+='b';
      recs.push({id,date:d.date,ts:istTs(d.y,d.month,d.d,hh,mm),session:'Offer',valid:win,offer:true,rates:orates});
    }
  }
  return {records:recs,warnings:warn,needDate};
}
const dLabel=r=>{const [y,m,d]=r.date.split('-');return `${+d} ${MON[+m-1]}`};
const dFull=r=>dLabel(r)+(r.session?' · '+r.session:'');
const todayStr=()=>{const n=new Date();return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`};

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

/* ---------- state ---------- */
let prices=readCache(),note='';
let tab='today',selDate=null,face='1000',pcs='p1',metric='rate',range=7,dbp='p1',dbMonth='all';
const nowD=new Date();let calY=nowD.getFullYear(),calM=nowD.getMonth();

/* ---------- overlay shell ---------- */
const ov=document.createElement('div');
ov.id='tOverlay';ov.className='overlay';ov.hidden=true;
ov.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="tTitle">
  <div class="mhead"><div><h2 id="tTitle">Price trend</h2><p id="tNote">Buy rates from the WhatsApp price update</p></div>
  <button id="tClose" class="btn icon sm" data-ripple aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
  <div class="ttabs" id="tTabs">${[['today','Today'],['graph','Graph'],['data','Database'],['cal','Calendar']].map(([k,l])=>`<button data-t="${k}">${l}</button>`).join('')}</div>
  <div id="tBody"></div></section>`;
document.body.appendChild(ov);
const body=$('#tBody',ov);

/* ---------- data helpers ---------- */
const regs=()=>prices.filter(p=>!p.offer);
const val=(p,f,k)=>p.rates[f]?p.rates[f][k]:undefined;
const faces=()=>{const s=new Set();regs().forEach(p=>Object.keys(p.rates).forEach(k=>s.add(k)));return [...s].sort((a,b)=>a-b)};
const regDates=()=>[...new Set(regs().map(p=>p.date))].sort();
const dayRec=d=>regs().filter(p=>p.date===d).pop();
const dayVal=(d,f,k)=>{const a=regs().filter(p=>p.date===d&&val(p,f,k)!==undefined);return a.length?val(a[a.length-1],f,k):undefined};
const prevVal=(d,f,k)=>{const ds=regDates().filter(x=>x<d).reverse();for(const x of ds){const v=dayVal(x,f,k);if(v!==undefined)return v}};
const seriesOf=(f,k)=>regs().filter(p=>val(p,f,k)!==undefined);
const profit=(v,f)=>(v-f)/f*100;
const pctTxt=v=>(v>=0?'+':'')+v.toFixed(1)+'%';
const chg=(a,b)=>{const d=a-b;return {d,pct:b?d/b*100:0}};
const chgTxt=c=>c.d===0?'no change':`${c.d>0?'▲':'▼'} ₹${fmt(Math.abs(c.d))} (${Math.abs(c.pct).toFixed(1)}%)`;
const chgCls=c=>c.d===0?'':c.d>0?'up':'down';
const dayLabel=d=>{const [y,m,x]=d.split('-');return `${+x} ${MON[+m-1]}`};
const dayLong=d=>{const [y,m,x]=d.split('-'),w=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(Date.UTC(+y,+m-1,+x)).getUTCDay()];return `${w}, ${+x} ${MON[+m-1]} ${y}`};

/* ---------- tab 1: today's chart ---------- */
function tdCell(d,f,k){
  const v=dayVal(d,f,k);if(v===undefined)return '<td class="n">–</td><td class="pf">–</td>';
  const pv=prevVal(d,f,k),c=pv===undefined?null:chg(v,pv),p=profit(v,f);
  return `<td class="n"><b>₹${fmt(v)}</b><i class="c ${c?chgCls(c):''}">${c?(c.d===0?'no change':(c.d>0?'▲ ':'▼ ')+fmt(Math.abs(c.d))):'new'}</i></td><td class="pf ${p>=0?'up':'down'}">${pctTxt(p)}</td>`;
}
function todayHtml(){
  const ds=regDates();
  if(!ds.length)return `<div class="tnone">No prices saved yet.<br>Open the Database tab and paste your WhatsApp price updates.</div>`;
  if(!selDate)selDate=ds[ds.length-1];
  const latest=ds[ds.length-1],i=ds.indexOf(selDate),rec=dayRec(selDate),fs=faces();
  const offs=prices.filter(o=>o.offer&&o.date===selDate);
  const nav=`<div class="tdh"><button data-nav="-1" ${i<=0?'disabled':''} aria-label="Previous day">‹</button>
    <div><b>${selDate===latest?'Latest · ':''}${dayLong(selDate)}</b><span>${rec?esc(rec.session||'')+(rec.valid?' · valid '+esc(rec.valid):''):'no regular update this day'}</span></div>
    <button data-nav="1" ${i<0||i>=ds.length-1?'disabled':''} aria-label="Next day">›</button></div>`;
  const rows=rec?fs.map(f=>`<tr><th>₹${fmt(f)}</th>${tdCell(selDate,f,'p1')}${tdCell(selDate,f,'p5')}</tr>`).join(''):'';
  const table=rec?`<div class="twrap"><table class="tbl tday"><colgroup><col style="width:18%"><col style="width:23%"><col style="width:18%"><col style="width:23%"><col style="width:18%"></colgroup><thead><tr><th>Amount</th><th colspan="2">1 pc min</th><th colspan="2">5 pcs min</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="tfoot">Profit = rate over face value. Change compares with the last update of the previous day with a rate.</p>`:'';
  const offHtml=offs.map(o=>`<div class="toff"><b>Limited offer${o.valid?' · '+esc(o.valid):''}</b><span>${Object.keys(o.rates).sort((a,b)=>a-b).map(f=>`₹${fmt(f)} → <em>₹${fmt(o.rates[f].p1??o.rates[f].p5)}</em>`).join('  ·  ')}</span></div>`).join('');
  return nav+table+offHtml;
}

/* ---------- tab 2: graph ---------- */
function inRange(list){
  if(!range||!list.length)return list;
  const cut=list[list.length-1].ts-range*864e5;
  return list.filter(p=>p.ts>=cut);
}
function chartSvg(list,sers,offs,mv,axis){
  const W=340,H=170,L=44,R=10,T=10,B=22,n=list.length;
  const all=[];sers.forEach(sr=>list.forEach(p=>{const v=mv(p,sr.k);if(v!==undefined)all.push(v)}));
  offs.forEach(o=>all.push(mv(o,sers[0].k)));
  let mn=Math.min(...all),mx=Math.max(...all);
  if(mn===mx){mn-=5;mx+=5}
  const pr=(mx-mn)*.15;mn-=pr;mx+=pr;
  const x=i=>n===1?(L+W-R)/2:L+(W-L-R)*i/(n-1),y=v=>T+(H-T-B)*(1-(v-mn)/(mx-mn));
  const xT=ts=>{if(n===1||ts<=list[0].ts)return x(0);if(ts>=list[n-1].ts)return x(n-1);let i=0;while(list[i+1].ts<ts)i++;return x(i+(ts-list[i].ts)/(list[i+1].ts-list[i].ts))};
  let g='';
  for(let i=0;i<3;i++){const v=mn+(mx-mn)*i/2,yy=y(v);g+=`<line class="gl" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text x="${L-6}" y="${yy+3}" text-anchor="end">${axis(v)}</text>`}
  let lines='',area='',dots='';
  sers.forEach((sr,si)=>{
    const pts=[];list.forEach((p,i)=>{const v=mv(p,sr.k);if(v!==undefined)pts.push([x(i),y(v)])});
    if(pts.length>1){
      lines+=`<polyline class="ln ${sr.cls}" points="${pts.map(p=>p.join(',')).join(' ')}"/>`;
      if(si===0&&sers.length===1)area=`<polygon class="ar" points="${pts[0][0]},${H-B} ${pts.map(p=>p.join(',')).join(' ')} ${pts[pts.length-1][0]},${H-B}"/>`;
    }
    if(pts.length<=24)dots+=pts.map(p=>`<circle class="dt ${sr.cls}" cx="${p[0]}" cy="${p[1]}" r="2.6"/>`).join('');
  });
  const od=offs.map(o=>`<circle class="od" cx="${xT(o.ts)}" cy="${y(mv(o,sers[0].k))}" r="3.6"><title>${esc(dFull(o))} ${axis(mv(o,sers[0].k))}</title></circle>`).join('');
  const lab=(i,a)=>`<text x="${x(i)}" y="${H-6}" text-anchor="${a}">${dLabel(list[i])}</text>`;
  return {xs:list.map((_,i)=>x(i)),W,svg:`<svg viewBox="0 0 ${W} ${H}" id="tSvg"><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ad07d" stop-opacity=".28"/><stop offset="1" stop-color="#3ad07d" stop-opacity="0"/></linearGradient></defs>${g}${area}${lines}${dots}${od}${n>1?lab(0,'start')+lab(n-1,'end'):lab(0,'middle')}<line id="tCur" class="cur" y1="${T}" y2="${H-B}" x1="-9" x2="-9"/></svg>`};
}
function graphHtml(){
  const fs=faces();
  if(!fs.length)return `<div class="tnone">No prices saved yet.<br>Open the Database tab and paste your WhatsApp price updates.</div>`;
  if(!fs.includes(face))face=fs[0];
  const f=+face,both=pcs==='both',prim=both?'p1':pcs;
  const sers=both?[{k:'p1',cls:'s1'},{k:'p5',cls:'s2'}]:[{k:pcs,cls:'s1'}];
  const mv=(p,k)=>{const v=val(p,face,k);return v===undefined?undefined:metric==='pct'?profit(v,f):v};
  const axis=v=>metric==='pct'?v.toFixed(0)+'%':fmt(Math.round(v));
  const show=v=>metric==='pct'?pctTxt(v):'₹'+fmt(v);
  const all=regs().filter(p=>sers.some(sr=>val(p,face,sr.k)!==undefined)),list=inRange(all);
  const ps=list.filter(p=>val(p,face,prim)!==undefined);
  const head=`<div class="tt" id="tFace">${fs.map(x=>`<button data-f="${x}" class="${x===face?'on':''}">${fmt(x)}</button>`).join('')}</div>
  <div class="tt"><button data-p="p1" class="${pcs==='p1'?'on':''}">1 pc</button><button data-p="p5" class="${pcs==='p5'?'on':''}">5 pcs</button><button data-p="both" class="${both?'on':''}">Both</button>
    <span class="gap"></span><button data-m="rate" class="${metric==='rate'?'on':''}">₹</button><button data-m="pct" class="${metric==='pct'?'on':''}">%</button>
    <span class="gap"></span>${[[7,'7d'],[30,'30d'],[0,'All']].map(([r,l])=>`<button data-r="${r}" class="${range===r?'on':''}">${l}</button>`).join('')}</div>`;
  if(!list.length||!ps.length)return head+`<div class="tnone">No saved rate for ₹${fmt(face)} in this range.</div>`;
  const last=ps[ps.length-1],prev=seriesOf(face,prim).slice(-2)[0]!==last?seriesOf(face,prim).slice(-2)[0]:null;
  const cur=mv(last,prim),cv=prev&&prev!==last?mv(prev,prim):undefined;
  const dd=cv===undefined?null:cur-cv;
  const vs=ps.map(p=>mv(p,prim)),hiP=ps[vs.indexOf(Math.max(...vs))],loP=ps[vs.indexOf(Math.min(...vs))],avg=vs.reduce((a,b)=>a+b,0)/vs.length;
  const offs=prices.filter(o=>o.offer&&val(o,face,prim)!==undefined&&o.ts>=list[0].ts&&o.ts<=list[list.length-1].ts+864e5);
  const ch=chartSvg(list,sers,offs,mv,axis);
  const offRows=offs.slice(-5).reverse().map(o=>{
    const rg=regs().filter(p=>p.date===o.date).pop(),ov2=val(o,face,prim),r0=rg?val(rg,face,prim):undefined;
    return `<div class="thist"><span><b>${esc(dLabel(o))}</b>${o.valid?' · '+esc(o.valid):''}</span><span class="${r0!==undefined&&ov2!==r0?(ov2>r0?'up':'down'):''}"><b>₹${fmt(ov2)}</b>${r0!==undefined&&ov2!==r0?` (${ov2>r0?'+':'-'}${fmt(Math.abs(ov2-r0))} vs regular)`:''}</span></div>`}).join('');
  return head+`<div class="tbig"><b>${show(cur)}</b>${dd===null?'':`<span class="${dd>0?'up':dd<0?'down':''}">${dd===0?'no change':(dd>0?'▲ ':'▼ ')+(metric==='pct'?Math.abs(dd).toFixed(1)+' pts':'₹'+fmt(Math.abs(dd)))}</span>`}
    ${both?'<span class="leg"><i class="s1"></i>1 pc <i class="s2"></i>5 pcs</span>':''}</div>
  <p class="tsub" id="tTip">${esc(dFull(last))}${last.valid?' · valid '+esc(last.valid):''}</p>
  <div class="tchart">${ch.svg}</div>
  <div class="tstats"><div>Highest<b>${show(Math.max(...vs))}</b><u>${dLabel(hiP)}</u></div><div>Average<b>${show(metric==='rate'?Math.round(avg):avg)}</b><u>${ps.length} updates</u></div><div>Lowest<b>${show(Math.min(...vs))}</b><u>${dLabel(loP)}</u></div></div>
  ${offRows?`<div class="th">Limited offers for ₹${fmt(face)} (orange dots)</div>${offRows}`:''}`
  ;
}
function wireChart(){
  const svg=$('#tSvg',ov);if(!svg)return;
  const f=+face,both=pcs==='both',prim=both?'p1':pcs;
  const sers=both?['p1','p5']:[pcs];
  const all=regs().filter(p=>sers.some(k=>val(p,face,k)!==undefined)),list=inRange(all);
  const n=list.length,x=i=>n===1?(44+340-10)/2:44+(340-44-10)*i/(n-1);
  const cur=$('#tCur',ov),tip=$('#tTip',ov),base=tip.innerHTML;
  const sh=(p,k)=>{const v=val(p,face,k);return v===undefined?'–':metric==='pct'?pctTxt(profit(v,f)):'₹'+fmt(v)};
  const move=e=>{
    const r=svg.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*340;
    let bi=0,bd=1e9;for(let i=0;i<n;i++){const d=Math.abs(x(i)-px);if(d<bd){bd=d;bi=i}}
    const p=list[bi];cur.setAttribute('x1',x(bi));cur.setAttribute('x2',x(bi));
    tip.textContent=`${dFull(p)} · ${both?'1 pc '+sh(p,'p1')+' · 5 pcs '+sh(p,'p5'):sh(p,prim)}`;
  };
  svg.addEventListener('pointermove',move);svg.addEventListener('pointerdown',move);
  svg.addEventListener('pointerleave',()=>{cur.setAttribute('x1',-9);cur.setAttribute('x2',-9);tip.innerHTML=base});
}

/* ---------- tab 3: database ---------- */
function dataHtml(){
  const fs=faces(),months=[...new Set(prices.map(p=>p.date.slice(0,7)))].sort().reverse();
  const rows=prices.filter(p=>dbMonth==='all'||p.date.startsWith(dbMonth)).slice().reverse();
  const mlab=m=>MON[+m.slice(5)-1]+' '+m.slice(0,4);
  const ctl=`<div class="tt"><button data-dp="p1" class="${dbp==='p1'?'on':''}">1 pc</button><button data-dp="p5" class="${dbp==='p5'?'on':''}">5 pcs</button><span class="gap"></span>
    <select id="tMonth"><option value="all">All months</option>${months.map(m=>`<option value="${m}" ${m===dbMonth?'selected':''}>${mlab(m)}</option>`).join('')}</select>
    <button id="tCsv">CSV</button></div>`;
  const tbl=rows.length?`<div class="twrap"><table class="tbl db"><thead><tr><th>Date</th>${fs.map(f=>`<th>₹${fmt(f)}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(p=>`<tr class="${p.offer?'off':''}"><th><b>${esc(dLabel(p))}</b><small>${esc(p.session||'')}${p.valid&&p.offer?' '+esc(p.valid):''}</small></th>${fs.map(f=>{const v=val(p,f,dbp);return `<td class="n">${v===undefined?'–':'₹'+fmt(v)}</td>`}).join('')}<td><button class="del" data-del="${esc(p.id)}" aria-label="Delete">×</button></td></tr>`).join('')}</tbody></table></div>
    <p class="tfoot">${rows.length} saved · orange rows are limited offers. Tap × to delete a wrong entry.</p>`:`<div class="tnone">Nothing saved${dbMonth==='all'?' yet':' for this month'}.</div>`;
  return (prices.length?ctl:'')+tbl+addBox();
}
function csv(){
  const fs=faces(),q=v=>v===undefined?'':v;
  const lines=[['Date','Session','Valid','Type',...fs.flatMap(f=>[f+' 1pc',f+' 5pcs'])].join(',')];
  prices.forEach(p=>lines.push([p.date,p.session||'',p.valid||'',p.offer?'offer':'regular',...fs.flatMap(f=>[q(val(p,f,'p1')),q(val(p,f,'p5'))])].map(c=>/[",]/.test(c)?'"'+String(c).replace(/"/g,'""')+'"':c).join(',')));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));a.download='ps-prices.csv';document.body.appendChild(a);a.click();a.remove();
}

/* ---------- tab 4: calendar ---------- */
function calHtml(){
  const dow=(new Date(Date.UTC(calY,calM,1)).getUTCDay()+6)%7,dim=new Date(Date.UTC(calY,calM+1,0)).getUTCDate(),today=todayStr();
  const ds=new Set(regDates()),offD=new Set(prices.filter(p=>p.offer).map(p=>p.date)),fs=faces(),ref=fs.includes('1000')?'1000':fs[0];
  let cells='';
  for(let i=0;i<dow;i++)cells+='<span class="cd empty"></span>';
  for(let d=1;d<=dim;d++){
    const k=`${calY}-${pad(calM+1)}-${pad(d)}`,has=ds.has(k),o=offD.has(k);
    let sub='',cls='';
    if(has&&ref){const v=dayVal(k,ref,'p1'),pv=prevVal(k,ref,'p1');if(v!==undefined){sub=fmt(v);if(pv!==undefined&&v!==pv)cls=v>pv?'up':'down'}}
    cells+=`<button class="cd ${has||o?'has':''} ${cls} ${k===today?'today':''} ${k===selDate?'sel':''}" ${has||o?`data-d="${k}"`:'disabled'}><b>${d}</b><i>${sub}</i>${o?'<u></u>':''}</button>`;
  }
  const inMonth=[...ds].filter(x=>x.startsWith(`${calY}-${pad(calM+1)}`)).length;
  return `<div class="cnav"><button data-cm="-1" aria-label="Previous month">‹</button><b>${MON[calM]} ${calY}</b><button data-cm="1" aria-label="Next month">›</button></div>
  <div class="cgrid"><span class="cdw">Mon</span><span class="cdw">Tue</span><span class="cdw">Wed</span><span class="cdw">Thu</span><span class="cdw">Fri</span><span class="cdw">Sat</span><span class="cdw">Sun</span>${cells}</div>
  <p class="tfoot">${inMonth} day${inMonth===1?'':'s'} with prices this month. Small number = ₹${ref?fmt(ref):''} 1 pc rate, green/red = up/down vs previous day, orange dot = limited offer. Tap a day to open its price chart.</p>`;
}

/* ---------- render ---------- */
function render(){
  $('#tNote',ov).textContent=note||'Buy rates from the WhatsApp price update';
  ov.querySelectorAll('#tTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
  body.innerHTML=tab==='today'?todayHtml():tab==='graph'?graphHtml():tab==='data'?dataHtml():calHtml();
  wire();
  if(tab==='graph')wireChart();
  if(tab==='data')wireAdd();
}
function wire(){
  ov.querySelectorAll('#tTabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;render();body.scrollTop=0;ov.querySelector('.modal').scrollTop=0});
  const on=(sel,fn)=>body.querySelectorAll(sel).forEach(fn);
  on('[data-nav]',b=>b.onclick=()=>{const ds=regDates(),i=ds.indexOf(selDate)+ +b.dataset.nav;if(ds[i]){selDate=ds[i];render()}});
  on('#tFace [data-f]',b=>b.onclick=()=>{face=b.dataset.f;render()});
  on('[data-p]',b=>b.onclick=()=>{pcs=b.dataset.p;render()});
  on('[data-m]',b=>b.onclick=()=>{metric=b.dataset.m;render()});
  on('[data-r]',b=>b.onclick=()=>{range=+b.dataset.r;render()});
  on('[data-dp]',b=>b.onclick=()=>{dbp=b.dataset.dp;render()});
  on('#tMonth',s=>s.onchange=()=>{dbMonth=s.value;render()});
  on('#tCsv',b=>b.onclick=csv);
  on('[data-cm]',b=>b.onclick=()=>{calM+=+b.dataset.cm;if(calM<0){calM=11;calY--}if(calM>11){calM=0;calY++}render()});
  on('[data-d]',b=>b.onclick=()=>{selDate=b.dataset.d;tab='today';render();ov.querySelector('.modal').scrollTop=0});
  on('[data-del]',b=>b.onclick=async()=>{
    const id=b.dataset.del,p=prices.find(x=>x.id===id);
    if(!p||!confirm('Delete the '+dFull(p)+' entry?'))return;
    try{await api('DELETE','/prices/'+encodeURIComponent(id));prices=prices.filter(x=>x.id!==id);writeCache(prices);note='deleted';render()}
    catch(e){alert(e.message==='auth'?'Wrong passcode.':'Could not delete (offline?).')}
  });
}

/* ---------- paste box ---------- */
const addBox=()=>`<div class="tadd"><button class="ghost" id="tToggle">+ Add price update</button>
  <div id="tForm" hidden><textarea id="tText" placeholder="Paste the WhatsApp price message here. You can paste many messages at once, oldest first." spellcheck="false"></textarea>
  <label class="tdate" id="tDateRow" hidden>Date for the offer (its message has no date) <input type="date" id="tDate"></label>
  <div class="tprev" id="tPrev"></div><button class="go" id="tSave" disabled>Save</button></div></div>`;
function wireAdd(){
  const tg=$('#tToggle',ov);if(!tg)return;
  tg.onclick=()=>{const f=$('#tForm',ov);f.hidden=!f.hidden;if(!f.hidden)$('#tText',ov).focus()};
  const ta=$('#tText',ov),pv=$('#tPrev',ov),sv=$('#tSave',ov),dr=$('#tDateRow',ov),di=$('#tDate',ov);let res=null;
  di.value=todayStr();
  const check=()=>{
    res=null;sv.disabled=true;dr.hidden=true;
    if(!ta.value.trim()){pv.textContent='';pv.className='tprev';return}
    const r=parseAll(ta.value,di.value);
    dr.hidden=!r.needDate;
    const recs=r.records,warn=r.warnings.length?' · skipped: '+r.warnings.join('; '):'';
    if(!recs.length){pv.className='tprev bad';pv.textContent='No PlayStation rates found in this text.'+warn;return}
    const reg=recs.filter(x=>!x.offer),off=recs.length-reg.length,amts=new Set();recs.forEach(x=>Object.keys(x.rates).forEach(k=>amts.add(k)));
    const ds=recs.map(x=>x.date).sort(),old=recs.filter(x=>prices.some(p=>p.id===x.id)).length;
    pv.className='tprev ok';
    pv.textContent=`${reg.length} update${reg.length===1?'':'s'}${off?` + ${off} offer${off>1?'s':''}`:''} · ${amts.size} amount${amts.size===1?'':'s'} · ${dLabel({date:ds[0]})}${ds[0]!==ds[ds.length-1]?' to '+dLabel({date:ds[ds.length-1]}):''}${old?` · ${old} will replace saved`:''}${warn}`;
    res=r;sv.disabled=false;
  };
  ta.oninput=check;di.onchange=check;
  sv.onclick=async()=>{
    if(!res||!ensureKey())return;
    const recs=res.records.slice();sv.disabled=true;sv.textContent='Saving…';
    try{
      for(let i=0;i<recs.length;i+=5)await Promise.all(recs.slice(i,i+5).map(r=>api('PUT','/prices',r)));
      const ids=new Set(recs.map(r=>r.id));
      prices=prices.filter(x=>!ids.has(x.id)).concat(recs).sort((a,b)=>a.ts-b.ts);writeCache(prices);note='saved '+recs.length;selDate=null;render();
    }catch(e){sv.textContent='Save';sv.disabled=false;pv.className='tprev bad';pv.textContent=e.message==='auth'?'Wrong passcode. Tap Save again to re-enter it.':'Could not save everything (offline?). Tap Save again - it is safe to repeat.'}
  };
}

/* ---------- open / close ---------- */
async function refresh(){
  if(!ensureKey()){note='passcode needed for live prices';render();return}
  try{const d=await api('GET','/prices');prices=d.prices||[];writeCache(prices);note='';}
  catch(e){note=e.message==='auth'?'wrong passcode - tap the button again':'offline - showing last saved copy'}
  render();
}
function open(){tab='today';selDate=null;render();ov.hidden=false;document.body.style.overflow='hidden';refresh()}
function close(){if(ov.hidden)return;ov.classList.add('closing');setTimeout(()=>{ov.hidden=true;ov.classList.remove('closing');document.body.style.overflow=''},250)}
$('#tClose',ov).onclick=close;
ov.onclick=e=>{if(e.target===ov)close()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ov.hidden)close()});
$('#trendBtn').onclick=open;
window.__trend={parseAll,show:(t,d)=>{tab=t;if(d)selDate=d;render()}};
})();
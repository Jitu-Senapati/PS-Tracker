// Investor book + New entry + Google Calendar-style date picker (dates only).
// Self-contained: injects its own header button and overlays. Data persists in localStorage.
(()=>{
'use strict';
const KEY='pst.book.v1';
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONF=['January','February','March','April','May','June','July','August','September','October','November','December'];
const $=(s,r=document)=>r.querySelector(s);
const pad=n=>String(n).padStart(2,'0');
const fmt=n=>Number(n).toLocaleString('en-IN');
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ic={
  close:svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  l:svg('<path d="M15 5l-7 7 7 7"/>'),r:svg('<path d="M9 5l7 7-7 7"/>'),
  dn:svg('<path d="M6 9l6 6 6-6"/>'),
  cal:svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
  plus:svg('<path d="M12 5v14M5 12h14"/>'),
  edit:svg('<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>'),
  trash:svg('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>'),
  book:svg('<path d="M5 4.5A1.5 1.5 0 016.5 3H19v15H6.5A1.5 1.5 0 005 19.5v-15zM5 19.5A1.5 1.5 0 006.5 21H19v-3"/>'),
  clock:svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')
};

/* ---------- data ---------- */
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.people)&&Array.isArray(s.entries)){s.capital=s.capital||{};fixStatus(s);return s}}catch(e){}return {people:['Chinu','Jitu','Goat'],capital:{},entries:[]}}
let store=load();
/* ---------- shared sync (server keeps the real copy; this device keeps a cache) ---------- */
const KEYSTORE='pst.book.key';
let synced=JSON.stringify(store),pushing=0;
const getKey=()=>{try{return localStorage.getItem(KEYSTORE)||''}catch(e){return ''}};
function ensureKey(){if(getKey())return true;const k=(prompt('Enter the book passcode')||'').trim();if(!k)return false;try{localStorage.setItem(KEYSTORE,k)}catch(e){}return true}
async function api(method,path,body){
  const r=await fetch('/api/book'+path,{method,headers:{'content-type':'application/json','x-book-key':getKey()},body:body?JSON.stringify(body):undefined});
  if(r.status===401){try{localStorage.removeItem(KEYSTORE)}catch(e){}throw new Error('auth')}
  if(!r.ok)throw new Error('http '+r.status);
  return r.json();
}
let baseNote='';
function setNote(t){const p=document.querySelector('#bkT')&&document.querySelector('#bkT').nextElementSibling;if(!p)return;if(!baseNote)baseNote=p.textContent;p.textContent=t?baseNote+' \u00b7 '+t:baseNote}
const saveLocal=()=>{try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}};
const sig=o=>JSON.stringify([o.people.map(p=>[p,Number((o.capital||{})[p])||0]),[...o.entries].sort((a,b)=>a.id<b.id?-1:1)]);
const fixStatus=o=>{let n=0;o.entries.forEach(e=>{if(e.status==='Earned'){e.status='Completed';n++}});return n};
async function pull(){
  if(pushing||G||(typeof hold!=='undefined'&&!hold.hidden)||(typeof entry!=='undefined'&&entry&&!entry.hidden))return;
  try{const d=await api('GET',''),next={people:d.people,capital:d.capital||{},entries:d.entries},raw=JSON.stringify(next),fixed=fixStatus(next);
    if(sig(next)!==sig(store)){store=next;saveLocal();renderBook()}
    synced=fixed?raw:JSON.stringify(store);setNote('shared');
    if(fixed)push()}
  catch(e){setNote(e.message==='auth'?'wrong passcode - reopen the book':'offline - showing last saved copy')}
}
async function push(){
  const prev=JSON.parse(synced),pe=new Map(prev.entries.map(e=>[e.id,JSON.stringify(e)])),ops=[];
  for(const e of store.entries){if(pe.get(e.id)!==JSON.stringify(e))ops.push(['PUT','/entry',e]);pe.delete(e.id)}
  for(const id of pe.keys())ops.push(['DELETE','/entry/'+encodeURIComponent(id)]);
  const roster=o=>JSON.stringify(o.people.map(p=>[p,Number((o.capital||{})[p])||0]));
  if(roster(store)!==roster(prev))ops.unshift(['PUT','/people',{people:store.people.map(p=>({name:p,capital:Number((store.capital||{})[p])||0}))}]);
  if(!ops.length)return;
  pushing++;
  try{for(const [m,p,b] of ops)await api(m,p,b);synced=JSON.stringify(store);setNote('shared')}
  catch(e){setNote(e.message==='auth'?'wrong passcode - not saved':'offline - not saved to shared book')}
  finally{pushing--}
}
const save=()=>{saveLocal();push()};
let active=store.people[0]||'__all__';
let G=null; // press / drag gesture on a card

/* ---------- date helpers ---------- */
const isoOf=(y,m,d,h=0,mi=0)=>`${y}-${pad(m+1)}-${pad(d)}T${pad(h)}:${pad(mi)}`;
const nowIso=()=>{const d=new Date();return isoOf(d.getFullYear(),d.getMonth(),d.getDate())};
const dShort=iso=>{const d=new Date(iso);return `${d.getDate()} ${MON[d.getMonth()]}`+(d.getFullYear()!==new Date().getFullYear()?` ${d.getFullYear()}`:'')};
const dFull=iso=>{const d=new Date(iso);return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`};
function relDay(iso){if(!iso)return '';const d=new Date(iso),n=new Date(),k=Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(n.getFullYear(),n.getMonth(),n.getDate()))/864e5);
  const t=k===0?'Today':k===1?'Tomorrow':k===-1?'Yesterday':k>1?'in '+k+' days':-k+' days ago';
  return `<i class="bk-rel ${k===0?'now':k>0?'fut':'past'}">${t}</i>`}

/* ---------- overlay manager ---------- */
const stack=[];
function mount(html,cls=''){
  const o=document.createElement('div');o.className='overlay bk '+cls;o.hidden=true;o.innerHTML=html;document.body.append(o);
  let down=false;
  o.addEventListener('pointerdown',e=>{down=e.target===o});
  o.addEventListener('click',e=>{if(e.target===o&&down)close(o);down=false});
  o.addEventListener('click',e=>{if(e.target.closest('[data-x]'))close(o)});
  return o;
}
function open(o){o.hidden=false;stack.push(o);document.body.style.overflow='hidden'}
function close(o){
  if(o.hidden||o.classList.contains('closing'))return;
  o.classList.add('closing');
  setTimeout(()=>{o.hidden=true;o.classList.remove('closing');const i=stack.indexOf(o);if(i>-1)stack.splice(i,1);if(!stack.length)document.body.style.overflow=''},250);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stack.length){close(stack[stack.length-1]);e.stopImmediatePropagation()}},true);

/* ---------- Investor book ---------- */
const book=mount(`<section class="modal bk-modal" role="dialog" aria-modal="true" aria-labelledby="bkT">
  <div class="mhead bk-pad"><div><h2 id="bkT">Investor book</h2><p>Who invested, when, and what they earned</p></div>
    <button class="btn icon sm" data-ripple data-x aria-label="Close">${ic.close}</button></div>
  <div class="bk-tabs" role="tablist"></div>
  <div class="bk-sum"></div>
  <div class="bk-list"></div>
  <div class="bk-foot"><div class="bk-bal"></div><button class="btn bk-primary" data-ripple data-a="add">+ Add new entry</button></div>
</section>`);

const money=n=>(n<0?'−':n>0?'+':'')+'₹'+fmt(Math.abs(n));
const ALL='__all__';
const dk=e=>e.purAt||e.buyAt||'';
const cmp=(a,b)=>{const x=a.o!=null,y=b.o!=null;if(x&&y)return a.o-b.o||(a.id<b.id?-1:1);if(x!==y)return x?1:-1;return dk(b).localeCompare(dk(a))||(a.id<b.id?-1:1)};
const profitOf=e=>e.sell!=null?e.sell-e.buy:null;
const DEN=['1k','2k','3k','4k','5k'];
let lastKey='';
function countUp(){
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  book.querySelectorAll('.bk-stat b[data-v]').forEach(b=>{
    const v=+b.dataset.v,kind=b.dataset.k,f=n=>kind==='pl'?money(n):'₹'+fmt(n);
    if(reduce||!v){b.textContent=f(v);return}
    const t0=performance.now();
    (function step(t){const p=Math.min(1,(t-t0)/750);b.textContent=f(Math.round(v*(1-Math.pow(1-p,3))));if(p<1&&b.isConnected)requestAnimationFrame(step)})(t0);
  });
}
function renderBook(){
  if(active!==ALL&&!store.people.includes(active))active=store.people[0]||ALL;
  const all=active===ALL;
  $('.bk-tabs',book).innerHTML=store.people.map(p=>`<button class="bk-tab ${p===active?'on':''}" role="tab" aria-selected="${p===active}" data-p="${esc(p)}">${esc(p)}</button>`).join('')+
    `<button class="bk-tab ${all?'on':''}" role="tab" aria-selected="${all}" data-p="${ALL}">All</button>`+
    `<button class="bk-tab bk-plus" data-a="newuser" aria-label="Add user" title="Add user">${ic.plus}</button>`;
  const es=store.entries.filter(e=>all||e.who===active).sort(cmp);
  const closed=es.filter(e=>e.sell!=null);
  const invested=es.reduce((s,e)=>s+(e.status!=='Completed'?e.buy:0),0),returned=closed.reduce((s,e)=>s+e.sell,0),net=closed.reduce((s,e)=>s+profitOf(e),0);
  const cap=all?store.people.reduce((n,p)=>n+(Number((store.capital||{})[p])||0),0):Number((store.capital||{})[active])||0,avail=cap-invested,
    pout=es.filter(e=>e.status==='Completed'&&e.sell!=null).reduce((n,e)=>n+profitOf(e),0);
  $('.bk-bal',book).innerHTML=`<div><small>Capital</small><b>${cap>0?'₹'+fmt(cap):'—'}</b></div>
    <div title="Profit of completed entries"><small>Profit out</small><b class="${pout>0?'up':pout<0?'down':''}">${money(pout)}</b></div>
    <div title="Capital − invested (purchased + sold)"><small>Available</small><b class="${cap>0&&avail<0?'down':''}">${cap>0?(avail<0?'−':'')+'₹'+fmt(Math.abs(avail)):'—'}</b></div>`;
  const key=active+'|'+invested+'|'+returned+'|'+net+'|'+es.length;
  const fresh=key!==lastKey;lastKey=key;
  $('.bk-sum',book).innerHTML=`<div class=\"bk-stat\"><small>Invested</small><b data-v=\"${invested}\" data-k=\"rs\">₹${fmt(invested)}</b></div>
    <div class=\"bk-stat\"><small>Returned</small><b data-v=\"${returned}\" data-k=\"rs\">₹${fmt(returned)}</b></div>
    <div class=\"bk-stat\"><small>Net profit</small><b class=\"${net>0?'up':net<0?'down':''}\" ${closed.length?`data-v=\"${net}\" data-k=\"pl\"`:''}>${closed.length?money(net):'—'}</b></div>`;
  if(fresh)countUp();
  $('.bk-list',book).innerHTML=es.length?es.map((e,i)=>{
    const d=profitOf(e),tax=e.tax||0,codes=(e.d||[]).map((n,j)=>n>0?`${n}×${DEN[j]}`:'').filter(Boolean);
    const extra=[e.plat?esc(e.plat):'',tax>0?`Tax ₹${fmt(tax)}`:'',codes.length?codes.join(' · '):''].filter(Boolean).join(' · ');
    return `<article class="bk-row${fresh?'':' still'}" data-id="${e.id}" style="animation-delay:${i*45}ms">
      <div class="bk-price">${all?`<span class="bk-who">${esc(e.who)}</span>`:''}${fmt(e.buy)} <span>→</span> ${e.sell!=null?fmt(e.sell):'—'}${extra?`<span class="bk-extra">${extra}</span>`:''}</div>
      <div class="bk-pl ${d>0?'up':d<0?'down':''}">${d==null?'—':money(d)}<i>${d==null?'Holding':d>0?'Profit':d<0?'Loss':'Break-even'}</i></div>
      <div class="bk-date">${e.purAt&&!e.buyAt?`<div class="bk-pur">Purchased ${dShort(e.purAt)}${relDay(e.purAt)}</div>`:''}${e.buyAt||e.sellAt?`${e.buyAt?dShort(e.buyAt)+relDay(e.buyAt):'—'} <span>→</span> ${e.sellAt?dShort(e.sellAt)+relDay(e.sellAt):'—'}`:''}</div>
      <div class="bk-st"><span class="pill s-${e.status.toLowerCase()}">${e.status}</span></div></article>`}).join('')
   :`<div class=\"bk-empty\"><b>No entries${all?'':' for '+esc(active)} yet</b><span>Tap “Add new entry” to record one.</span></div>`;
}
book.addEventListener('click',e=>{
  const t=e.target.closest('[data-p]');if(t){active=t.dataset.p;renderBook();return}
  if(e.target.closest('[data-a="newuser"]')){openUser();return}
  if(e.target.closest('[data-a="add"]'))openEntry();
});

/* ---------- press & hold a card: Edit / Delete over a blurred page; keep holding and drag to reorder ---------- */
const hold=mount(`<div class="bk-hc"></div><div class="bk-ha"><button type="button" class="bk-hb" data-h="edit">${ic.edit}<span>Edit</span></button><button type="button" class="bk-hb del" data-h="del">${ic.trash}<span>Delete</span></button></div>`,'bk-hold');
const holdBox=$('.bk-hc',hold),holdAct=$('.bk-ha',hold),list=$('.bk-list',book),tabsEl=$('.bk-tabs',book);
let heldId=null,heldKind='row',suppress=0;
/* confirmation window shown before anything is deleted */
const cfm=mount(`<section class="modal bk-cfm" role="alertdialog" aria-modal="true" aria-labelledby="cfT">
  <div class="bk-cfi">${ic.trash}</div>
  <h2 id="cfT">Delete?</h2><p class="bk-cft"></p>
  <div class="bk-two bk-act"><button class="btn bk-ghost" data-ripple data-x>Cancel</button><button class="btn bk-danger" data-ripple data-a="cfdel">Delete</button></div>
</section>`,'bk-cf');
let cfAction=null;
function askDelete(title,text,fn){$('#cfT',cfm).textContent=title;$('.bk-cft',cfm).textContent=text;cfAction=fn;open(cfm)}
cfm.addEventListener('click',e=>{if(e.target.closest('[data-a="cfdel"]')){const fn=cfAction;cfAction=null;close(cfm);if(fn)fn()}});
function closeNow(o){if(o.hidden)return;o.classList.remove('closing');o.hidden=true;const i=stack.indexOf(o);if(i>-1)stack.splice(i,1);if(!stack.length)document.body.style.overflow=''}
function showHold(el,kind){
  const r=el.getBoundingClientRect(),c=el.cloneNode(true),bh=52,user=kind==='tab';
  heldKind=kind;heldId=user?el.dataset.p:el.dataset.id;
  c.classList.remove('still','on','shift','drag');c.classList.add('bk-lift');c.removeAttribute('style');
  Object.assign(c.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px'});
  holdBox.replaceChildren(c);
  const w=user?Math.max(r.width,240):r.width,left=user?Math.min(Math.max(12,r.left),innerWidth-12-w):r.left;
  const below=r.bottom+10+bh<=innerHeight-12;
  Object.assign(holdAct.style,{left:left+'px',width:w+'px',top:(below?r.bottom+10:Math.max(12,r.top-10-bh))+'px'});
  open(hold);
}
hold.addEventListener('click',e=>{
  const b=e.target.closest('[data-h]');if(!b)return;
  const user=heldKind==='tab',ent=user?null:store.entries.find(x=>x.id===heldId);
  if(!user&&!ent){close(hold);return}
  if(b.dataset.h==='edit'){close(hold);user?openUser(heldId):openEntry(ent);return}
  const done=()=>{save();renderBook();close(hold)};
  if(user){
    const n=heldId,k=store.entries.filter(x=>x.who===n).length;
    askDelete(`Delete ${n}?`,(k?`This also removes their ${k} ${k===1?'entry':'entries'}. `:'')+'This can’t be undone.',()=>{
      store.entries=store.entries.filter(x=>x.who!==n);store.people=store.people.filter(p=>p!==n);
      if(store.capital)delete store.capital[n];
      if(active===n)active=store.people[0]||ALL;
      done();
    });
  }else{
    const id=heldId;
    askDelete('Delete this entry?',`${ent.who}: ₹${fmt(ent.buy)}${ent.sell!=null?' → ₹'+fmt(ent.sell):''}${ent.plat?' · '+ent.plat:''}. This can’t be undone.`,()=>{
      store.entries=store.entries.filter(x=>x.id!==id);done();
    });
  }
});

function applyOrder(ids){
  const all=[...store.entries].sort(cmp),vis=new Set(ids),slots=[],byId=new Map(all.map(e=>[e.id,e]));
  all.forEach((e,i)=>{if(vis.has(e.id))slots.push(i)});
  ids.forEach((id,k)=>{all[slots[k]]=byId.get(id)});
  all.forEach((e,i)=>{if(e.o!==i)e.o=i});
  save();renderBook();
}
function applyPeople(names){store.people=names;save();renderBook()}
function gClean(){
  if(!G)return;clearTimeout(G.timer);cancelAnimationFrame(G.raf);
  removeEventListener('pointermove',gMove);removeEventListener('pointerup',gEnd);removeEventListener('pointercancel',gEnd);G=null;
}
const gScroll=()=>G.kind==='tab'?G.box.scrollLeft:G.box.scrollTop;
function startDrag(){
  closeNow(hold);
  const tab=G.kind==='tab',box=tab?tabsEl:list,items=[...box.querySelectorAll(tab?`.bk-tab[data-p]:not([data-p="${ALL}"])`:'.bk-row')];
  G.box=box;G.items=items;G.i=items.indexOf(G.el);G.t=G.i;G.s0=gScroll();
  G.pos=items.map(r=>tab?{t:r.offsetLeft,h:r.offsetWidth}:{t:r.offsetTop,h:r.offsetHeight});
  G.gap=tab?(parseFloat(getComputedStyle(box).columnGap)||0):(parseFloat(getComputedStyle(G.el).marginBottom)||0);
  G.state='drag';G.el.classList.add('drag');items.forEach(r=>{if(r!==G.el)r.classList.add('shift')});
  box.classList.add('dragging');loop();dragTo();
}
function dragTo(){
  const tab=G.kind==='tab',{items,i,pos}=G,d=(tab?G.cx-G.x:G.cy-G.y)+(gScroll()-G.s0),h=pos[i].h+G.gap,c=pos[i].t+pos[i].h/2+d;
  G.el.style.transform=tab?`translateX(${d}px) scale(1.05)`:`translateY(${d}px) scale(1.02)`;
  let t=0;pos.forEach((p,j)=>{if(j!==i&&p.t+p.h/2<c)t++});
  G.t=t;
  items.forEach((r,j)=>{if(j===i)return;const m=(i<j&&j<=t)?-h:(t<=j&&j<i)?h:0;r.style.transform=m?(tab?`translateX(${m}px)`:`translateY(${m}px)`):''});
}
function loop(){
  if(!G||G.state!=='drag')return;
  const tab=G.kind==='tab',r=G.box.getBoundingClientRect(),z=56,p=tab?G.cx:G.cy,lo=tab?r.left:r.top,hi=tab?r.right:r.bottom;let v=0;
  if(p<lo+z)v=-Math.min(14,(lo+z-p)/4);else if(p>hi-z)v=Math.min(14,(p-(hi-z))/4);
  if(v){if(tab)G.box.scrollLeft+=v;else G.box.scrollTop+=v;dragTo()}
  G.raf=requestAnimationFrame(loop);
}
function gMove(e){
  if(!G)return;G.cx=e.clientX;G.cy=e.clientY;
  const dist=Math.hypot(e.clientX-G.x,e.clientY-G.y);
  if(G.state==='wait'){if(dist>10)gClean();return}
  if(G.state==='held'){if(dist>14)startDrag();return}
  dragTo();
}
function gEnd(){
  if(!G)return;
  if(G.state==='drag'){
    const {items,i,t,box,kind}=G;
    items.forEach(r=>{r.style.transform='';r.classList.remove('drag','shift')});box.classList.remove('dragging');
    const ids=items.map(r=>kind==='tab'?r.dataset.p:r.dataset.id);
    gClean();
    if(t!==i){const [m]=ids.splice(i,1);ids.splice(t,0,m);kind==='tab'?applyPeople(ids):applyOrder(ids)}
    return;
  }
  gClean();
}
function gDown(e,el,kind){
  if(e.button>0||G)return;
  G={el,kind,x:e.clientX,y:e.clientY,cx:e.clientX,cy:e.clientY,state:'wait'};
  G.timer=setTimeout(()=>{if(!G||G.state!=='wait')return;G.state='held';suppress=Date.now()+700;if(navigator.vibrate)navigator.vibrate(12);showHold(el,kind)},420);
  addEventListener('pointermove',gMove);addEventListener('pointerup',gEnd);addEventListener('pointercancel',gEnd);
}
list.addEventListener('pointerdown',e=>{const el=e.target.closest('.bk-row');if(el)gDown(e,el,'row')});
tabsEl.addEventListener('pointerdown',e=>{const el=e.target.closest('.bk-tab[data-p]');if(el&&el.dataset.p!==ALL)gDown(e,el,'tab')});
const noScroll=e=>{if(G&&G.state!=='wait'&&e.cancelable)e.preventDefault()};
list.addEventListener('touchmove',noScroll,{passive:false});
tabsEl.addEventListener('touchmove',noScroll,{passive:false});
list.addEventListener('contextmenu',e=>{if(e.target.closest('.bk-row'))e.preventDefault()});
tabsEl.addEventListener('contextmenu',e=>{if(e.target.closest('.bk-tab[data-p]'))e.preventDefault()});
book.addEventListener('click',e=>{if(Date.now()<suppress){e.stopPropagation();e.preventDefault()}},true);

/* ---------- New / edit user ---------- */
const userM=mount(`<section class="modal bk-form" role="dialog" aria-modal="true" aria-labelledby="usT">
  <div class="mhead"><div><h2 id="usT">New user</h2><p>Add an investor to the book</p></div>
    <button class="btn icon sm" data-ripple data-x aria-label="Close">${ic.close}</button></div>
  <div class="bk-f">
    <label class="bk-lb" for="usName">Name</label>
    <input class="bk-in" id="usName" maxlength="40" placeholder="Investor name" autocomplete="off">
    <label class="bk-lb" for="usCap">Total capital</label>
    <label class="bk-money"><b>₹</b><input class="bk-in" id="usCap" inputmode="decimal" placeholder="Total capital (optional)"></label>
    <p class="bk-err" role="alert" hidden></p>
  </div>
  <div class="bk-two bk-act"><button class="btn bk-ghost" data-ripple data-x>Cancel</button><button class="btn bk-primary" data-ripple data-a="saveuser">Add</button></div>
</section>`);
let editUser=null;
function openUser(name){
  editUser=name||null;
  $('#usT',userM).textContent=name?'Edit user':'New user';
  $('.mhead p',userM).textContent=name?'Change the name or total capital':'Add an investor to the book';
  $('[data-a="saveuser"]',userM).textContent=name?'Save':'Add';
  $('#usName',userM).value=name||'';
  const c=name?Number((store.capital||{})[name])||0:0;
  $('#usCap',userM).value=c?c:'';
  $('.bk-err',userM).hidden=true;
  open(userM);
  setTimeout(()=>{if(!userM.hidden)$('#usName',userM).focus()},80);
}
function saveUser(){
  const err=m=>{const el=$('.bk-err',userM);el.textContent=m;el.hidden=false};
  const name=$('#usName',userM).value.trim(),raw=$('#usCap',userM).value.trim().replace(/,/g,''),cap=raw===''?0:Number(raw);
  if(!name)return err('Enter the investor’s name.');
  if(name.toLowerCase()==='all')return err('“All” is the combined tab, pick another name.');
  if(store.people.some(p=>p!==editUser&&p.toLowerCase()===name.toLowerCase()))return err('That investor already exists.');
  if(!Number.isFinite(cap)||cap<0)return err('Enter a valid capital amount.');
  store.capital=store.capital||{};
  if(editUser&&name!==editUser){
    store.people=store.people.map(p=>p===editUser?name:p);
    store.entries.forEach(e=>{if(e.who===editUser)e.who=name});
    delete store.capital[editUser];
    if(active===editUser)active=name;
  }else if(!editUser){store.people.push(name);active=name}
  store.capital[name]=cap;
  save();renderBook();close(userM);
}
userM.addEventListener('click',e=>{if(e.target.closest('[data-a="saveuser"]'))saveUser()});
userM.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();saveUser()}});

/* ---------- New entry ---------- */
const entry=mount(`<section class="modal bk-form" role="dialog" aria-modal="true" aria-labelledby="enT">
  <div class="mhead"><div><h2 id="enT">New entry</h2><p>Record an investor’s purchase and sale</p></div>
    <button class="btn icon sm" data-ripple data-x aria-label="Close">${ic.close}</button></div>
  <div class="bk-f">
    <label class="bk-lb" for="enWho">Investor</label>
    <input class="bk-in" id="enWho" list="enPeople" placeholder="New or existing investor" autocomplete="off"><datalist id="enPeople"></datalist>
    <span class="bk-lb">Date</span>
    <button type="button" class="bk-in bk-pick" data-pick="purAt"></button>
    <div class="bk-two">
      <button type="button" class="bk-in bk-pick" data-pick="buyAt"></button>
      <button type="button" class="bk-in bk-pick" data-pick="sellAt"></button></div>
    <span class="bk-lb">Amount</span>
    <div class="bk-two">
      <label class="bk-money"><b>₹</b><input class="bk-in" id="enBuy" inputmode="decimal" placeholder=" "><span class="bk-hint">Invested <small>(inc tax)</small></span></label>
      <label class="bk-money"><b>₹</b><input class="bk-in" id="enSell" inputmode="decimal" placeholder="Returning"></label></div>
    <div class="bk-two">
      <label class="bk-money"><b>₹</b><input class="bk-in" id="enTax" inputmode="decimal" placeholder="Taxes (optional)"></label>
      <div class="bk-dd"><button type="button" class="bk-in bk-pick bk-ddb" id="enPlat" aria-haspopup="listbox" aria-expanded="false"></button>
        <div class="bk-ddm" role="listbox" hidden></div></div></div>
    <span class="bk-lb">Codes sent</span>
    <div class="bk-codes">${DEN.map((n,i)=>`<label><small>${n}</small><input class="bk-in" id="enD${i}" inputmode="numeric" placeholder="0"></label>`).join('')}</div>
    <span class="bk-lb">Status</span>
    <div class="bk-seg" role="radiogroup">${['Purchased','Sold','Completed'].map(s=>`<button type="button" role="radio" data-s="${s}" data-ripple>${s}</button>`).join('')}</div>
    <p class="bk-err" role="alert" hidden></p>
  </div>
  <div class="bk-two bk-act"><button class="btn bk-ghost" data-ripple data-x>Cancel</button><button class="btn bk-primary" data-ripple data-a="save">Add</button></div>
</section>`);
const platIcon=n=>{
  const p=(typeof PLATFORMS!=='undefined'&&PLATFORMS.find(x=>x.name===n))||{name:n};
  try{if(typeof logoOf==='function')return `<span class="logo bk-lg">${logoOf(p)}</span>`}catch(e){}
  return `<span class="logo bk-lg"><span class="badge" style="background:#2b3a33">${esc((n.trim()[0]||'?').toUpperCase())}</span></span>`;
};
let f;
const closedStatus=()=>f.status!=='Purchased';
function syncForm(){
  $('#enPlat',entry).innerHTML=(f.plat?`${platIcon(f.plat)}<span class="bk-ddn">${esc(f.plat)}</span>`:'<span class="bk-ddn ph">Platform</span>')+ic.dn;
  entry.querySelectorAll('.bk-ddm [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===(f.plat||'')));
  $('[data-pick="purAt"]',entry).innerHTML=`${ic.cal}<span class="${f.purAt?'':'ph'}">${f.purAt?dFull(f.purAt):'Purchased date'}</span>`;
  $('[data-pick="buyAt"]',entry).innerHTML=`${ic.cal}<span class="${f.buyAt?'':'ph'}">${f.buyAt?dFull(f.buyAt):'Send date (optional)'}</span>`;
  $('[data-pick="sellAt"]',entry).innerHTML=`${ic.cal}<span class="${f.sellAt?'':'ph'}">${f.sellAt?dFull(f.sellAt):(closedStatus()?'Received date':'Received date (optional)')}</span>`;
  $('#enSell',entry).disabled=!closedStatus();$('#enSell',entry).closest('.bk-money').classList.toggle('off',!closedStatus());
  entry.querySelectorAll('[data-s]').forEach(b=>{const on=b.dataset.s===f.status;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
}
let editing=null;
function openEntry(ent){
  editing=ent||null;
  f=ent?{plat:ent.plat||'',who:ent.who,purAt:ent.purAt||'',buyAt:ent.buyAt||'',sellAt:ent.sellAt||'',status:ent.status}:{plat:'',who:active===ALL?'':active,purAt:'',buyAt:'',sellAt:'',status:'Purchased'};
  $('#enT',entry).textContent=ent?'Edit entry':'New entry';
  $('[data-a="save"]',entry).textContent=ent?'Save':'Add';
  $('#enWho',entry).value=f.who;$('#enBuy',entry).value=ent?ent.buy:'';$('#enSell',entry).value=ent&&ent.sell!=null?ent.sell:'';
  $('#enTax',entry).value=ent&&ent.tax?ent.tax:'';
  DEN.forEach((n,i)=>{$('#enD'+i,entry).value=ent&&ent.d&&ent.d[i]?ent.d[i]:''});
  $('#enPeople',entry).innerHTML=store.people.map(p=>`<option value="${esc(p)}">`).join('');
  const names=typeof PLATFORMS!=='undefined'?PLATFORMS.map(p=>p.name):[];
  if(ent&&ent.plat&&!names.includes(ent.plat))names.push(ent.plat);
  const menu=$('.bk-ddm',entry);
  menu.innerHTML=`<button type="button" role="option" data-v=""><span class="bk-lg bk-no">${ic.close}</span><span>No platform</span></button>`+names.map(n=>`<button type="button" role="option" data-v="${esc(n)}">${platIcon(n)}<span>${esc(n)}</span></button>`).join('');
  menu.hidden=true;$('#enPlat',entry).setAttribute('aria-expanded','false');
  $('.bk-err',entry).hidden=true;syncForm();open(entry);
}
entry.addEventListener('click',e=>{
  const menu=$('.bk-ddm',entry),btn=e.target.closest('#enPlat'),opt=e.target.closest('.bk-ddm [data-v]');
  if(btn){const o=menu.hidden;menu.hidden=!o;btn.setAttribute('aria-expanded',String(o));if(o&&menu.scrollIntoView)menu.scrollIntoView({block:'nearest'});return}
  if(opt){f.plat=opt.dataset.v;menu.hidden=true;$('#enPlat',entry).setAttribute('aria-expanded','false');syncForm();return}
  if(!menu.hidden&&!e.target.closest('.bk-dd')){menu.hidden=true;$('#enPlat',entry).setAttribute('aria-expanded','false')}
});
entry.addEventListener('click',e=>{
  const p=e.target.closest('[data-pick]');
  if(p&&!p.disabled){const k=p.dataset.pick;openCal(f[k]||nowIso(),k!=='purAt',v=>{f[k]=v;if(k==='sellAt'&&v&&f.status==='Purchased')f.status='Sold';syncForm()});return}
  const s=e.target.closest('[data-s]');
  if(s){f.status=s.dataset.s;syncForm();return}
  if(e.target.closest('[data-a="save"]'))saveEntry();
});
function saveEntry(){
  const err=m=>{const el=$('.bk-err',entry);el.textContent=m;el.hidden=false};
  let who=$('#enWho',entry).value.trim();
  const buy=parseFloat($('#enBuy',entry).value),sell=parseFloat($('#enSell',entry).value);
  if(!who)return err('Enter the investor’s name.');
  if(!(buy>0))return err('Enter the invested amount.');
  if(!f.purAt)return err('Pick the purchased date.');
  if(closedStatus()){
    if(!f.sellAt)return err('Pick the received date.');
    if(!(sell>=0))return err('Enter the returning amount.');
  }
  const d10=v=>String(v).slice(0,10);
  if(f.buyAt&&d10(f.buyAt)<d10(f.purAt))return err('Codes can’t be sent before they were purchased.');
  if(closedStatus()){
    if(d10(f.sellAt)<d10(f.purAt))return err('Received date can’t be before the purchased date.');
    if(f.buyAt&&d10(f.sellAt)<d10(f.buyAt))return err('Received date can’t be before the date codes were sent.');
  }
  const tax=parseFloat($('#enTax',entry).value)||0;
  if(tax<0)return err('Taxes can’t be negative.');
  const d=DEN.map((n,i)=>Math.max(0,parseInt($('#enD'+i,entry).value,10)||0));
  const known=store.people.find(p=>p.toLowerCase()===who.toLowerCase());
  if(known)who=known;else store.people.push(who);
  const o={who,plat:f.plat||null,purAt:f.purAt,buyAt:f.buyAt||null,sellAt:closedStatus()?f.sellAt:null,buy,sell:closedStatus()?sell:null,tax,d,status:f.status};
  editing?Object.assign(editing,o):store.entries.push({id:uid(),...o});
  save();if(active!==ALL)active=who;renderBook();close(entry);
}

/* ---------- Calendar picker (Google Calendar style) ---------- */
const cal=mount(`<section class="modal bk-calm" role="dialog" aria-modal="true" aria-label="Pick date and time"></section>`,'bk-cal');
const calEl=$('.bk-calm',cal);
let C;
function openCal(iso,clearable,cb){
  const d=new Date(iso);
  C={y:d.getFullYear(),m:d.getMonth(),mode:'days',sel:{y:d.getFullYear(),m:d.getMonth(),d:d.getDate()},clearable,cb};
  drawCal();open(cal);
}
const same=(a,y,m,d)=>a&&a.y===y&&a.m===m&&a.d===d;
function drawCal(){
  const t=new Date();let body;
  if(C.mode==='days'){
    const off=new Date(C.y,C.m,1).getDay();
    body=`<div class="bk-wd">${[...'SMTWTFS'].map(x=>`<span>${x}</span>`).join('')}</div><div class="bk-days">`+
      Array.from({length:42},(_,i)=>{const d=new Date(C.y,C.m,1-off+i),y=d.getFullYear(),m=d.getMonth(),n=d.getDate();
        return `<button class="bk-day ${m!==C.m?'out':''} ${same({y:t.getFullYear(),m:t.getMonth(),d:t.getDate()},y,m,n)?'today':''} ${same(C.sel,y,m,n)?'sel':''}" data-c="day" data-y="${y}" data-m="${m}" data-d="${n}">${n}</button>`}).join('')+`</div>`;
  }else body=`<div class="bk-mons">`+MON.map((n,i)=>`<button class="bk-mon ${C.sel&&C.sel.y===C.y&&C.sel.m===i?'sel':''} ${t.getFullYear()===C.y&&t.getMonth()===i?'today':''}" data-c="mon" data-m="${i}">${n}</button>`).join('')+`</div>`;
  if(C.mode==='years')body=`<div class="bk-mons bk-yrs">`+Array.from({length:201},(_,i)=>1900+i).map(y=>`<button class="bk-mon ${y===C.y?'sel':''} ${y===t.getFullYear()?'today':''}" data-c="yr" data-y="${y}">${y}</button>`).join('')+`</div>`;
  calEl.innerHTML=`<div class="bk-ch"><div class="bk-cts">${C.mode==='days'?`<button class="bk-ct" data-c="mode">${MONF[C.m]} ${ic.dn}</button>`:''}${C.mode==='years'?`<span class="bk-ct">Select year</span>`:`<button class="bk-ct" data-c="years">${C.y} ${ic.dn}</button>`}</div>
    ${C.mode==='years'?'':`<div class="bk-nav"><button class="btn icon sm" data-ripple data-c="prev" aria-label="Previous">${ic.l}</button><button class="btn icon sm" data-ripple data-c="next" aria-label="Next">${ic.r}</button></div>`}</div>
    ${body}
    <div class="bk-ca"><span>${C.clearable?'<button class="bk-link" data-c="clear">Clear</button>':''}<button class="bk-link" data-c="today">Today</button></span>
      <span><button class="bk-link" data-x>Cancel</button><button class="bk-link strong" data-c="ok" ${C.sel?'':'disabled'}>OK</button></span></div>`;
  const ys=calEl.querySelector('.bk-yrs'),sy=ys&&ys.querySelector('.sel');if(sy)ys.scrollTop=sy.offsetTop-ys.clientHeight/2+sy.offsetHeight/2;
}
cal.addEventListener('click',e=>{
  const b=e.target.closest('[data-c]');if(!b)return;const a=b.dataset.c;
  if(a==='day'){C.sel={y:+b.dataset.y,m:+b.dataset.m,d:+b.dataset.d};C.y=C.sel.y;C.m=C.sel.m}
  else if(a==='mon'){C.m=+b.dataset.m;C.mode='days'}
  else if(a==='years'){C.mode='years';C.y0=C.y-4}
  else if(a==='yr'){C.y=+b.dataset.y;C.mode='days'}
  else if(a==='mode')C.mode=C.mode==='days'?'months':'days';
  else if(a==='prev'||a==='next'){const s=a==='next'?1:-1;
    if(C.mode==='years')C.y0+=12*s;else if(C.mode==='months')C.y+=s;else{C.m+=s;if(C.m<0){C.m=11;C.y--}if(C.m>11){C.m=0;C.y++}}}
  else if(a==='today'){const t=new Date();C.y=t.getFullYear();C.m=t.getMonth();C.sel={y:C.y,m:C.m,d:t.getDate()};C.mode='days'}
  else if(a==='clear'){C.cb('');close(cal);return}
  else if(a==='ok'){if(!C.sel)return;C.cb(isoOf(C.sel.y,C.sel.m,C.sel.d));close(cal);return}
  drawCal();
});

/* ---------- header button ---------- */
const btn=document.createElement('button');
btn.id='bookBtn';btn.className='btn icon';btn.setAttribute('data-ripple','');btn.setAttribute('aria-label','Investor book');btn.title='Investor book';btn.innerHTML=ic.book;
const trend=document.getElementById('trendBtn');
trend?trend.after(btn):document.querySelector('.actions')?.prepend(btn);
btn.addEventListener('click',()=>{lastKey='';renderBook();open(book);if(ensureKey())pull()});
setInterval(()=>{if(!book.hidden&&getKey())pull()},8000);
})();
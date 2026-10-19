// Investor book + New entry + Google Calendar-style date/time picker.
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
  edit:svg('<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>'),
  trash:svg('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>'),
  book:svg('<path d="M5 4.5A1.5 1.5 0 016.5 3H19v15H6.5A1.5 1.5 0 005 19.5v-15zM5 19.5A1.5 1.5 0 006.5 21H19v-3"/>'),
  clock:svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')
};

/* ---------- data ---------- */
const seed=()=>({people:['Chinu','Jitu','Goat'],entries:[
  {id:uid(),who:'Chinu',buyAt:'2026-10-17T10:00',sellAt:'2026-10-24T10:00',buy:1220,sell:1270,status:'Sold'}]});
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.people)&&Array.isArray(s.entries))return s}catch(e){}return seed()}
let store=load();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}};
let active=store.people[0];

/* ---------- date helpers ---------- */
const isoOf=(y,m,d,h=0,mi=0)=>`${y}-${pad(m+1)}-${pad(d)}T${pad(h)}:${pad(mi)}`;
const nowIso=()=>{const d=new Date();return isoOf(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes())};
const dShort=iso=>{const d=new Date(iso);return `${d.getDate()} ${MON[d.getMonth()]}`+(d.getFullYear()!==new Date().getFullYear()?` ${d.getFullYear()}`:'')};
const dFull=iso=>{const d=new Date(iso),h=d.getHours();return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${h%12||12}:${pad(d.getMinutes())} ${h<12?'AM':'PM'}`};

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
  <div class="bk-foot"><button class="btn bk-primary" data-ripple data-a="add">+ Add new entry</button></div>
</section>`);

const money=n=>(n<0?'−':n>0?'+':'')+'₹'+fmt(Math.abs(n));
function renderBook(){
  if(!store.people.includes(active))active=store.people[0];
  $('.bk-tabs',book).innerHTML=store.people.map(p=>`<button class="bk-tab ${p===active?'on':''}" role="tab" aria-selected="${p===active}" data-p="${esc(p)}">${esc(p)}</button>`).join('');
  const es=store.entries.filter(e=>e.who===active).sort((a,b)=>b.buyAt.localeCompare(a.buyAt));
  const closed=es.filter(e=>e.sell!=null);
  const invested=es.reduce((s,e)=>s+e.buy,0),returned=closed.reduce((s,e)=>s+e.sell,0),net=closed.reduce((s,e)=>s+e.sell-e.buy,0);
  $('.bk-sum',book).innerHTML=`<div class="bk-stat"><small>Invested</small><b>₹${fmt(invested)}</b></div>
    <div class="bk-stat"><small>Returned</small><b>₹${fmt(returned)}</b></div>
    <div class="bk-stat"><small>Net profit</small><b class="${net>0?'up':net<0?'down':''}">${closed.length?money(net):'—'}</b></div>`;
  $('.bk-list',book).innerHTML=es.length?es.map((e,i)=>{
    const d=e.sell!=null?e.sell-e.buy:null;
    return `<article class="bk-row" style="animation-delay:${i*45}ms">
      <div class="bk-price">${fmt(e.buy)} <span>→</span> ${e.sell!=null?fmt(e.sell):'—'}</div>
      <div class="bk-pl ${d>0?'up':d<0?'down':''}">${d==null?'—':money(d)}<i>${d==null?'Holding':d>0?'Profit':d<0?'Loss':'Break-even'}</i></div>
      <div class="bk-date">${dShort(e.buyAt)} <span>→</span> ${e.sellAt?dShort(e.sellAt):'—'}</div>
      <div class="bk-st"><span class="pill s-${e.status.toLowerCase()}">${e.status}</span>
        <button class="bk-del bk-ed" data-edit="${e.id}" aria-label="Edit entry" title="Edit">${ic.edit}</button>
        <button class="bk-del" data-del="${e.id}" aria-label="Delete entry" title="Delete">${ic.trash}</button></div></article>`}).join('')
   :`<div class="bk-empty"><b>No entries for ${esc(active)} yet</b><span>Tap “Add new entry” to record one.</span></div>`;
}
book.addEventListener('click',e=>{
  const t=e.target.closest('[data-p]');if(t){active=t.dataset.p;renderBook();return}
  const ed=e.target.closest('[data-edit]');if(ed){openEntry(store.entries.find(x=>x.id===ed.dataset.edit));return}
  if(e.target.closest('[data-a="add"]')){openEntry();return}
  const del=e.target.closest('[data-del]');if(del){
    if(del.dataset.armed){store.entries=store.entries.filter(x=>x.id!==del.dataset.del);save();renderBook()}
    else{del.dataset.armed=1;del.classList.add('arm');del.textContent='Delete?';
      setTimeout(()=>{if(del.isConnected){delete del.dataset.armed;del.classList.remove('arm');del.innerHTML=ic.trash}},2500)}
  }
});

/* ---------- New entry ---------- */
const entry=mount(`<section class="modal bk-form" role="dialog" aria-modal="true" aria-labelledby="enT">
  <div class="mhead"><div><h2 id="enT">New entry</h2><p>Record an investor’s purchase and sale</p></div>
    <button class="btn icon sm" data-ripple data-x aria-label="Close">${ic.close}</button></div>
  <div class="bk-f">
    <label class="bk-lb" for="enWho">Investor</label>
    <input class="bk-in" id="enWho" list="enPeople" placeholder="New or existing investor" autocomplete="off"><datalist id="enPeople"></datalist>
    <span class="bk-lb">Date</span>
    <div class="bk-two">
      <button type="button" class="bk-in bk-pick" data-pick="buyAt"></button>
      <button type="button" class="bk-in bk-pick" data-pick="sellAt"></button></div>
    <span class="bk-lb">Price</span>
    <div class="bk-two">
      <label class="bk-money"><b>₹</b><input class="bk-in" id="enBuy" inputmode="decimal" placeholder="Purchased"></label>
      <label class="bk-money"><b>₹</b><input class="bk-in" id="enSell" inputmode="decimal" placeholder="Sold"></label></div>
    <span class="bk-lb">Status</span>
    <div class="bk-seg" role="radiogroup">${['Purchased','Sold','Earned'].map(s=>`<button type="button" role="radio" data-s="${s}" data-ripple>${s}</button>`).join('')}</div>
    <p class="bk-err" role="alert" hidden></p>
  </div>
  <div class="bk-two bk-act"><button class="btn bk-ghost" data-ripple data-x>Cancel</button><button class="btn bk-primary" data-ripple data-a="save">Add</button></div>
</section>`);
let f;
const closedStatus=()=>f.status!=='Purchased';
function syncForm(){
  $('[data-pick="buyAt"]',entry).innerHTML=`${ic.cal}<span class="${f.buyAt?'':'ph'}">${f.buyAt?dFull(f.buyAt):'Purchased date'}</span>`;
  $('[data-pick="sellAt"]',entry).innerHTML=`${ic.cal}<span class="${f.sellAt?'':'ph'}">${f.sellAt?dFull(f.sellAt):'Sold date'}</span>`;
  $('[data-pick="sellAt"]',entry).disabled=!closedStatus();
  $('#enSell',entry).disabled=!closedStatus();$('#enSell',entry).closest('.bk-money').classList.toggle('off',!closedStatus());
  entry.querySelectorAll('[data-s]').forEach(b=>{const on=b.dataset.s===f.status;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
}
let editing=null;
function openEntry(ent){
  editing=ent||null;
  f=ent?{who:ent.who,buyAt:ent.buyAt,sellAt:ent.sellAt||'',status:ent.status}:{who:'',buyAt:nowIso(),sellAt:'',status:'Purchased'};
  $('#enT',entry).textContent=ent?'Edit entry':'New entry';
  $('[data-a="save"]',entry).textContent=ent?'Save':'Add';
  $('#enWho',entry).value=f.who;$('#enBuy',entry).value=ent?ent.buy:'';$('#enSell',entry).value=ent&&ent.sell!=null?ent.sell:'';
  $('#enPeople',entry).innerHTML=store.people.map(p=>`<option value="${esc(p)}">`).join('');
  $('.bk-err',entry).hidden=true;syncForm();open(entry);
}
entry.addEventListener('click',e=>{
  const p=e.target.closest('[data-pick]');
  if(p&&!p.disabled){const k=p.dataset.pick;openCal(f[k]||nowIso(),k==='sellAt',v=>{f[k]=v;syncForm()});return}
  const s=e.target.closest('[data-s]');
  if(s){f.status=s.dataset.s;if(closedStatus()&&!f.sellAt)f.sellAt=nowIso();syncForm();return}
  if(e.target.closest('[data-a="save"]'))saveEntry();
});
function saveEntry(){
  const err=m=>{const el=$('.bk-err',entry);el.textContent=m;el.hidden=false};
  let who=$('#enWho',entry).value.trim();
  const buy=parseFloat($('#enBuy',entry).value),sell=parseFloat($('#enSell',entry).value);
  if(!who)return err('Enter the investor’s name.');
  if(!(buy>0))return err('Enter the purchase price.');
  if(closedStatus()){
    if(!(sell>=0))return err('Enter the sold price.');
    if(!f.sellAt)return err('Pick the sold date.');
    if(f.sellAt<f.buyAt)return err('Sold date can’t be before the purchase date.');
  }
  const known=store.people.find(p=>p.toLowerCase()===who.toLowerCase());
  if(known)who=known;else store.people.push(who);
  const o={who,buyAt:f.buyAt,sellAt:closedStatus()?f.sellAt:null,buy,sell:closedStatus()?sell:null,status:f.status};
  editing?Object.assign(editing,o):store.entries.push({id:uid(),...o});
  save();active=who;renderBook();close(entry);
}

/* ---------- Calendar picker (Google Calendar style) ---------- */
const cal=mount(`<section class="modal bk-calm" role="dialog" aria-modal="true" aria-label="Pick date and time"></section>`,'bk-cal');
const calEl=$('.bk-calm',cal);
let C;
function openCal(iso,clearable,cb){
  const d=new Date(iso),h=d.getHours();
  C={y:d.getFullYear(),m:d.getMonth(),mode:'days',sel:{y:d.getFullYear(),m:d.getMonth(),d:d.getDate()},h:h%12||12,mi:d.getMinutes(),ap:h<12?'AM':'PM',clearable,cb};
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
  const opt=(arr,v)=>arr.map(x=>`<option ${x==v?'selected':''}>${typeof x==='number'?pad(x):x}</option>`).join('');
  calEl.innerHTML=`<div class="bk-ch"><div class="bk-cts">${C.mode==='days'?`<button class="bk-ct" data-c="mode">${MONF[C.m]} ${ic.dn}</button>`:''}${C.mode==='years'?`<span class="bk-ct">Select year</span>`:`<button class="bk-ct" data-c="years">${C.y} ${ic.dn}</button>`}</div>
    ${C.mode==='years'?'':`<div class="bk-nav"><button class="btn icon sm" data-ripple data-c="prev" aria-label="Previous">${ic.l}</button><button class="btn icon sm" data-ripple data-c="next" aria-label="Next">${ic.r}</button></div>`}</div>
    ${body}
    <div class="bk-time">${ic.clock}
      <select class="bk-sel" data-t="h" aria-label="Hour">${opt([1,2,3,4,5,6,7,8,9,10,11,12].map(String),C.h)}</select><b>:</b>
      <input class="bk-sel bk-min" data-t="mi" inputmode="numeric" maxlength="2" aria-label="Minute" value="${pad(C.mi)}">
      <select class="bk-sel" data-t="ap" aria-label="AM or PM">${opt(['AM','PM'],C.ap)}</select>
      <button class="bk-link" data-c="today">Today</button></div>
    <div class="bk-ca">${C.clearable?'<button class="bk-link" data-c="clear">Clear</button>':'<span></span>'}
      <span><button class="bk-link" data-x>Cancel</button><button class="bk-link strong" data-c="ok" ${C.sel?'':'disabled'}>OK</button></span></div>`;
  const ys=calEl.querySelector('.bk-yrs'),sy=ys&&ys.querySelector('.sel');if(sy)ys.scrollTop=sy.offsetTop-ys.clientHeight/2+sy.offsetHeight/2;
}
cal.addEventListener('change',e=>{const k=e.target.dataset.t;if(!k)return;if(k==='ap')C.ap=e.target.value;
  else if(k==='mi'){const v=Math.min(59,Math.max(0,parseInt(e.target.value,10)||0));C.mi=v;e.target.value=pad(v)}
  else C.h=parseInt(e.target.value,10)});
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
  else if(a==='ok'){if(!C.sel)return;C.cb(isoOf(C.sel.y,C.sel.m,C.sel.d,C.h%12+(C.ap==='PM'?12:0),C.mi));close(cal);return}
  drawCal();
});

/* ---------- header button ---------- */
const btn=document.createElement('button');
btn.id='bookBtn';btn.className='btn icon';btn.setAttribute('data-ripple','');btn.setAttribute('aria-label','Investor book');btn.title='Investor book';btn.innerHTML=ic.book;
const trend=document.getElementById('trendBtn');
trend?trend.after(btn):document.querySelector('.actions')?.prepend(btn);
btn.addEventListener('click',()=>{renderBook();open(book)});
})();

// Demo data: replace PLATFORMS / genRates with a real API when ready.
// Logos are inline SVG marks; to use official logos, set `img:'assets/logos/x.svg'` on a platform.
const LOGOS = {
  amazon:`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#131a22"/><text x="24" y="30" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="28" fill="#fff">a</text><path d="M11 34c8 5 19 5 27-1" fill="none" stroke="#ff9900" stroke-width="3" stroke-linecap="round"/><path d="M35 31l4 1.5-1.5 4" fill="none" stroke="#ff9900" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  flipkart:`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#2874f0"/><path d="M15 17h18l-1.5 18a2 2 0 01-2 1.8H18.5a2 2 0 01-2-1.8z" fill="#ffe500"/><path d="M20 17v-2a4 4 0 018 0v2" fill="none" stroke="#ffe500" stroke-width="2.4"/><text x="24" y="33" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-style="italic" font-size="18" fill="#2874f0">f</text></svg>`,
};
LOGOS.phonepe=`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#5F259F"/><g transform="translate(9.60 9.60) scale(1.2)" fill="#fff"><path d="M10.206 9.941h2.949v4.692c-.402.201-.938.268-1.34.268-1.072 0-1.609-.536-1.609-1.743V9.941zm13.47 4.816c-1.523 6.449-7.985 10.442-14.433 8.919C2.794 22.154-1.199 15.691.324 9.243 1.847 2.794 8.309-1.199 14.757.324c6.449 1.523 10.442 7.985 8.919 14.433zm-6.231-5.888a.887.887 0 0 0-.871-.871h-1.609l-3.686-4.222c-.335-.402-.871-.536-1.407-.402l-1.274.401c-.201.067-.268.335-.134.469l4.021 3.82H6.386c-.201 0-.335.134-.335.335v.67c0 .469.402.871.871.871h.938v3.217c0 2.413 1.273 3.82 3.418 3.82.67 0 1.206-.067 1.877-.335v2.145c0 .603.469 1.072 1.072 1.072h.938a.432.432 0 0 0 .402-.402V9.874h1.542c.201 0 .335-.134.335-.335v-.67z"/></g></svg>`;
LOGOS.paytm=`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#fff"/><g transform="translate(3.60 3.60) scale(1.7)" fill="#20336B"><path d="M15.85 8.167a.204.204 0 0 0-.04.004c-.68.19-.543 1.148-1.781 1.23h-.12a.23.23 0 0 0-.052.005h-.001a.24.24 0 0 0-.184.235v1.09c0 .134.106.241.237.241h.645v4.623c0 .132.104.238.233.238h1.058a.236.236 0 0 0 .233-.238v-4.623h.6c.13 0 .236-.107.236-.241v-1.09a.239.239 0 0 0-.236-.24h-.612V8.386a.218.218 0 0 0-.216-.22zm4.225 1.17c-.398 0-.762.15-1.042.395v-.124a.238.238 0 0 0-.234-.224h-1.07a.24.24 0 0 0-.236.242v5.92a.24.24 0 0 0 .236.242h1.07c.12 0 .217-.091.233-.209v-4.25a.393.393 0 0 1 .371-.408h.196a.41.41 0 0 1 .226.09.405.405 0 0 1 .145.319v4.074l.004.155a.24.24 0 0 0 .237.241h1.07a.239.239 0 0 0 .235-.23l-.001-4.246c0-.14.062-.266.174-.34a.419.419 0 0 1 .196-.068h.198c.23.02.37.2.37.408.005 1.396.004 2.8.004 4.224a.24.24 0 0 0 .237.241h1.07c.13 0 .236-.108.236-.241v-4.543c0-.31-.034-.442-.08-.577a1.601 1.601 0 0 0-1.51-1.09h-.015a1.58 1.58 0 0 0-1.152.5c-.291-.308-.7-.5-1.153-.5zM.232 9.4A.234.234 0 0 0 0 9.636v5.924c0 .132.096.238.216.241h1.09c.13 0 .237-.107.237-.24l.004-1.658H2.57c.857 0 1.453-.605 1.453-1.481v-1.538c0-.877-.596-1.484-1.453-1.484H.232zm9.032 0a.239.239 0 0 0-.237.241v2.47c0 .94.657 1.608 1.579 1.608h.675s.016 0 .037.004a.253.253 0 0 1 .222.253c0 .13-.096.235-.219.251l-.018.004-.303.006H9.739a.239.239 0 0 0-.236.24v1.09a.24.24 0 0 0 .236.242h1.75c.92 0 1.577-.669 1.577-1.608v-4.56a.239.239 0 0 0-.236-.24h-1.07a.239.239 0 0 0-.236.24c-.005.787 0 1.525 0 2.255a.253.253 0 0 1-.25.25h-.449a.253.253 0 0 1-.25-.255c.005-.754-.005-1.5-.005-2.25a.239.239 0 0 0-.236-.24zm-4.004.006a.232.232 0 0 0-.238.226v1.023c0 .132.113.24.252.24h1.413c.112.017.2.1.213.23v.14c-.013.124-.1.214-.207.224h-.7c-.93 0-1.594.63-1.594 1.515v1.269c0 .88.57 1.506 1.495 1.506h1.94c.348 0 .63-.27.63-.6v-4.136c0-1.004-.508-1.637-1.72-1.637zm-3.713 1.572h.678c.139 0 .25.115.25.256v.836a.253.253 0 0 1-.25.256h-.1c-.192.002-.386 0-.578 0zm4.67 1.977h.445c.139 0 .252.108.252.24v.932a.23.23 0 0 1-.014.076.25.25 0 0 1-.238.164h-.445a.247.247 0 0 1-.252-.24v-.933c0-.132.113-.239.252-.239Z"/></g></svg>`;
LOGOS.jiogames=`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#0A2885"/><g transform="translate(8.40 8.40) scale(1.3)" fill="#fff"><path d="M12 0A12 12 0 1 1 0 12 12 12 0 0 1 12 0m5.587 14.559c-.883 0-1.49-.648-1.49-1.574 0-.912.62-1.56 1.49-1.56s1.491.648 1.491 1.573c0 .897-.634 1.56-1.49 1.56zm.03-5.152c-2.265 0-3.772 1.437-3.772 3.576 0 2.195 1.451 3.604 3.729 3.604 2.264 0 3.755-1.409 3.755-3.59 0-2.153-1.475-3.59-3.713-3.59zM11.78 6.272c-.856 0-1.395.483-1.395 1.243 0 .774.552 1.257 1.435 1.257.857 0 1.395-.483 1.395-1.257s-.552-1.243-1.435-1.243m.152 3.204h-.277c-.675 0-1.187.317-1.187 1.285v4.42c0 .98.496 1.284 1.216 1.284h.275c.677 0 1.16-.33 1.16-1.285v-4.419c0-.995-.47-1.285-1.187-1.285M8.316 7.392h-.4c-.76 0-1.174.43-1.174 1.285v4.13c0 1.063-.36 1.436-1.2 1.436-.662 0-1.201-.29-1.63-.816C3.87 13.373 3 13.786 3 14.81c0 1.104 1.035 1.781 2.955 1.781 2.334 0 3.563-1.173 3.563-3.742V8.675c0-.856-.413-1.283-1.202-1.283"/></g></svg>`;
const badge=n=>{let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%360;return `<span class="badge" style="background:hsl(${h} 45% 34%)">${n.trim()[0].toUpperCase()}</span>`};
const logoOf=p=>(LOGOS[p.logo]||badge(p.name))+(p.domain?`<img src="https://www.google.com/s2/favicons?domain=${p.domain}&sz=128" alt="" loading="lazy" onerror="this.remove()">`:'');
const BASE=[[1000,.20,'1 pc'],[1000,.22,'5 pcs'],[2000,.175],[3000,.1667],[4000,.20],[5000,.16]];
const fmt=n=>n.toLocaleString('en-IN');
const $=id=>document.getElementById(id);
let dayOffset=0,live=true,selected=null;

const rnd=s=>{const x=Math.sin(s)*1e4;return x-Math.floor(x)};
const today=()=>Math.floor(Date.now()/864e5);
const pctAt=(pct,i,k,off)=>Math.max(.05,pct+(rnd((today()+off)*7+i+k)-.5)*.06);
function genRates(off){
  const mk=(arr,k)=>arr.map(([face,pct,note],i)=>{
    const p=pctAt(pct,i,k,off),prev=pctAt(pct,i,k,off-1);
    const hist=Array.from({length:7},(_,j)=>pctAt(pct,i,k,off-6+j));
    return {face,note,pay:Math.round(face*(1+p)),pct:p*100,trend:p-prev,hist};
  });
  return {rates:mk(BASE,0)};
}
function spark(h,up){
  const mn=Math.min(...h),mx=Math.max(...h),r=mx-mn||1;
  const pts=h.map((v,i)=>`${(i/(h.length-1))*70},${24-((v-mn)/r)*20-2}`).join(' ');
  const c=up?'#2bff88':'#ff6b6b';
  return `<svg class="sp" viewBox="0 0 70 26"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const ORDER_KEY='pst.order';
const savedOrder=()=>{try{return JSON.parse(localStorage.getItem(ORDER_KEY))||[]}catch(e){return []}};
const saveOrder=n=>{try{localStorage.setItem(ORDER_KEY,JSON.stringify(n))}catch(e){}};
function orderedPlatforms(){
  const o=savedOrder(),rank=p=>{const i=o.indexOf(p.name);return i<0?1e6+PLATFORMS.indexOf(p):i};
  return [...PLATFORMS].sort((x,y)=>rank(x)-rank(y));
}
function renderPlatforms(flash){
  $('platforms').innerHTML=orderedPlatforms().map((p,i)=>{
    const n=p.items.filter(x=>x.s).length;
    return `<article class="card" data-name="${p.name}" style="${flash?'animation:none;opacity:1':`animation-delay:${i*70}ms`}">
      <div class="ch"><div class="logo">${logoOf(p)}</div>
        <div><h3>${p.name}</h3><small>${p.items.filter(x=>!x.label).length} denominations${p.items.some(x=>x.label)?" + custom":""}</small></div>
        <span class="tag ${n?'':'off'}">${n?n+' in stock':'Unavailable'}</span></div>
      <div class="chips">${p.items.map(it=>{const k=p.name+'-'+it.v;return `
        <a class="chip ${it.s?'':'out'}" draggable="false" ${(it.u||p.home)?`href="${it.u||p.home}" target="_blank" rel="noopener noreferrer"`:''} data-ripple>
          <span class="v">${it.label||fmt(it.v)}</span>
          ${it.d?`<span class="d ${it.d>0?'up':'down'}">${it.d>0?'+':''}${it.d}</span>`:''}
          ${it.p?`<span class="p">&#8377;${fmt(it.p)}</span>`:''}
        </a>`}).join('')}</div></article>`;}).join('');
}

function renderModal(){
  const d=new Date(Date.now()+dayOffset*864e5);
  $('mDate').textContent=d.toLocaleDateString('en-GB');
  $('mTime').textContent=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  $('next').disabled=dayOffset>=0;
  const {rates}=genRates(dayOffset);
  $('rates').innerHTML=rates.map((r,n)=>{
    const ch=r.trend*100,flat=Math.abs(ch)<.05;
    return `<div class="row" style="animation-delay:${n*45}ms"><div class="a">${fmt(r.face)} <span class="ar">&rarr;</span> <b>${fmt(r.pay)}</b> ${r.note?`<small>${r.note}</small>`:''}</div>
    ${spark(r.hist,r.trend>=0)}<div class="pct">${r.pct.toFixed(1)}%<i class="${flat?'':r.trend>0?'up':'down'}">${flat?'No change':(r.trend>0?'▲ ':'▼ ')+Math.abs(ch).toFixed(1)+' pts'}</i></div></div>`;}).join('');
}

let toastT;
function soon(){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent='Coming soon';t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true},1800)}
const openM=()=>{dayOffset=0;renderModal();$('overlay').hidden=false;document.body.style.overflow='hidden'};
const closeM=()=>{const o=$('overlay');if(o.hidden)return;o.classList.add('closing');setTimeout(()=>{o.hidden=true;o.classList.remove('closing');document.body.style.overflow=''},250)};
$('trendBtn').onclick=soon;$('closeBtn').onclick=closeM;
$('overlay').onclick=e=>{if(e.target.id==='overlay')closeM()};
document.addEventListener('keydown',e=>e.key==='Escape'&&closeM());
$('prev').onclick=()=>{dayOffset--;renderModal()};
$('next').onclick=()=>{if(dayOffset<0){dayOffset++;renderModal()}};
$('powerBtn').onclick=soon;

document.addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-ripple]');if(!b||b.disabled)return;
  const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*2,el=document.createElement('span');
  el.className='ripple';el.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;
  b.appendChild(el);setTimeout(()=>el.remove(),600);
});

/* ---------- press and hold a platform card, then drag it where you want it ---------- */
const grid=$('platforms');
let DG=null,dsuppress=0;
function dClean(){
  if(!DG)return;clearTimeout(DG.timer);cancelAnimationFrame(DG.raf);
  removeEventListener('pointermove',dMove);removeEventListener('pointerup',dEnd);removeEventListener('pointercancel',dEnd);DG=null;
}
function startDrag(){
  const cards=[...grid.querySelectorAll('.card')];
  DG.cards=cards;DG.i=cards.indexOf(DG.card);DG.t=DG.i;DG.sx=scrollX;DG.sy=scrollY;
  DG.rects=cards.map(c=>{const r=c.getBoundingClientRect();return {l:r.left+scrollX,t:r.top+scrollY,w:r.width,h:r.height}});
  DG.state='drag';grid.classList.add('dragging');
  cards.forEach(c=>{c.classList.remove('lift');if(c!==DG.card)c.classList.add('shift')});DG.card.classList.add('drag');
  dLoop();dragTo();
}
function dragTo(){
  const px=DG.cx+scrollX,py=DG.cy+scrollY,i=DG.i;
  DG.card.style.transform=`translate(${px-(DG.x+DG.sx)}px,${py-(DG.y+DG.sy)}px) scale(1.03)`;
  let t=-1;DG.rects.forEach((r,j)=>{if(px>=r.l&&px<=r.l+r.w&&py>=r.t&&py<=r.t+r.h)t=j});
  if(t<0){let best=Infinity;DG.rects.forEach((r,j)=>{const d=(px-r.l-r.w/2)**2+(py-r.t-r.h/2)**2;if(d<best){best=d;t=j}})}
  DG.t=t;
  DG.cards.forEach((c,j)=>{
    if(j===i)return;
    const n=(i<j&&j<=t)?j-1:(t<=j&&j<i)?j+1:j,a=DG.rects[j],b=DG.rects[n];
    c.style.transform=n===j?'':`translate(${b.l-a.l}px,${b.t-a.t}px)`;
  });
}
function dLoop(){
  if(!DG||DG.state!=='drag')return;
  const z=90;let v=0;
  if(DG.cy<z)v=-Math.min(16,(z-DG.cy)/4);else if(DG.cy>innerHeight-z)v=Math.min(16,(DG.cy-(innerHeight-z))/4);
  if(v){scrollBy(0,v);dragTo()}
  DG.raf=requestAnimationFrame(dLoop);
}
function dMove(e){
  if(!DG)return;DG.cx=e.clientX;DG.cy=e.clientY;
  const dist=Math.hypot(e.clientX-DG.x,e.clientY-DG.y);
  if(DG.state==='wait'){if(dist>10)dClean();return}
  if(DG.state==='ready'){if(dist>6)startDrag();return}
  dragTo();
}
function dEnd(){
  if(!DG)return;
  dsuppress=Date.now()+(DG.state==='wait'?0:450);
  if(DG.state==='drag'){
    const {cards,i,t}=DG;
    cards.forEach(c=>{c.style.transform='';c.classList.remove('drag','shift','lift')});grid.classList.remove('dragging');
    const names=cards.map(c=>c.dataset.name);
    dClean();
    if(t!==i){const [m]=names.splice(i,1);names.splice(t,0,m);saveOrder(names);renderPlatforms(true)}
    return;
  }
  DG.card.classList.remove('lift');dClean();
}
grid.addEventListener('pointerdown',e=>{
  if(e.button>0||DG)return;
  const card=e.target.closest('.card');if(!card)return;
  DG={card,x:e.clientX,y:e.clientY,cx:e.clientX,cy:e.clientY,state:'wait'};
  DG.timer=setTimeout(()=>{if(!DG||DG.state!=='wait')return;DG.state='ready';dsuppress=Date.now()+900;if(navigator.vibrate)navigator.vibrate(12);card.classList.add('lift')},420);
  addEventListener('pointermove',dMove);addEventListener('pointerup',dEnd);addEventListener('pointercancel',dEnd);
});
grid.addEventListener('touchmove',e=>{if(DG&&DG.state!=='wait'&&e.cancelable)e.preventDefault()},{passive:false});
grid.addEventListener('click',e=>{if(Date.now()<dsuppress){e.preventDefault();e.stopPropagation()}},true);
grid.addEventListener('dragstart',e=>e.preventDefault());
grid.addEventListener('contextmenu',e=>{if(DG||Date.now()<dsuppress)e.preventDefault()});

renderPlatforms();
$('sub').textContent='Last updated '+LAST_UPDATED;
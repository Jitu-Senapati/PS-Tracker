// Demo data: replace PLATFORMS / genRates with a real API when ready.
// Logos are inline SVG marks; to use official logos, set `img:'assets/logos/x.svg'` on a platform.
const LOGOS = {
  amazon:`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#131a22"/><text x="24" y="30" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="28" fill="#fff">a</text><path d="M11 34c8 5 19 5 27-1" fill="none" stroke="#ff9900" stroke-width="3" stroke-linecap="round"/><path d="M35 31l4 1.5-1.5 4" fill="none" stroke="#ff9900" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  flipkart:`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#2874f0"/><path d="M15 17h18l-1.5 18a2 2 0 01-2 1.8H18.5a2 2 0 01-2-1.8z" fill="#ffe500"/><path d="M20 17v-2a4 4 0 018 0v2" fill="none" stroke="#ffe500" stroke-width="2.4"/><text x="24" y="33" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-style="italic" font-size="18" fill="#2874f0">f</text></svg>`,
  jiomart:`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#0b3c8f"/><circle cx="24" cy="21" r="12" fill="#e8222d"/><text x="24" y="26" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="13" fill="#fff">jio</text><text x="24" y="41" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="8" fill="#fff" letter-spacing=".5">MART</text></svg>`,
  e2z:`<svg viewBox="0 0 48 48"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2bff88"/><stop offset="1" stop-color="#0a7a3d"/></linearGradient></defs><rect width="48" height="48" fill="#06140c"/><rect x="5" y="5" width="38" height="38" rx="10" fill="none" stroke="url(#g1)" stroke-width="2"/><text x="24" y="30" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="16" fill="url(#g1)">E2Z</text></svg>`,
  gaming:`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#10062a"/><path d="M13 18h22a5 5 0 015 5l1 8a4 4 0 01-7 3l-3-4H17l-3 4a4 4 0 01-7-3l1-8a5 5 0 015-5z" fill="#a855f7"/><path d="M16 22v6M13 25h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="31" cy="23" r="1.8" fill="#fff"/><circle cx="35" cy="27" r="1.8" fill="#fff"/></svg>`
};
LOGOS.jiogames=`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#0b3c8f"/><circle cx="24" cy="20" r="12" fill="#e8222d"/><text x="24" y="25" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="13" fill="#fff">jio</text><text x="24" y="41" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="8" fill="#fff" letter-spacing=".5">GAMES</text></svg>`;
LOGOS.paytm=`<svg viewBox="0 0 48 48"><rect width="48" height="48" fill="#00baf2"/><text x="24" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="15" fill="#002970">paytm</text></svg>`;
const badge=n=>{let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%360;return `<span class="badge" style="background:hsl(${h} 45% 34%)">${n.trim()[0].toUpperCase()}</span>`};
const logoOf=p=>LOGOS[p.logo]||(badge(p.name)+(p.domain?`<img src="https://www.google.com/s2/favicons?domain=${p.domain}&sz=128" alt="" loading="lazy" onerror="this.remove()">`:''));
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

function renderPlatforms(flash){
  $('platforms').innerHTML=PLATFORMS.map((p,i)=>{
    const n=p.items.filter(x=>x.s).length;
    return `<article class="card" style="${flash?'animation:none;opacity:1':`animation-delay:${i*70}ms`}">
      <div class="ch"><div class="logo">${logoOf(p)}</div>
        <div><h3>${p.name}</h3><small>${p.items.filter(x=>!x.label).length} denominations${p.items.some(x=>x.label)?" + custom":""}</small></div>
        <span class="tag ${n?'':'off'}">${n?n+' in stock':'Unavailable'}</span></div>
      <div class="chips">${p.items.map(it=>{const k=p.name+'-'+it.v;return `
        <a class="chip ${it.s?'':'out'}" ${(it.u||p.home)?`href="${it.u||p.home}" target="_blank" rel="noopener noreferrer"`:''} data-ripple>
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

renderPlatforms();
$('sub').textContent='Prices across platforms \u00b7 updated '+LAST_UPDATED;
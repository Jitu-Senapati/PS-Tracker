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
const DROPLINE=/Price\s*Down\s*Time/i;
const DROPWIN=/Price\s*Down\s*Time\W*(\d{1,2}:\d{2}\s*[AP]M)\s*to\s*(\d{1,2}:\d{2}\s*[AP]M)/i;
const OFFER_LINE=/^[^A-Za-z0-9]*offer[^A-Za-z0-9]*$/i;
const WINDOW=/\(\s*(\d{1,2}:\d{2}\s*[AP]M)\s*To\s*(\d{1,2}:\d{2}\s*[AP]M)\s*\)/i;
const hm=(t,def)=>{const v=t&&t.match(/(\d{1,2}):(\d{2})\s*([AP])M/i);return v?[+v[1]%12+(v[3].toUpperCase()==='P'?12:0),+v[2]]:def};
// IST times in the messages -> epoch ms
const istTs=(y,mo,d,h,mi)=>Date.UTC(y,mo,d,h,mi)-330*6e4;
/* ---------- new "PRICE LIST & PAYMENT TERMS" message (no date in the message) ---------- */
// 04-day regular rates: a face line ("₹1,000 PlayStation") followed by "➜ ₹1,550 / $15.5 (Min. 1 Piece)" and "(Min. 5 Pieces)" lines
//   -> saved as p1 / p5. 02-day special rates: one line per amount ("₹1,000 ➜ ₹1,450 / $14.5") -> saved as s2.
function listRates(lines){
  const rates={},warn=[];let face=null,section='regular',found=false;
  for(const ln of lines){
    if(found&&/payment\s*terms|bank\s*details/i.test(ln))break;
    if(/\d\s*-?\s*day\s*payment/i.test(ln)&&/(special|regular)\s*rates/i.test(ln)){section=/special/i.test(ln)?'special':'regular';face=null;continue}
    let m=ln.match(/₹\s*([\d,]{3,6})\s*Play\s*station(?![^₹]*₹)/i);
    if(m){face=m[1].replace(/,/g,'');continue}
    m=ln.match(/₹\s*([\d,]{3,6})\s*[➜→⇒>:\-–—]+\s*₹\s*([\d,]+)/);
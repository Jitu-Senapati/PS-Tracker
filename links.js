// Links for each platform. Loaded after data.js, so your stock flags (s) and prices in data.js stay untouched.
//   name   : platform name exactly as in data.js (a missing platform is added)
//   home   : opens when you tap the platform's logo / name, and for cards that have no link of their own
//   app    : opens that app first (deep link); falls back to `home` if the app does not open
//   dens   : the card amounts this platform really has (others are removed, new ones start out of stock)
//   urls   : a link for each card amount
//   domain : website used to fetch the logo
const LINKS = [
  {name:'Amazon', home:'https://www.amazon.in/s?k=Sony+PlayStation+Store+Gift+Card&i=videogames&rh=n%3A976460031%2Cp_n_availability%3A1318485031%2Cp_123%3A10806812&dc&ds=v1%3AOULhepWC0Z8i%2BOQIPyiH%2F3iAlg4mgH49lstMYHBGVIA&crid=2TQ370Q31W3KV&qid=1793281741&rnid=215263484031&sprefix=sony+playstation+store+gift+card%2Cvideogames%2C327&ref=sr_nr_p_country_of_origin-bin_1'},
  {name:'Flipkart', home:'https://www.flipkart.com/search?q=playstation+store+gift+card+india&sid=mcd%2Czyx%2Czzo'},
  {name:'Jio Store', home:'https://store.jiogames.com/products/?brand=playstation'},
  {name:'Stan Shop', domain:'stanshop.co', home:'https://www.stanshop.co/playstation-psn-gift-card-in-india', dens:[1000,2000,3000,4000], urls:{
    1000:'https://www.stanshop.co/playstation-psn-gift-card-in-india-1000-inr',
    2000:'https://www.stanshop.co/playstation-psn-gift-card-in-india-2000-inr',
    3000:'https://www.stanshop.co/playstation-psn-gift-card-in-india-3000-inr',
    4000:'https://www.stanshop.co/playstation-psn-gift-card-in-india-4000-inr'}},
  {name:'E2Z Store', domain:'e2zstore.com', home:'https://e2zstore.com/category/psn-india/', dens:[1000,2000,3000,4000,5000], urls:{
    1000:'https://e2zstore.com/product/rs-1000-playstation-network-wallet-top-up/',
    2000:'https://e2zstore.com/product/rs-2000-playstation-network-wallet-top-up/',
    3000:'https://e2zstore.com/product/rs-3000-playstation-network-wallet-top-up/',
    4000:'https://e2zstore.com/product/rs-4000-playstation-network-wallet-top-up/',
    5000:'https://e2zstore.com/product/rs-5000-playstation-network-wallet-top-up/'}},
  // Paytm: you search for PlayStation inside the app (1000, 2000 and 5000 only), so the card buttons open the app
  {name:'PhonePe', home:'https://www.phonepe.com/', app:'phonepe://', dens:[1000,2000,3000,4000,5000]},
  {name:'Paytm', home:'https://paytm.com/', app:'paytmmp://', dens:[1000,2000,5000]},
  {name:'Gyftr', home:'https://www.gyftr.com/sony-playstation', dens:[1000,2000,3000,4000,5000]},
  // Hubble: logo / name open the Gyftr page. Add  app:'<hubble app link>'  here when you have it, so the card buttons open the app.
  {name:'Hubble', domain:'myhubble.money', home:'https://www.gyftr.com/sony-playstation'},
  {name:'Rooter', home:'https://shop.rooter.gg/product/playstation-gift-cards', dens:[1000,2000,3000,4000,5000]},
  {name:'Games The Shop', home:'https://www.gamestheshop.com/search?q=psn', dens:[1000,2000,3000,4000,5000], urls:{
    1000:'https://www.gamestheshop.com/product/2153a461-7203-4802-aac4-283be4c775d3?variant=09df672e-b598-4b2d-9b3e-e1ca1dd9d205',
    2000:'https://www.gamestheshop.com/product/d117bc23-1c4b-4330-b7f3-f90c71d9a5b3?variant=cb05d659-beac-47d7-85ff-8bfed95f47cf',
    3000:'https://www.gamestheshop.com/product/f528de33-a760-4fea-9b04-3d150b24a116?variant=7e6631a0-0d65-4907-89b7-4ab5e24397cc',
    4000:'https://www.gamestheshop.com/product/7b96ea3c-96ea-436b-8d9d-71d1aa6036d5?variant=250dd1e0-c1e6-41c4-b14a-92a857f6c021',
    5000:'https://www.gamestheshop.com/product/57ffc696-2241-45b1-af43-736209293710?variant=9d31fdcf-28e8-451c-b3f7-a89a88b86a6f'}},
  {name:'Simply Gaming', domain:'simplygaming.in', home:'https://www.simplygaming.in/collections/playstation-gift-cards-india', dens:[1000,2000,3000,4000,5000], urls:{
    1000:'https://www.simplygaming.in/products/psn-gift-card-1000-inr-india',
    2000:'https://www.simplygaming.in/products/psn-gift-card-2000-inr-india',
    3000:'https://www.simplygaming.in/products/psn-gift-card-3000-inr-india',
    4000:'https://www.simplygaming.in/products/psn-gift-card-4000-inr-india',
    5000:'https://www.simplygaming.in/products/psn-gift-card-5000-inr-india'}},
  {name:'Kstore Global', domain:'kstore.global', home:'https://kstore.global/digital-vouchers/gaming/sony-playstation-wallet-top-up', dens:[1000,2000,3000,4000,5000]},
  {name:'Gift Up', domain:'giftup.in', home:'https://giftup.in/gift-cards?q=psn', dens:[1000,2000,3000,4000,5000]},
  {name:'Blinkit', domain:'blinkit.com', home:'https://blinkit.com/s/?q=sony%20playstation%20instant%20voucher', dens:[1000,2000,3000,4000,5000], urls:{
    1000:'https://blinkit.com/prn/sony-playstation-instant-voucher/prid/698590',
    2000:'https://blinkit.com/prn/sony-playstation-instant-voucher/prid/698593',
    3000:'https://blinkit.com/prn/sony-playstation-instant-voucher/prid/698594',
    4000:'https://blinkit.com/prn/sony-playstation-instant-voucher/prid/699135',
    5000:'https://blinkit.com/prn/sony-playstation-instant-voucher/prid/698592'}},
];

(function applyLinks(){
  LINKS.forEach(L=>{
    let p=PLATFORMS.find(x=>x.name.toLowerCase()===L.name.toLowerCase());
    if(!p){p={name:L.name,items:[]};PLATFORMS.push(p)}
    ['domain','logo','home','app'].forEach(k=>{if(L[k])p[k]=L[k]});
    if(L.dens){
      const old=new Map(p.items.filter(i=>typeof i.v==='number').map(i=>[i.v,i]));
      const extra=p.items.filter(i=>typeof i.v!=='number');
      p.items=L.dens.map(v=>old.get(v)||{v,s:0}).concat(extra);
    }
    if(L.urls)p.items.forEach(i=>{if(L.urls[i.v])i.u=L.urls[i.v]});
  });
})();
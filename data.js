// All prices, stock flags and links live in this one file.
// s: 1 = in stock, 0 = out of stock.  u: link to that product (falls back to the platform's `home` link).
// p: current price in rupees (optional).  d: price difference (optional).
// domain: website used to fetch the real logo.  No domain = letter badge until a link is added.
const LAST_UPDATED = '19 Oct 2026';
const PLATFORMS = [
  {name:'Amazon', logo:'amazon', home:'https://www.amazon.in/dp/B0C1GYD3KN', items:[{v:1000, s:0, u:'https://www.amazon.in/dp/B07K6RYVHR'}, {v:2000, s:0, u:'https://www.amazon.in/dp/B093QF35KZ'}, {v:3000, s:0, u:'https://www.amazon.in/dp/B07K6PVR8B'}, {v:4000, s:0, u:'https://www.amazon.in/dp/B07K6RYVJ5'}, {v:5000, s:0, u:'https://www.amazon.in/dp/B0B3DDW7TB'}, {label:'Custom', s:0, u:'https://www.amazon.in/dp/B0C1GYD3KN'}]},
  {name:'PhonePe', domain:'phonepe.com', home:'https://www.phonepe.com/', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Flipkart', logo:'flipkart', home:'https://www.flipkart.com/search?q=playstation%20gift%20card', items:[{v:1000, s:0, u:'https://dl.flipkart.com/s/PIJrJ!uuuN'}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Gyftr', domain:'gyftr.com', home:'https://www.gyftr.com/', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Jio Store', domain:'jiogames.com', home:'https://store.jiogames.com/products/?brand=playstation', items:[{v:1000, s:0}, {v:2000, s:0, p:2000}, {v:5000, s:0}]},
  {name:'Hubble', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Paytm', domain:'paytm.com', home:'https://paytm.com/', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Rooter', domain:'rooter.gg', home:'https://shop.rooter.gg/', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Games The Shop', domain:'gamestheshop.com', home:'https://www.gamestheshop.com/', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Simply Gaming', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'E2Z Store', logo:'e2z', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Stan Shop', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Kstore Global', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Gift Up', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
];
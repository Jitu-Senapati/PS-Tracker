// All prices, stock flags and links live in this one file.
// s: 1 = in stock, 0 = out of stock.  u: link to that product (falls back to the platform's `home` link).
// p: current price in rupees (optional).  d: price difference (optional).
// domain: website used to fetch the real logo.  No domain = letter badge until a link is added.
const LAST_UPDATED = '20 Oct 2026';
const PLATFORMS = [
  {name:'Amazon', logo:'amazon', domain:'amazon.in', home:'https://www.amazon.in/dp/B0C1GYD3KN', items:[{v:1000, s:0, u:'https://www.amazon.in/dp/B07K6RYVHR'}, {v:2000, s:0, u:'https://www.amazon.in/dp/B093QF35KZ'}, {v:3000, s:0, u:'https://www.amazon.in/dp/B07K6PVR8B'}, {v:4000, s:0, u:'https://www.amazon.in/dp/B07K6RYVJ5'}, {v:5000, s:0, u:'https://www.amazon.in/dp/B0B3DDW7TB'}, {label:'Custom', s:0, u:'https://www.amazon.in/dp/B0C1GYD3KN'}]},
  {name:'Flipkart', logo:'flipkart', domain:'flipkart.com', home:'https://www.flipkart.com/search?q=playstation+store+gift+card+india&sid=mcd%2Czyx%2Czzo', items:[{v:1000, s:0, u:'https://www.flipkart.com/playstation-rs-1000-inr-gift-card/p/itm3d59225ae5e13'}, {v:2000, s:0, u:'https://www.flipkart.com/playstation-rs-2000-inr-gift-card/p/itmd41e56cc4ca04'}, {v:3000, s:0, u:'https://www.flipkart.com/sony-playstation-store-gift-card/p/itma3cec289dd512'}, {v:4000, s:0, u:'https://www.flipkart.com/sony-interactive-entertainment-europe-playstation-store-gift-card-4000-inr/p/itm5cb36d77285f5'}, {v:5000, s:0, u:'https://www.flipkart.com/sony-interactive-entertainment-europe-playstation-store-gift-card-5000-inr/p/itmb079e5a22622c'}]},
  {name:'Jio Store', logo:'jiogames', domain:'jiogames.com', home:'https://store.jiogames.com/products/?brand=playstation', items:[{v:1000, s:0}, {v:2000, s:0}, {v:3000, s:0}, {v:4000, s:0}, {v:5000, s:0}]},
  {name:'Stan Shop', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'E2Z Store', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Paytm', logo:'paytm', domain:'paytm.com', home:'https://paytm.com/', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'PhonePe', logo:'phonepe', domain:'phonepe.com', home:'https://www.phonepe.com/', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Gyftr', domain:'gyftr.com', home:'https://www.gyftr.com/', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Hubble', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Rooter', domain:'rooter.gg', home:'https://shop.rooter.gg/', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Games The Shop', domain:'gamestheshop.com', home:'https://www.gamestheshop.com/', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Simply Gaming', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Kstore Global', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Gift Up', items:[{v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
];

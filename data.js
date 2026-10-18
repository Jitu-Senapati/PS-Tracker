// All prices, stock flags and links live in this one file.
// s: 1 = in stock, 0 = out of stock.  u: link to that product (falls back to the platform's `home` link).
// p: current price in rupees (optional).  d: price difference (optional).
const LAST_UPDATED = '18 Oct 2026';
const PLATFORMS = [
  {name:'Amazon', logo:'amazon', home:'https://www.amazon.in/s?k=playstation+gift+card', items:[
    {v:1000, s:0}, {v:2000, s:0, u:'https://amzn.in/d/0hXbL70A'}, {v:3000, s:0}, {v:5000, s:0}]},
  {name:'Jio Games', logo:'jiogames', home:'https://store.jiogames.com/products/?brand=playstation', items:[
    {v:1000, s:0}, {v:2000, s:0, p:2000}, {v:5000, s:0}]},
  {name:'Paytm', logo:'paytm', home:'https://paytm.com/', items:[
    {v:1000, s:0}, {v:2000, s:0}, {v:5000, s:0}]},
  {name:'Flipkart', logo:'flipkart', home:'https://www.flipkart.com/search?q=playstation%20gift%20card', items:[
    {v:1000, s:0, u:'https://dl.flipkart.com/s/PIJrJ!uuuN'}, {v:2000, s:0}, {v:5000, s:0}]},
  // Add later: E2Z Store, Gaming Venture
];

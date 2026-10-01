let products = [];
let state = {
  category: "All",
  search: "",
  brand: "All",
  capacity: "All",
  condition: "All",
  availability: "All",
  maxPrice: "",
  sort: "newest",
  cart: JSON.parse(localStorage.getItem("bv_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("bv_wishlist") || "[]"),
  compare: JSON.parse(localStorage.getItem("bv_compare") || "[]"),
  recent: JSON.parse(localStorage.getItem("bv_recent") || "[]")
};

const $ = s => document.querySelector(s);
const money = n => `₹${Number(n).toLocaleString("en-IN")}`;

async function init(){
  const res = await fetch("/api/products");
  products = await res.json();
  populateFilters();
  render();
  bindEvents();
  updateCart();
}

function populateFilters(){
  [...new Set(products.map(p=>p.brand))].sort().forEach(v=>$("#brandFilter").insertAdjacentHTML("beforeend", `<option>${esc(v)}</option>`));
  [...new Set(products.map(p=>p.capacity))].sort().forEach(v=>$("#capacityFilter").insertAdjacentHTML("beforeend", `<option>${esc(v)}</option>`));
}

function filtered(){
  let arr = products.filter(p => {
    const hay = `${p.name} ${p.brand} ${p.category} ${p.capacity} ${p.interface}`.toLowerCase();
    return (state.category==="All"||p.category===state.category) &&
      hay.includes(state.search.toLowerCase()) &&
      (state.brand==="All"||p.brand===state.brand) &&
      (state.capacity==="All"||p.capacity===state.capacity) &&
      (state.condition==="All"||p.condition===state.condition) &&
      (state.availability==="All"||(state.availability==="In stock"?p.stock>0:p.stock>0&&p.stock<=3)) &&
      (!state.maxPrice||p.price<=Number(state.maxPrice));
  });
  if(state.sort==="low") arr.sort((a,b)=>a.price-b.price);
  if(state.sort==="high") arr.sort((a,b)=>b.price-a.price);
  if(state.sort==="stock") arr.sort((a,b)=>b.stock-a.stock);
  return arr;
}

function render(){
  const arr = filtered();
  $("#productsGrid").innerHTML = arr.length ? arr.map(card).join("") : `<div class="empty">No products match these filters. Try widening your search.</div>`;
  $("#recentGrid").innerHTML = state.recent.map(id=>products.find(p=>p.id===id)).filter(Boolean).slice(0,4).map(card).join("") || `<div class="empty">Products you open will appear here.</div>`;
  $("#wishlistCount").textContent = state.wishlist.length;
  $("#compareCount").textContent = state.compare.length;
}

function card(p){
  const saved = state.wishlist.includes(p.id);
  const discount = p.old_price ? Math.round((1-p.price/p.old_price)*100) : 0;
  return `<article class="product-card">
    ${p.health ? `<div class="health-pill">HEALTH ${p.health}%</div>` : ""}
    <button class="heart" data-action="wish" data-id="${p.id}">${saved?"♥":"♡"}</button>
    <div class="product-img"><img src="${p.image}" alt="${esc(p.name)}" loading="lazy"></div>
    <div class="product-body">
      <div class="product-meta"><span>${esc(p.brand)}</span><span>${esc(p.condition)}</span></div>
      <h3>${esc(p.name)}</h3>
      <div class="product-spec">${esc(p.capacity)} · ${esc(p.interface)}${p.rpm?` · ${p.rpm} RPM`:""}</div>
      <div class="price"><strong>${money(p.price)}</strong>${p.old_price?`<span class="old">${money(p.old_price)}</span><span class="stock">-${discount}%</span>`:""}</div>
      <div class="stock ${p.stock<=3?"low":""}">${p.stock>0?(p.stock<=3?`Only ${p.stock} left`:"In stock"):"Out of stock"}</div>
      <div class="product-actions">
        <button class="small-btn" data-action="details" data-id="${p.id}">View Details</button>
        <button class="small-btn primary" data-action="add" data-id="${p.id}" ${p.stock<1?"disabled":""}>Buy Now</button>
      </div>
    </div>
  </article>`;
}

function bindEvents(){
  $("#searchInput").addEventListener("input", e=>{state.search=e.target.value;render()});
  $("#sortSelect").addEventListener("change", e=>{state.sort=e.target.value;render()});
  $("#brandFilter").addEventListener("change", e=>{state.brand=e.target.value;render()});
  $("#capacityFilter").addEventListener("change", e=>{state.capacity=e.target.value;render()});
  $("#conditionFilter").addEventListener("change", e=>{state.condition=e.target.value;render()});
  $("#availabilityFilter").addEventListener("change", e=>{state.availability=e.target.value;render()});
  $("#maxPrice").addEventListener("input", e=>{state.maxPrice=e.target.value;render()});
  $("#categoryFilters").addEventListener("click", e=>{
    const b=e.target.closest("[data-category]"); if(!b)return;
    state.category=b.dataset.category;
    document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b)); render();
  });
  document.body.addEventListener("click", e=>{
    const el=e.target.closest("[data-action]");
    if(el){ const p=products.find(x=>x.id===Number(el.dataset.id)); if(!p)return;
      if(el.dataset.action==="wish") toggleWish(p.id);
      if(el.dataset.action==="add") addCart(p.id);
      if(el.dataset.action==="details") openProduct(p);
    }
  });
  $("#cartBtn").onclick=()=>openDrawer();
  $("#wishlistBtn").onclick=()=>showList("Wishlist",state.wishlist);
  $("#compareBtn").onclick=()=>showCompare();
  $("#menuBtn").onclick=()=>$("#mainNav").classList.toggle("open");
  $("#findBtn").onclick=storageFinder;
  $("#checkoutBtn").onclick=openCheckout;
  $("#cartItems").addEventListener("click",cartAction);
  $("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});
  document.body.addEventListener("click",e=>{if(e.target.matches("[data-close]"))closeModal()});
}

function addCart(id){
  const p=products.find(x=>x.id===id); if(!p||p.stock<1)return;
  const item=state.cart.find(x=>x.productId===id);
  if(item)item.quantity=Math.min(item.quantity+1,p.stock);else state.cart.push({productId:id,quantity:1});
  persist();updateCart();toast("Added to cart");openDrawer();
}
function cartAction(e){
  const b=e.target.closest("[data-cart]");if(!b)return;
  const id=Number(b.dataset.id),item=state.cart.find(x=>x.productId===id),p=products.find(x=>x.id===id);
  if(!item)return;
  if(b.dataset.cart==="plus")item.quantity=Math.min(item.quantity+1,p.stock);
  if(b.dataset.cart==="minus")item.quantity--;
  if(b.dataset.cart==="remove"||item.quantity<=0)state.cart=state.cart.filter(x=>x.productId!==id);
  persist();updateCart();
}
function updateCart(){
  const count=state.cart.reduce((s,i)=>s+i.quantity,0);
  $("#cartCount").textContent=count;
  const items=state.cart.map(i=>({...i,p:products.find(p=>p.id===i.productId)})).filter(x=>x.p);
  $("#cartItems").innerHTML=items.length?items.map(({p,quantity})=>`<div class="cart-row"><img src="${p.image}" alt=""><div><b>${esc(p.name)}</b><div class="qty"><button data-cart="minus" data-id="${p.id}">−</button><span>${quantity}</span><button data-cart="plus" data-id="${p.id}">+</button><button data-cart="remove" data-id="${p.id}">×</button></div></div><strong>${money(p.price*quantity)}</strong></div>`).join(""):`<div class="empty">Your cart is empty.</div>`;
  const subtotal=items.reduce((s,x)=>s+x.p.price*x.quantity,0),delivery=subtotal>=2500||subtotal===0?0:99;
  $("#cartSubtotal").textContent=money(subtotal);$("#cartDelivery").textContent=money(delivery);$("#cartTotal").textContent=money(subtotal+delivery);
}
function openDrawer(){$("#cartDrawer").classList.add("open");$("#drawerBackdrop").classList.add("show")}
function closeDrawer(){$("#cartDrawer").classList.remove("open");$("#drawerBackdrop").classList.remove("show")}
function toggleWish(id){state.wishlist=state.wishlist.includes(id)?state.wishlist.filter(x=>x!==id):[...state.wishlist,id];persist();render();toast(state.wishlist.includes(id)?"Added to wishlist":"Removed from wishlist")}
function showList(title,ids){openHTML(`<div class="modal-top"><h2>${title}</h2><button class="close-btn" data-close>×</button></div><div class="products-grid">${ids.map(id=>products.find(p=>p.id===id)).filter(Boolean).map(card).join("")||`<div class="empty">Nothing here yet.</div>`}</div>`)}
function showCompare(){const ps=state.compare.map(id=>products.find(p=>p.id===id)).filter(Boolean);openHTML(`<div class="modal-top"><h2>Compare Products</h2><button class="close-btn" data-close>×</button></div>${ps.length?`<div class="spec-grid">${ps.map(p=>`<div><b>${esc(p.name)}</b><small>${esc(p.category)}</small><p>${esc(p.capacity)} · ${esc(p.interface)}</p><p>${money(p.price)}</p></div>`).join("")}</div>`:`<div class="empty">Add products to comparison from product details.</div>`}`)}
function openProduct(p){
  state.recent=[p.id,...state.recent.filter(x=>x!==p.id)].slice(0,6);persist();render();
  const health=p.health?`<div class="health-meter" style="--health:${p.health}"><span>${p.health}%</span></div><p style="text-align:center;color:#70f0c4">Drive Health</p>`:"";
  openHTML(`<div class="modal-top"><div><div class="eyebrow">${esc(p.category)} / ${esc(p.condition)}</div><h2>${esc(p.name)}</h2></div><button class="close-btn" data-close>×</button></div>
  <div class="modal-product"><div><img src="${p.image}" alt="${esc(p.name)}">${health}</div><div>
  <p style="color:#8f9aaa">${esc(p.brand)} · ${esc(p.model||"Verified listing")}</p>
  <div class="spec-grid">${spec("Brand",p.brand)}${spec("Capacity",p.capacity)}${spec("Interface",p.interface)}${spec("Condition",p.condition)}${spec("RPM",p.rpm?p.rpm:"—")}${spec("Read",p.read_speed)}${spec("Write",p.write_speed)}${spec("Warranty",p.warranty)}${p.power_on_hours!=null?spec("Power-on Hours",p.power_on_hours):""}${p.bad_sectors!=null?spec("Bad Sectors",p.bad_sectors):""}${p.drive_status?spec("Drive Status",p.drive_status):""}${p.tested?spec("Tested","Yes"):""}</div>
  <div class="price"><strong>${money(p.price)}</strong>${p.old_price?`<span class="old">${money(p.old_price)}</span>`:""}</div>
  <div style="display:flex;gap:8px"><button class="primary-btn" data-action="add" data-id="${p.id}">Buy Now</button><button class="small-btn" onclick="toggleCompare(${p.id})">⇄ Compare</button></div>
  </div></div>`);
}
function spec(a,b){return `<div><small>${a}</small><b>${esc(String(b??"—"))}</b></div>`}
function toggleCompare(id){if(state.compare.includes(id))state.compare=state.compare.filter(x=>x!==id);else if(state.compare.length<4)state.compare.push(id);else return toast("Compare up to 4 products");persist();render();toast("Comparison updated")}
function storageFinder(){
  const goal=$("#finderGoal").value,cap=$("#finderCapacity").value,budget=$("#finderBudget").value;
  let candidates=products.filter(p=>["HDD","SSD","External Storage"].includes(p.category));
  if(goal==="Faster Performance")candidates=candidates.filter(p=>p.category==="SSD");
  if(goal==="Backup")candidates=candidates.filter(p=>p.category==="HDD"||p.category==="External Storage");
  const capNum=parseCapacity(cap);
  candidates=candidates.filter(p=>parseCapacity(p.capacity)>=capNum||cap==="4TB+");
  const max=budget==="Under ₹2,500"?2500:budget.includes("5,000")?5000:budget.includes("8,000")?8000:99999999;
  candidates=candidates.filter(p=>p.price<=max).slice(0,3);
  $("#finderResults").innerHTML=candidates.map(p=>`<button class="small-btn" data-action="details" data-id="${p.id}">${esc(p.name)} · ${money(p.price)}</button>`).join("")||`<div class="empty">No exact match. Try a larger budget or capacity.</div>`;
}
function parseCapacity(s){const n=parseFloat(s);return s.includes("TB")?n*1024:n}
function openCheckout(){
  if(!state.cart.length)return toast("Add a product first");
  closeDrawer();
  const subtotal=state.cart.reduce((s,i)=>s+(products.find(p=>p.id===i.productId)?.price||0)*i.quantity,0),delivery=subtotal>=2500?0:99;
  openHTML(`<div class="modal-top"><div><div class="eyebrow">CHECKOUT</div><h2>Complete your order</h2></div><button class="close-btn" data-close>×</button></div>
  <form class="checkout" id="checkoutForm"><div class="form-grid">
  ${field("Full Name","name","text",true)}${field("Mobile Number","phone","tel",true)}${field("Email","email","email",true)}${field("Pincode","pincode","text",true)}
  ${field("Complete Address","address","text",true,"full")}${field("City","city","text",true)}${field("State","state","text",true)}
  <div class="form-field full"><label>Order Notes</label><textarea name="notes" rows="3"></textarea></div>
  </div><div class="payment-options"><label><input type="radio" name="payment" value="COD" checked> Cash on Delivery</label><label><input type="radio" name="payment" value="Online"> Online Payment</label></div>
  <div class="cart-summary"><div><span>Subtotal</span><b>${money(subtotal)}</b></div><div><span>Delivery</span><b>${money(delivery)}</b></div><div class="total"><span>Total</span><b>${money(subtotal+delivery)}</b></div></div>
  <button class="primary-btn wide" type="submit">Place Order · ${money(subtotal+delivery)}</button></form>`);
  $("#checkoutForm").onsubmit=placeOrder;
}
function field(label,name,type,required=false,full=""){return `<div class="form-field ${full}"><label>${label}</label><input name="${name}" type="${type}" ${required?"required":""}></div>`}
async function placeOrder(e){
  e.preventDefault();const f=new FormData(e.target);const customer=Object.fromEntries(f.entries());
  const items=state.cart.map(i=>({productId:i.productId,quantity:i.quantity}));
  const paymentMethod=f.get("payment"),notes=f.get("notes")||"";
  const btn=e.target.querySelector("button[type=submit]");btn.disabled=true;btn.textContent="Placing order…";
  const res=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer,items,paymentMethod,notes})});
  const data=await res.json();if(!res.ok){btn.disabled=false;btn.textContent="Place Order";return toast(data.error||"Order failed")}
  state.cart=[];persist();updateCart();
  openHTML(`<div class="success"><div class="eyebrow">ORDER CONFIRMED</div><h2>Your ByteVault order is in.</h2><p>Order ID</p><div class="order-id">${esc(data.orderId)}</div><p style="color:#8f9aaa">${esc(data.message)}</p><button class="primary-btn" data-close>Continue Shopping</button></div>`);
}
function openHTML(html){$("#modal").innerHTML=html;$("#modalBackdrop").classList.add("show")}
function closeModal(){$("#modalBackdrop").classList.remove("show");$("#modal").innerHTML=""}
function persist(){localStorage.setItem("bv_cart",JSON.stringify(state.cart));localStorage.setItem("bv_wishlist",JSON.stringify(state.wishlist));localStorage.setItem("bv_compare",JSON.stringify(state.compare));localStorage.setItem("bv_recent",JSON.stringify(state.recent))}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

init();

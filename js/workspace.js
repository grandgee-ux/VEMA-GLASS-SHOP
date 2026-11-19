(function () {
  const $ = (sel, root=document) => root.querySelector(sel);
  const money = n => "KES " + Number(n || 0).toLocaleString("en-KE", {maximumFractionDigits: 2});
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const read = (key, fallback) => { try { const v=JSON.parse(localStorage.getItem("gm_"+key)); return v ?? fallback; } catch(e) { return fallback; } };
  const save = (key, value) => localStorage.setItem("gm_"+key, JSON.stringify(value));
  const defaultProducts = [
    {id:1,name:"Clear glass 6mm",category:"Float glass",price:2500,stock:30},
    {id:2,name:"Mirror 5mm",category:"Mirror",price:3200,stock:18},
    {id:3,name:"Tinted glass 6mm",category:"Tinted glass",price:3800,stock:14},
    {id:4,name:"Clear glass 8mm",category:"Float glass",price:3400,stock:12}
  ];
  if (!localStorage.getItem("gm_products")) save("products", defaultProducts);
  if (!localStorage.getItem("gm_orders")) save("orders", []);
  if (!localStorage.getItem("gm_sales")) save("sales", []);
  if (!localStorage.getItem("gm_cart")) save("cart", []);
  if (!localStorage.getItem("gm_settings")) save("settings", {businessName:"Glass Mart",phone:"",location:"",currency:"KES"});
  const user = window.GlassMartAuth && window.GlassMartAuth.requireRole(document.body.dataset.requiredRole);
  if (!user) return;
  const role = user.role, page = document.body.dataset.page;
  const products = () => read("products", []);
  const orders = () => read("orders", []);
  const sales = () => read("sales", []);
  const cart = () => read("cart", []);
  const settings = () => read("settings", {businessName:"Glass Mart",currency:"KES"});
  const root = $("#appContent");
  const navLinks = document.querySelectorAll("[data-nav]");
  navLinks.forEach(a => { if (a.dataset.nav === page + ".html") a.classList.add("active"); });
  document.querySelectorAll("[data-user-name]").forEach(el => el.textContent=user.name);
  const shell = (html) => { root.innerHTML = html; };
  const stat = (label,value) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`;
  const table = (headers, rows) => `<div class="content-card"><div class="table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}">No records to display yet.</td></tr>`}</tbody></table></div></div>`;
  const productOptions = () => products().map(p=>`<option value="${p.id}">${esc(p.name)} — ${money(p.price)} (Stock: ${p.stock})</option>`).join("");
  const getProduct = id => products().find(p=>p.id===Number(id));
  const nextId = arr => arr.reduce((m,x)=>Math.max(m,Number(x.id)||0),0)+1;
  const addSale = (sale) => { const all=sales(); all.unshift({id:nextId(all),date:new Date().toISOString(),...sale}); save("sales",all); };
  const updateStock = (items) => {
    const all=products();
    for (const item of items) {
      const p=all.find(x=>x.id===Number(item.productId));
      if (!p || p.stock < item.qty) return false;
    }
    items.forEach(item=>{ const p=all.find(x=>x.id===Number(item.productId)); p.stock-=item.qty; });
    save("products",all); return true;
  };
  const productRows = (withActions) => products().map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${p.stock>0?'<span class="pill">In stock</span>':'<span class="pill pill-red">Out of stock</span>'}</td>${withActions?`<td><button class="btn danger tiny-btn" data-delete-product="${p.id}">Delete</button></td>`:""}</tr>`).join("");
  const orderRows = (list, action) => list.map(o=>`<tr><td>#${o.id}</td><td>${esc(o.customer)}</td><td>${o.items.map(i=>esc(i.name)+" × "+i.qty).join("<br>")}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td><td>${action?`<button class="btn primary tiny-btn" data-complete-order="${o.id}" ${o.status!=="Pending"?"disabled":""}>Complete sale</button>`:""}</td></tr>`).join("");
  function render() {
    if (role==="admin") renderAdmin();
    if (role==="staff") renderStaff();
    if (role==="customer") renderCustomer();
  }
  function renderAdmin() {
    if (page==="dashboard") {
      shell(`<div class="stats">${stat("PRODUCTS",products().length)}${stat("STAFF ACCOUNTS","2")}${stat("RECORDED SALES",sales().length)}${stat("SALES VALUE",money(sales().reduce((a,s)=>a+s.total,0)))}</div><div class="content-card"><h2>Administrator overview</h2><p>Manage the catalogue, review business activity and update the business profile. Changes saved in this browser will appear in the other workspaces on this device.</p><div class="action-row"><a class="btn primary" href="products.html">Manage products</a><a class="btn outline" href="reports.html">View reports</a></div></div>`);
    } else if (page==="products") {
      shell(`<div class="content-card"><h2>Add a product</h2><form id="productForm" class="grid-form"><div><label>Product name</label><input name="name" required placeholder="e.g. Laminated glass 6mm"></div><div><label>Category</label><input name="category" required placeholder="e.g. Float glass"></div><div><label>Unit price (KES)</label><input name="price" type="number" min="1" step="0.01" required></div><div><label>Opening stock</label><input name="stock" type="number" min="0" step="1" required></div><button class="btn primary" type="submit">Add product</button></form></div><div class="section-gap"></div><h2 class="section-title">Product catalogue</h2>${table(["Product","Category","Unit price","Stock","Availability","Action"],productRows(true))}`);
    } else if (page==="staff") {
      shell(`<div class="content-card"><h2>Demo staff accounts</h2><p>These accounts are provided for testing this front-end demo. Account creation and password management are not connected to a secure server.</p><div class="account-list"><div><strong>Demo Staff</strong><span>Username: staff</span><span>Role: Sales staff</span></div><div><strong>Administrator</strong><span>Username: admin</span><span>Role: Full access</span></div></div></div>`);
    } else if (page==="reports") {
      const ss=sales(), total=ss.reduce((a,s)=>a+s.total,0), os=orders();
      shell(`<div class="stats">${stat("TOTAL SALES",money(total))}${stat("NUMBER OF SALES",ss.length)}${stat("CUSTOMER ORDERS",os.length)}</div><h2 class="section-title">Sales report</h2>${table(["Receipt","Date","Customer","Type","Amount"],ss.map(s=>`<tr><td>#${s.id}</td><td>${new Date(s.date).toLocaleString()}</td><td>${esc(s.customer)}</td><td>${esc(s.type)}</td><td>${money(s.total)}</td></tr>`).join(""))}`);
    } else if (page==="settings") {
      const st=settings();
      shell(`<div class="content-card"><h2>Business profile</h2><form id="settingsForm" class="form-stack"><label>Business name</label><input name="businessName" required value="${esc(st.businessName||"Glass Mart")}"><label>Phone number</label><input name="phone" value="${esc(st.phone||"")}" placeholder="Business phone"><label>Shop location</label><input name="location" value="${esc(st.location||"")}" placeholder="Business location"><label>Currency</label><select name="currency"><option value="KES" selected>KES — Kenya Shillings</option></select><button class="btn primary" type="submit">Save settings</button></form><p class="muted">Settings are stored only in this browser.</p></div>`);
    }
  }
  function renderStaff() {
    if (page==="dashboard") {
      const todays=sales().filter(s=>new Date(s.date).toDateString()===new Date().toDateString());
      shell(`<div class="stats">${stat("SALES TODAY",money(todays.reduce((a,s)=>a+s.total,0)))}${stat("SALES COUNT",todays.length)}${stat("PENDING REMOTE ORDERS",orders().filter(o=>o.status==="Pending").length)}</div><div class="content-card"><h2>Staff workspace</h2><p>Record a walk-in sale or process a remote customer order. Stock is reduced when a sale is completed.</p><div class="action-row"><a class="btn primary" href="walkin.html">Record walk-in sale</a><a class="btn outline" href="remote-orders.html">View remote orders</a></div></div>`);
    } else if (page==="walkin" || page==="remote-sale") {
      shell(`<div class="content-card"><h2>${page==="walkin"?"New walk-in sale":"Complete a remote order"}</h2><form id="saleForm" class="grid-form"><div><label>Customer name</label><input name="customer" required placeholder="Customer name"></div><div><label>Product</label><select name="productId" required>${productOptions()}</select></div><div><label>Quantity</label><input name="qty" type="number" min="1" step="1" value="1" required></div><div><label>Payment method</label><select name="payment"><option>Cash</option><option>M-Pesa</option><option>Bank transfer</option></select></div><button class="btn primary" type="submit">Complete sale</button></form><p class="muted">The sale is saved in this browser and product stock is reduced.</p></div>`);
    } else if (page==="remote-orders") {
      shell(`<h2 class="section-title">Customer remote orders</h2>${table(["Order","Customer","Items","Total","Status","Action"],orderRows(orders(),"complete"))}`);
    } else if (page==="sales") {
      shell(`<h2 class="section-title">Recorded sales</h2>${table(["Receipt","Date","Customer","Type","Payment","Total"],sales().map(s=>`<tr><td>#${s.id}</td><td>${new Date(s.date).toLocaleString()}</td><td>${esc(s.customer)}</td><td>${esc(s.type)}</td><td>${esc(s.payment)}</td><td>${money(s.total)}</td></tr>`).join(""))}`);
    }
  }
  function renderCustomer() {
    if (page==="dashboard") {
      shell(`<div class="stats">${stat("AVAILABLE PRODUCTS",products().filter(p=>p.stock>0).length)}${stat("ITEMS IN CART",cart().reduce((a,i)=>a+i.qty,0))}${stat("MY ORDERS",orders().filter(o=>o.username===user.username).length)}</div><div class="content-card"><h2>Welcome to Glass Mart</h2><p>Browse available glass products, add items to your cart and submit an order for staff to process.</p><a class="btn primary" href="products.html">Browse products</a></div>`);
    } else if (page==="products") {
      shell(`<h2 class="section-title">Available products</h2><div class="product-grid">${products().map(p=>`<article class="product-tile"><div class="product-symbol">GM</div><h3>${esc(p.name)}</h3><p>${esc(p.category)}</p><strong>${money(p.price)}</strong><small>${p.stock} available</small><button class="btn primary full" data-add-cart="${p.id}" ${p.stock<1?"disabled":""}>Add to cart</button></article>`).join("")}</div>`);
    } else if (page==="cart") {
      const items=cart(), total=items.reduce((a,i)=>a+i.price*i.qty,0);
      shell(`<div class="content-card"><h2>Your cart</h2>${items.length?`<div class="table-wrap"><table class="data-table"><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th></tr>${items.map(i=>`<tr><td>${esc(i.name)}</td><td>${money(i.price)}</td><td><input class="qty-input" type="number" min="1" value="${i.qty}" data-cart-qty="${i.productId}"></td><td>${money(i.price*i.qty)}</td><td><button class="btn danger tiny-btn" data-remove-cart="${i.productId}">Remove</button></td></tr>`).join("")}</table></div><div class="cart-total">Total: <strong>${money(total)}</strong></div><a class="btn primary" href="checkout.html">Continue to checkout</a>`:`<p>Your cart is empty. Browse the products to add items.</p><a class="btn primary" href="products.html">Browse products</a>`}</div>`);
    } else if (page==="checkout") {
      const items=cart(), total=items.reduce((a,i)=>a+i.price*i.qty,0);
      shell(`<div class="content-card"><h2>Checkout</h2>${items.length?`<p>Order total: <strong>${money(total)}</strong></p><form id="checkoutForm" class="form-stack"><label>Full name</label><input name="customer" required value="${esc(user.name)}"><label>Phone number</label><input name="phone" required placeholder="07xx xxx xxx"><label>Delivery / collection notes</label><input name="notes" placeholder="Optional instructions"><label>Preferred payment</label><select name="payment"><option>M-Pesa</option><option>Cash on collection</option></select><button class="btn primary" type="submit">Place order</button></form>`:`<p>Your cart is empty. Add products before checkout.</p><a class="btn primary" href="products.html">Browse products</a>`}</div>`);
    } else if (page==="purchases") {
      const mine=orders().filter(o=>o.username===user.username);
      shell(`<h2 class="section-title">My orders</h2>${table(["Order","Placed","Items","Total","Status"],mine.map(o=>`<tr><td>#${o.id}</td><td>${new Date(o.date).toLocaleString()}</td><td>${o.items.map(i=>esc(i.name)+" × "+i.qty).join("<br>")}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`).join(""))}`);
    }
  }
  root.addEventListener("submit", function(e) {
    e.preventDefault();
    const f=e.target, data=Object.fromEntries(new FormData(f).entries());
    if (f.id==="productForm" && role==="admin") {
      const all=products(); all.push({id:nextId(all),name:data.name.trim(),category:data.category.trim(),price:Number(data.price),stock:Number(data.stock)});
      save("products",all); render(); alert("Product added to catalogue."); 
    } else if (f.id==="saleForm" && role==="staff") {
      const p=getProduct(data.productId), qty=Number(data.qty);
      if (!p || qty<1 || p.stock<qty) { alert("Not enough stock for this sale."); return; }
      if (!updateStock([{productId:p.id,qty}])) { alert("Unable to update stock."); return; }
      addSale({customer:data.customer.trim(),type:page==="walkin"?"Walk-in":"Remote",payment:data.payment,items:[{productId:p.id,name:p.name,qty,price:p.price}],total:p.price*qty});
      render(); alert("Sale completed. Stock updated.");
    } else if (f.id==="checkoutForm" && role==="customer") {
      const items=cart();
      if (!items.length) { alert("Your cart is empty."); return; }
      const allProducts=products();
      for (const item of items) {
        const p=allProducts.find(x=>x.id===item.productId);
        if (!p || p.stock<item.qty) { alert("Stock is insufficient for "+item.name+". Please update your cart."); return; }
      }
      const all=orders();
      all.unshift({id:nextId(all),date:new Date().toISOString(),username:user.username,customer:data.customer.trim(),phone:data.phone,notes:data.notes,payment:data.payment,status:"Pending",items:items,total:items.reduce((a,i)=>a+i.price*i.qty,0)});
      save("orders",all); save("cart",[]); alert("Your order has been placed. Staff can now see it in Remote Orders."); window.location.href="purchases.html";
    } else if (f.id==="settingsForm" && role==="admin") {
      save("settings",data); alert("Business settings saved in this browser.");
    }
  });
  root.addEventListener("click", function(e) {
    const add=e.target.closest("[data-add-cart]");
    if (add && role==="customer") {
      const p=getProduct(add.dataset.addCart); if (!p || p.stock<1) return;
      const c=cart(), existing=c.find(i=>i.productId===p.id);
      if (existing) { if (existing.qty>=p.stock) {alert("You have added all available stock.");return;} existing.qty++; }
      else c.push({productId:p.id,name:p.name,price:p.price,qty:1});
      save("cart",c); alert("Added to cart."); return;
    }
    const rem=e.target.closest("[data-remove-cart]");
    if (rem) { save("cart",cart().filter(i=>i.productId!==Number(rem.dataset.removeCart))); render(); return; }
    const del=e.target.closest("[data-delete-product]");
    if (del && role==="admin") { if(confirm("Delete this product?")) {save("products",products().filter(p=>p.id!==Number(del.dataset.deleteProduct)));render();} return; }
    const complete=e.target.closest("[data-complete-order]");
    if (complete && role==="staff") {
      const all=orders(), o=all.find(x=>x.id===Number(complete.dataset.completeOrder));
      if (!o || o.status!=="Pending") return;
      if (!updateStock(o.items.map(i=>({productId:i.productId,qty:i.qty})))) {alert("Insufficient stock. Adjust stock in the admin product catalogue before completing this order.");return;}
      o.status="Completed"; o.completedAt=new Date().toISOString(); save("orders",all);
      addSale({customer:o.customer,type:"Remote order",payment:o.payment,items:o.items,total:o.total});
      render(); alert("Remote order completed and recorded as a sale.");
    }
  });
  root.addEventListener("change", function(e) {
    const id=e.target.dataset.cartQty;
    if (id) {
      const c=cart(), item=c.find(i=>i.productId===Number(id)), p=getProduct(id), qty=Math.max(1,Number(e.target.value)||1);
      if (item && p) { item.qty=Math.min(qty,p.stock); save("cart",c); render(); }
    }
  });
  render();
})();

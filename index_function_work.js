console.log("✅ index_function_work.js loaded");

// ---------- Globals ----------
window.cart = [];
window.currentTable = localStorage.getItem("last_table") || "Table 1";

// ---------- Elements ----------
const searchInput = document.getElementById("productSearch");
const productDropdown = document.getElementById("productDropdown");
const qtyInput = document.getElementById("qty");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const previewBody = document.getElementById("previewBody");
const totalDisplay = document.getElementById("totalDisplay");
const previewInfo = document.getElementById("previewInfo");
const printKOTBtn = document.getElementById("printKOT");
const printInvBtn = document.getElementById("printInv");

// ---------- Format Number ----------
function formatNumber(num){
  if(isNaN(num)) return num;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g,",");
}

// ---------- Render Cart ----------
function renderCart(){
  if(!window.cart || window.cart.length===0){
    previewBody.innerHTML = `<div style="text-align:center;color:#777;padding:18px">No items</div>`;
    totalDisplay.textContent = "0₫";
    return;
  }

  let html = "";
  let total = 0;
  window.cart.forEach((item, i)=>{
    total += item.price * item.qty;
    html += `<div class="cart-item">
      <span>${item.name} x${item.qty}</span>
      <span>${formatNumber(item.price*item.qty)}₫</span>
      <button onclick="removeItem(${i})">×</button>
    </div>`;
  });
  previewBody.innerHTML = html;
  totalDisplay.textContent = formatNumber(total)+"₫";
}

// ---------- Save Cart ----------
function saveCart(){
  if(!window.currentTable) return;
  localStorage.setItem(`cart_${window.currentTable}`, JSON.stringify(window.cart));
  localStorage.setItem("last_table", window.currentTable);
  renderCart();  // refresh UI
}

// ---------- Load Cart ----------
window.loadTableCart = function(){
  const t = window.currentTable;
  window.cart = JSON.parse(localStorage.getItem(`cart_${t}`) || "[]");
  renderCart();
  if(previewInfo) previewInfo.textContent = t.replace(/table/i,"Table ");
};

// ---------- Add Item ----------
function addItem(name){
  const prod = (window.PRODUCTS||[]).find(p=>p.name===name);
  if(!prod) return;
  const qty = parseInt(qtyInput.value)||1;

  const existing = window.cart.find(c=>c.name===prod.name);
  if(existing) existing.qty += qty;
  else window.cart.push({name:prod.name, price:prod.price, qty});

  saveCart();
  searchInput.value = "";
  productDropdown.style.display = "none";
  qtyInput.value = 1;
}

// ---------- Remove Item ----------
window.removeItem = function(index){
  window.cart.splice(index,1);
  saveCart();
};

// ---------- Clear Cart ----------
clearBtn.addEventListener("click", ()=>{
  window.cart=[];
  saveCart();
});

// ---------- Dropdown Search ----------
searchInput.addEventListener("input", ()=>{
  const term = searchInput.value.toLowerCase().trim();
  productDropdown.innerHTML="";
  if(!term) return productDropdown.style.display="none";

  const matches = (window.PRODUCTS||[]).filter(p=>p.name.toLowerCase().includes(term));
  matches.forEach(p=>{
    const div=document.createElement("div");
    div.textContent=p.name;
    div.addEventListener("click", ()=>addItem(p.name));
    productDropdown.appendChild(div);
  });
  productDropdown.style.display = matches.length ? "block" : "none";
});

document.addEventListener("click", e=>{
  if(!searchInput.contains(e.target)) productDropdown.style.display="none";
});

// ---------- Table Switching ----------
document.querySelectorAll(".table-card").forEach(card=>{
  card.addEventListener("click", ()=>{
    document.querySelectorAll(".table-card").forEach(c=>c.classList.remove("active"));
    card.classList.add("active");
    window.currentTable = card.dataset.table;
    window.loadTableCart();
  });
});

// ---------- KOT / Invoice ----------
if(printKOTBtn){
  printKOTBtn.addEventListener("click", ()=>{
    const url = `kot_browser.html?table=${encodeURIComponent(window.currentTable)}`;
    window.open(url,"_blank");
  });
}
if(printInvBtn){
  printInvBtn.addEventListener("click", ()=>{
    const url = `invoice_browser.html?table=${encodeURIComponent(window.currentTable)}`;
    window.open(url,"_blank");
  });
}

// ---------- INIT ----------
window.loadTableCart();

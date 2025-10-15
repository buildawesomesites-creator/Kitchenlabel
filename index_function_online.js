// =================== Papadums POS — Online Sync Script ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let cart = [];
let currentTable = localStorage.getItem("last_table") || "table1";

// ---------- Elements ----------
const searchInput = document.getElementById("productSearch");
const qtyInput = document.getElementById("qty");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const previewBody = document.getElementById("previewBody");
const totalDisplay = document.getElementById("totalDisplay");
const tableCards = document.querySelectorAll(".table-card");
const previewInfo = document.getElementById("previewInfo");
const printKOT = document.getElementById("printKOT");
const printInv = document.getElementById("printInv");
const productDropdown = document.getElementById("productDropdown");
const syncStatus = document.getElementById("syncStatus");

// ---------- Format Number ----------
function formatNumber(num){ return isNaN(num)? num : num.toLocaleString(); }

// ---------- Blink Sync Indicator ----------
function blinkSyncIndicator(){ 
  if(!syncStatus) return; 
  syncStatus.classList.add("blinking-sync"); 
  setTimeout(()=>syncStatus.classList.remove("blinking-sync"),600); 
}

// ---------- Set Sync Status ----------
function setSyncState(state){
  if(!syncStatus) return;
  syncStatus.className = state;
  switch(state){
    case "online": syncStatus.textContent="✅ Synced"; break;
    case "offline": syncStatus.textContent="⚠️ Offline"; break;
    case "syncing": syncStatus.textContent="⏫ Syncing..."; break;
    case "local": syncStatus.textContent="🟪 Local"; break;
  }
}

// ---------- Render Cart ----------
function renderCart(){
  previewBody.innerHTML="";
  if(!cart.length){
    previewBody.innerHTML='<div style="text-align:center;color:#777;padding:16px">No items</div>';
  } else {
    cart.forEach((item,i)=>{
      const row=document.createElement("div");
      row.className="item-row";
      row.innerHTML=`
        <div class="item-left">${item.name}</div>
        <div class="item-right">
          <button class="qty-btn" data-i="${i}" data-type="minus">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-i="${i}" data-type="plus">+</button>
          <strong>${(item.price*item.qty).toLocaleString()}₫</strong>
          <button class="remove-btn" data-i="${i}">x</button>
        </div>
      `;
      previewBody.appendChild(row);
    });
  }
  const total = cart.reduce((sum,i)=>sum + i.price*i.qty,0);
  totalDisplay.textContent = total.toLocaleString()+"₫";
}

// ---------- Qty / Remove Buttons ----------
previewBody.addEventListener("click",e=>{
  const i=e.target.dataset.i;
  if(i===undefined) return;
  if(e.target.dataset.type==="plus") cart[i].qty++;
  else if(e.target.dataset.type==="minus" && cart[i].qty>1) cart[i].qty--;
  else if(e.target.classList.contains("remove-btn")) cart.splice(i,1);
  renderCart();
  saveTableCartOnline();
});

// ---------- Auto Add Product ----------
function autoAddProduct(){
  const name = searchInput.value.trim();
  const qty = parseInt(qtyInput.value || "1");
  const prod = window.products.find(p=>p.name.toLowerCase()===name.toLowerCase());
  if(!prod) return;
  const existing = cart.find(i=>i.name===prod.name);
  if(existing) existing.qty += qty;
  else cart.push({...prod,qty});
  renderCart();
  saveTableCartOnline();
  searchInput.value="";
  qtyInput.value=1;
}

// ---------- Add / Clear ----------
addBtn.addEventListener("click",()=>autoAddProduct());
clearBtn.addEventListener("click",()=>{
  if(confirm("Clear all items?")){
    cart=[];
    renderCart();
    saveTableCartOnline();
  }
});

// ---------- Search Dropdown ----------
searchInput.addEventListener("input",()=>{
  const term=searchInput.value.toLowerCase().trim();
  productDropdown.innerHTML="";
  if(!term) return productDropdown.style.display="none";

  const matches = window.products.filter(p=>p.name.toLowerCase().includes(term));
  matches.forEach(p=>{
    const div=document.createElement("div");
    div.textContent=p.name;
    div.addEventListener("click",()=>{
      searchInput.value=p.name;
      productDropdown.style.display="none";
      autoAddProduct();
    });
    productDropdown.appendChild(div);
  });
  productDropdown.style.display = matches.length?"block":"none";
});
document.addEventListener("click",e=>{
  if(!searchInput.contains(e.target)) productDropdown.style.display="none";
});

// ---------- Table Switching ----------
tableCards.forEach(card=>{
  card.addEventListener("click",()=>{
    tableCards.forEach(c=>c.classList.remove("active"));
    card.classList.add("active");
    currentTable = card.dataset.table;
    previewInfo.textContent = card.textContent.trim();
    loadTableCartOnline();
    blinkTable(card);
  });
});
function blinkTable(card){
  card.classList.add("blinking");
  setTimeout(()=>card.classList.remove("blinking"),1000);
  blinkSyncIndicator();
}

// ---------- Firestore Integration ----------
const tableDocRef = () => doc(db,"carts",currentTable);

// Load cart from Firestore (realtime)
function loadTableCartOnline(){
  setSyncState("syncing");
  const docRef = tableDocRef();
  onSnapshot(docRef,docSnap=>{
    if(docSnap.exists()){
      cart = docSnap.data().items||[];
      renderCart();
      setSyncState("online");
      blinkSyncIndicator();
      localStorage.setItem(`cart_${currentTable}`,JSON.stringify(cart)); // update local
    } else {
      cart=[];
      renderCart();
      setSyncState("local");
    }
  },err=>{
    console.error(err);
    setSyncState("offline");
  });
}

// Save cart to Firestore
function saveTableCartOnline(){
  setSyncState("syncing");
  const docRef = tableDocRef();
  setDoc(docRef,{items:cart}).then(()=>{
    setSyncState("online");
    blinkSyncIndicator();
    localStorage.setItem(`cart_${currentTable}`,JSON.stringify(cart)); // local backup
  }).catch(err=>{
    console.error(err);
    setSyncState("offline");
    localStorage.setItem(`cart_${currentTable}`,JSON.stringify(cart));
  });
}

// ---------- Save Order for Printing ----------
function saveOrderDataForPrint(){
  const orderData = {
    table: currentTable,
    time: new Date().toLocaleString("vi-VN",{hour12:false}),
    items: cart.map(i=>({name:i.name,qty:i.qty,price:i.price})),
    total: cart.reduce((s,i)=>s+i.qty*i.price,0)
  };
  localStorage.setItem("papadumsInvoiceData",JSON.stringify(orderData));
  console.log("💾 Order saved for print:",orderData);
}

// ---------- Footer Buttons ----------
printKOT.addEventListener("click",()=>{
  saveOrderDataForPrint();
  window.open("kot_browser.html","_blank");
});
printInv.addEventListener("click",()=>{
  saveOrderDataForPrint();
  window.open("invoice_browser.html","_blank");
});

// ---------- Full Preview Modal ----------
const previewPanel = document.getElementById("previewPanel");
const fullPreviewModal = document.getElementById("fullPreviewModal");
const fullPreviewContent = document.getElementById("fullPreviewContent");
const closePreview = document.getElementById("closePreview");

previewPanel.addEventListener("click",()=>{
  fullPreviewContent.innerHTML = previewBody.innerHTML+
  `<div style='padding:12px;font-weight:800;text-align:right;border-top:1px solid #eee;margin-top:10px;'>Total: ${totalDisplay.textContent}</div>`;
  fullPreviewModal.style.display="flex";
});
closePreview.onclick=()=>fullPreviewModal.style.display="none";
fullPreviewModal.addEventListener("click",e=>{
  if(e.target===fullPreviewModal) fullPreviewModal.style.display="none";
});

// ---------- CSS for blinking sync ----------
const style=document.createElement("style");
style.textContent=`
#syncStatus.blinking-sync {
  animation: blink 0.6s ease-in-out 1;
}
@keyframes blink {
  0% {opacity:1;color:limegreen;}
  50% {opacity:0.2;color:limegreen;}
  100% {opacity:1;color:limegreen;}
}`;
document.head.appendChild(style);

// ---------- Init ----------
(async ()=>{
  loadTableCartOnline();

  // ---------- Printer IP ----------
  const printerIpInput = document.getElementById("printerIp");
  const savedPrinterIp = localStorage.getItem("printer_ip");
  if(savedPrinterIp && printerIpInput) printerIpInput.value=savedPrinterIp;
  if(printerIpInput){
    printerIpInput.addEventListener("change",()=>{
      const ip = printerIpInput.value.trim();
      localStorage.setItem("printer_ip",ip);
      console.log("💾 Printer IP saved:",ip);
    });
  }
})();

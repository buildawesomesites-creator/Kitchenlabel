console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const defaultTables = ["Table 1","Table 2","Table 3","Online","Take Away"];
const syncStatus = document.getElementById("syncStatus");

// ---------- Sync Status ----------
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

// ---------- Sync single table ----------
async function syncTable(table){
  const cart = JSON.parse(localStorage.getItem(`cart_${table}`)||"[]");
  setSyncState("syncing");
  if(!navigator.onLine){
    setSyncState("offline");
    return;
  }

  try{
    await setDoc(doc(collection(db,"tables"),table),{
      items: cart,
      updatedAt: new Date().toISOString()
    });
    setSyncState("online");
    console.log(`☁️ Synced table ${table}`);
  }catch(e){
    console.warn("Sync failed:",e);
    setSyncState("offline");
  }
}

// ---------- Auto sync ----------
window.autoSync = function(){
  if(window.currentTable) syncTable(window.currentTable);
};

// ---------- Merge Firebase data ----------
async function mergeFirebaseTable(table, force=false){
  try{
    const docSnap = await getDoc(doc(db,"tables",table));
    const remoteCart = docSnap.exists()? docSnap.data().items||[] : [];
    const localCart = JSON.parse(localStorage.getItem(`cart_${table}`)||"[]");
    const merged = (force || localCart.length===0)? remoteCart : localCart;
    localStorage.setItem(`cart_${table}`,JSON.stringify(merged));
    if(window.currentTable===table && typeof window.loadTableCart==="function") window.loadTableCart();
    console.log(`🔄 Merged Firebase data for ${table}`);
  }catch(e){ console.warn("Merge failed",table,e);}
}

// ---------- Init Tables ----------
async function initTables(){
  defaultTables.forEach(t=>{
    if(!localStorage.getItem(`cart_${t}`)) localStorage.setItem(`cart_${t}`,"[]");
  });

  window.currentTable = localStorage.getItem("last_table") || "Table 1";
  await mergeFirebaseTable("Table 1", true);
  if(typeof window.loadTableCart==="function") window.loadTableCart();
}

// ---------- Real-time Listener ----------
function initRealtimeListener(){
  const ordersRef = collection(db,"tables");
  onSnapshot(ordersRef,snapshot=>{
    snapshot.docChanges().forEach(change=>{
      const table = change.doc.id;
      const data = change.doc.data();
      if(!data || !data.items) return;
      const localCart = JSON.parse(localStorage.getItem(`cart_${table}`)||"[]");
      if(JSON.stringify(localCart)!==JSON.stringify(data.items)){
        if(localCart.length===0) localStorage.setItem(`cart_${table}`,JSON.stringify(data.items));
        if(window.currentTable===table && typeof window.loadTableCart==="function") window.loadTableCart();
        console.log(`🔄 Remote update synced: ${table}`);
      }
    });
  });
}

// ---------- Online reconnect ----------
window.addEventListener("online", ()=>{
  console.log("🌐 Connection restored — syncing all tables");
  defaultTables.forEach(t=>mergeFirebaseTable(t));
  window.autoSync?.();
});

// ---------- INIT ----------
initTables();
initRealtimeListener();

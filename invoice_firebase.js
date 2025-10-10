// invoice_firebase.js
// --------------------------------------------
// 🔹 Papadums Invoice Firebase Integration
// 🔹 Developer: ChatGPT (for Papadums Indian Cuisine)
// 🔹 Project: invoiceapp-8026d
// --------------------------------------------

import { db } from "./firebase_config.js";
import {
  collection,
  addDoc,
  getDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// === AUTO LOAD INVOICE ===
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get("id");

  if (invoiceId) {
    await loadInvoice(invoiceId);
  } else {
    console.log("🔸 No invoice ID found — showing empty layout.");
  }
});

// === LOAD EXISTING INVOICE ===
async function loadInvoice(invoiceId) {
  try {
    const docRef = doc(db, "invoices", invoiceId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("✅ Invoice data loaded:", data);
      renderInvoice(data, invoiceId);
    } else {
      alert("Invoice not found in Firebase!");
    }
  } catch (error) {
    console.error("❌ Error loading invoice:", error);
  }
}

// === RENDER INVOICE ===
function renderInvoice(data, invoiceId) {
  document.getElementById("tableLabel").textContent = data.table || "-";
  document.getElementById("billLabel").textContent = invoiceId || "-";
  document.getElementById("timeInLabel").textContent = data.timeIn || "-";
  document.getElementById("timeOutLabel").textContent = data.timeOut || "-";

  const itemsList = document.getElementById("itemsList");
  itemsList.innerHTML = `
    <div class="row header">
      <div>Item Name</div>
      <div class="right">Price</div>
      <div class="right">Qty</div>
      <div class="right">Amount</div>
    </div>
  `;

  let total = 0;
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach(item => {
      const price = parseFloat(item.price) || 0;
      const qty = parseFloat(item.qty) || 0;
      const amount = price * qty;
      total += amount;

      itemsList.innerHTML += `
        <div class="row">
          <div>${item.name}</div>
          <div class="right">${price.toLocaleString()}</div>
          <div class="right">${qty}</div>
          <div class="right">${amount.toLocaleString()}</div>
        </div>`;
    });
  }

  const vat = total * 0.08;
  const discount = parseFloat(data.discount || 0);
  const grandTotal = total - discount + vat;

  document.getElementById("totalPrice").textContent = total.toLocaleString();
  document.getElementById("discountLabel").textContent = discount.toLocaleString();
  document.getElementById("vatAmount").textContent = vat.toLocaleString();
  document.getElementById("grandTotal").textContent = grandTotal.toLocaleString();

  // === Generate QR ===
  new QRious({
    element: document.getElementById("qrImg"),
    value: `https://invoiceapp-8026d.web.app/invoice_browser.html?id=${invoiceId}`,
    size: 80
  });
}

// === SAVE NEW INVOICE ===
export async function saveInvoice() {
  try {
    const invoiceData = {
      table: document.getElementById("tableLabel").textContent,
      timeIn: document.getElementById("timeInLabel").textContent,
      timeOut: document.getElementById("timeOutLabel").textContent,
      items: [],
      discount: 0,
      createdAt: serverTimestamp()
    };

    const itemsRows = document.querySelectorAll("#itemsList .row:not(.header)");
    itemsRows.forEach(row => {
      const cols = row.querySelectorAll("div");
      invoiceData.items.push({
        name: cols[0].textContent,
        price: cols[1].textContent.replace(/,/g, ""),
        qty: cols[2].textContent,
        amount: cols[3].textContent.replace(/,/g, "")
      });
    });

    const docRef = await addDoc(collection(db, "invoices"), invoiceData);
    alert(`✅ Invoice saved successfully: ${docRef.id}`);
  } catch (error) {
    console.error("❌ Error saving invoice:", error);
    alert("Failed to save invoice.");
  }
}
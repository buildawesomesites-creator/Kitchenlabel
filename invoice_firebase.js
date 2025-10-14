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

// === AUTO LOAD INVOICE ON PAGE OPEN ===
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get("id");

  if (invoiceId) {
    await loadInvoice(invoiceId);
  } else {
    console.log("🟡 No invoice ID found — showing empty layout.");
  }
});

// === LOAD EXISTING INVOICE FROM FIRESTORE ===
async function loadInvoice(invoiceId) {
  try {
    const docRef = doc(db, "invoices", invoiceId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("✅ Invoice loaded:", data);
      renderInvoice(data, invoiceId);
    } else {
      alert("⚠️ Invoice not found in Firebase!");
    }
  } catch (error) {
    console.error("❌ Error loading invoice:", error);
  }
}

// === RENDER INVOICE DATA INTO THE PAGE ===
function renderInvoice(data, invoiceId) {
  const $ = id => document.getElementById(id);

  $("#tableLabel").textContent = data.table || "-";
  $("#billLabel").textContent = invoiceId || "-";
  $("#timeInLabel").textContent = data.timeIn || "-";
  $("#timeOutLabel").textContent = data.timeOut || "-";

  const itemsList = $("#itemsList");
  itemsList.innerHTML = `
    <div class="row header">
      <div>Item Name</div>
      <div class="right">Price</div>
      <div class="right">Qty</div>
      <div class="right">Amount</div>
    </div>
  `;

  let total = 0;
  if (Array.isArray(data.items)) {
    for (const item of data.items) {
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
        </div>
      `;
    }
  }

  const vat = total * 0.08;
  const discount = parseFloat(data.discount || 0);
  const grandTotal = total - discount + vat;

  $("#totalPrice").textContent = total.toLocaleString();
  $("#discountLabel").textContent = discount.toLocaleString();
  $("#vatAmount").textContent = vat.toLocaleString();
  $("#grandTotal").textContent = grandTotal.toLocaleString();

  // === QR Code ===
  if (typeof QRious !== "undefined") {
    new QRious({
      element: $("#qrImg"),
      value: `https://invoiceapp-8026d.web.app/invoice_browser.html?id=${invoiceId}`,
      size: 80
    });
  }
}

// === SAVE NEW INVOICE TO FIRESTORE ===
export async function saveInvoice() {
  try {
    const $ = id => document.getElementById(id);

    const invoiceData = {
      table: $("#tableLabel").textContent,
      timeIn: $("#timeInLabel").textContent,
      timeOut: $("#timeOutLabel").textContent,
      items: [],
      discount: 0,
      createdAt: serverTimestamp()
    };

    const rows = document.querySelectorAll("#itemsList .row:not(.header)");
    rows.forEach(row => {
      const cols = row.querySelectorAll("div");
      invoiceData.items.push({
        name: cols[0].textContent.trim(),
        price: cols[1].textContent.replace(/,/g, ""),
        qty: cols[2].textContent.trim(),
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

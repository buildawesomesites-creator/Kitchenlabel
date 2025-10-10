// kot_store.js
// Handles Kitchen Order Ticket (KOT) data storage in Firebase

import { db } from "./firebase_config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Function to save new KOT
export async function saveKOT(orderData) {
  try {
    const docRef = await addDoc(collection(db, "kitchen_orders"), {
      table: orderData.table || "Unknown",
      staff: orderData.staff || "Chưa rõ",
      items: orderData.items || [],
      serviceCode: orderData.serviceCode || "0000",
      createdAt: serverTimestamp()
    });
    console.log("✅ KOT saved with ID:", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("❌ Error saving KOT:", e);
  }
}
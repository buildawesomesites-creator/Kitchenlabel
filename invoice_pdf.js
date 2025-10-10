<script type="module">
// ======= Papadums Invoice PDF Generator (58mm) =======
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import html2canvas from "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
import jsPDF from "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyBqkX9NYJD3SM8YcXf73P4IY9eT72KIyIw",
  authDomain: "invoiceapp-8026d.firebaseapp.com",
  projectId: "invoiceapp-8026d",
  storageBucket: "invoiceapp-8026d.firebasestorage.app",
  messagingSenderId: "871292464773",
  appId: "1:871292464773:web:8f288ebc5f9db3352243ec"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== Generate PDF (58mm) =====
export async function generateInvoicePDF(tableName = "No Table") {
  try {
    const docRef = doc(db, "tables", tableName);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return alert("No data found for this table.");

    const data = snap.data();
    const items = data.items || [];

    const vatPercent = 8;
    const discount = 0;

    // Calculate totals
    let total = 0;
    items.forEach(i => total += (i.price || 0) * (i.qty || 1));
    const vat = (total - discount) * vatPercent / 100;
    const grandTotal = total - discount + vat;

    // Build invoice HTML
    const html = `
    <div id="invoice" style="width:58mm;padding:6px;font-family:Arial,sans-serif;color:#000;background:#fff;">
      <div style="text-align:center;margin-bottom:6px;">
        <div style="font-weight:700;font-size:12px;">PAPADUMS INDIAN CUISINE</div>
        <div style="font-size:11px;">Address: 35 Tran Hung Dao, District 1, HCM</div>
        <div style="font-size:11px;">Phone: 0946 024 520</div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <div style="border:1px solid #000;padding:4px;border-radius:8px;font-size:12px;font-weight:700;">
          ${tableName}
        </div>
        <div style="text-align:center;font-size:12px;">
          <div style="font-weight:700">INVOICE</div>
          <div>Bill number: HD${Math.floor(Math.random()*10000)}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;">
        <div>Time in:<div style="font-size:11px;">${new Date().toLocaleString("en-GB")}</div></div>
        <div style="text-align:right;">Time out:<div style="font-size:11px;">${new Date().toLocaleString("en-GB")}</div></div>
      </div>

      <div style="margin-top:6px;">
        <div style="display:grid;grid-template-columns:1fr 60px 36px 60px;font-weight:700;border-bottom:1px solid #000;font-size:12px;">
          <div>Item Name</div><div style="text-align:right;">Price</div><div style="text-align:right;">Qty</div><div style="text-align:right;">Amount</div>
        </div>
        ${items.map(i => `
          <div style="display:grid;grid-template-columns:1fr 60px 36px 60px;border-bottom:1px dashed #ddd;font-size:12px;">
            <div>${i.name}</div>
            <div style="text-align:right;">${(i.price||0).toLocaleString()}</div>
            <div style="text-align:right;">${i.qty||1}</div>
            <div style="text-align:right;">${((i.price||0)*(i.qty||1)).toLocaleString()}</div>
          </div>`).join("")}
      </div>

      <div style="border-top:1px solid #000;margin-top:6px;padding-top:6px;">
        <div style="font-size:13px;">
          <div style="display:flex;justify-content:space-between;"><div>Total Price:</div><div>${total.toLocaleString()}</div></div>
          <div style="display:flex;justify-content:space-between;"><div>Discount:</div><div>${discount.toLocaleString()}</div></div>
          <div style="display:flex;justify-content:space-between;"><div>VAT ${vatPercent}%:</div><div>${vat.toLocaleString()}</div></div>
          <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px;margin-top:4px;"><div>Total:</div><div>${grandTotal.toLocaleString()}</div></div>
        </div>
      </div>

      <div style="text-align:center;margin-top:8px;font-size:11px;">
        <div style="font-weight:700;">PAPADUMS INDIAN CUISINE</div>
        <div>WiFi: Papadums Indian Cuisine 5G</div>
        <div>Password: everyday</div>
        <canvas id="qrImg" width="80" height="80" style="margin-top:4px;"></canvas>
        <div>Invoice includes VAT</div>
      </div>
    </div>`;

    // Create hidden iframe for rendering
    const iframe = document.createElement("iframe");
    iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.border = "none";
    document.body.appendChild(iframe);
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();

    // Wait for DOM to load
    await new Promise(r => setTimeout(r, 500));

    // Generate QR code
    const qrScript = document.createElement("script");
    qrScript.src = "https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js";
    iframe.contentDocument.body.appendChild(qrScript);
    qrScript.onload = async () => {
      const QRious = iframe.contentWindow.QRious;
      new QRious({
        element: iframe.contentDocument.getElementById("qrImg"),
        value: "https://www.papadumsindiancuisine.com",
        size: 80
      });

      // Wait for QR render
      await new Promise(r => setTimeout(r, 300));

      const invoiceEl = iframe.contentDocument.getElementById("invoice");
      const canvas = await html2canvas(invoiceEl, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "mm", format: [58, canvas.height * 58 / canvas.width] });
      pdf.addImage(imgData, "PNG", 0, 0, 58, canvas.height * 58 / canvas.width);

      const fileName = `Invoice_${tableName}_${new Date().toISOString().slice(0,16).replace(/[-T:]/g,"")}.pdf`;
      pdf.save(fileName);

      document.body.removeChild(iframe);
    };

  } catch (err) {
    console.error("Error generating invoice:", err);
    alert("Failed to generate invoice.");
  }
}
</script>
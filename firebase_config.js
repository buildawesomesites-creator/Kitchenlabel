// firebase_config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRc3dNn-OIidR2Qv6o9wvlpJ3Yx5vJzI4",
  authDomain: "invoiceapp-8026d.firebaseapp.com",
  projectId: "invoiceapp-8026d",
  storageBucket: "invoiceapp-8026d.appspot.com",
  messagingSenderId: "871292464773",
  appId: "1:871292464773:web:abf324b83a14f21ce2cd2f",
  measurementId: "G-4QMSJQKX8R"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

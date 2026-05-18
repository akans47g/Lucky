/* ============================================================
   add-money.js  —  SignalPro AI
   Firebase Firestore: submit UTR request + load history
   ============================================================ */

import { initializeApp }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, query,
         where, orderBy, getDocs, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ── 🔥 FIREBASE CONFIG — apna config yahan paste karo ── */
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

/* ── INIT ── */
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

/* ── HELPERS ── */
function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  void toast.offsetWidth;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 400);
  }, 3200);
}

function setSubmitLoading(loading) {
  const btn     = document.getElementById("submitBtn");
  const txtEl   = document.getElementById("submitBtnText");
  const spinner = document.getElementById("submitBtnSpinner");
  if (!btn) return;
  btn.disabled = loading;
  txtEl.textContent    = loading ? "Submitting…" : "Submit Request 🚀";
  spinner.classList.toggle("hidden", !loading);
}

/* ── STATUS ICON MAP ── */
function statusIcon(s) {
  return s === "approved" ? "✅" : s === "rejected" ? "❌" : "⏳";
}

/* ── RENDER HISTORY ── */
function renderHistory(docs) {
  const list  = document.getElementById("historyList");
  const count = document.getElementById("historyCount");
  if (!list) return;

  list.innerHTML = "";
  count.textContent = docs.length + " requests";

  if (docs.length === 0) {
    list.innerHTML = `<div class="hist-empty">📭 Abhi koi request nahi hai</div>`;
    return;
  }

  docs.forEach((docSnap, i) => {
    const d = docSnap.data();
    const date = d.createdAt?.toDate
      ? d.createdAt.toDate().toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })
      : "—";
    const status = (d.status || "pending").toLowerCase();

    const item = document.createElement("div");
    item.className = "hist-item";
    item.style.animationDelay = (i * 0.06) + "s";
    item.innerHTML = `
      <div class="hist-icon ${status}">${statusIcon(status)}</div>
      <div class="hist-body">
        <strong>₹${d.amount || "—"} &nbsp;→&nbsp; ${d.amount || "—"} 🪙</strong>
        <span>UTR: ${d.utr || "—"} &nbsp;·&nbsp; ${date}</span>
      </div>
      <span class="hist-status ${status}">${status}</span>
    `;
    list.appendChild(item);
  });
}

/* ── LOAD HISTORY ── */
async function loadHistory(uid) {
  try {
    const q = query(
      collection(db, "addMoneyRequests"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    renderHistory(snap.docs);
  } catch (err) {
    console.error("History load error:", err);
    const list = document.getElementById("historyList");
    if (list) list.innerHTML = `<div class="hist-empty">⚠️ History load nahi ho saki</div>`;
  }
}

/* ── SUBMIT UTR ── */
async function handleSubmit(uid, userEmail) {
  const amount  = document.getElementById("amountConfirm")?.value?.trim();
  const utr     = document.getElementById("utr")?.value?.trim();
  const app_val = document.getElementById("paymentApp")?.value || "UPI";

  /* Validation */
  if (!amount || Number(amount) < 25) {
    showToast("Pehle amount select karo (min ₹25) ⚡", "warn"); return;
  }
  if (!utr || utr.length < 6) {
    showToast("Valid UTR / Transaction ID dalo 🔢", "warn"); return;
  }

  setSubmitLoading(true);

  try {
    await addDoc(collection(db, "addMoneyRequests"), {
      uid,
      email:     userEmail || "",
      amount:    Number(amount),
      coins:     Number(amount),     /* 1 ₹ = 1 coin */
      utr,
      paymentApp: app_val,
      status:    "pending",
      createdAt: serverTimestamp(),
    });

    showToast("✅ Request submit ho gayi! 2-15 min mein coins milenge.", "success");

    /* Reset form */
    document.getElementById("amount").value        = "";
    document.getElementById("amountConfirm").value = "";
    document.getElementById("utr").value           = "";
    document.getElementById("paymentApp").value    = "UPI";
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("amountPreview")?.classList.add("hidden");

    /* Reload history */
    await loadHistory(uid);

  } catch (err) {
    console.error("Submit error:", err);
    showToast("❌ Submit failed. Internet check karo.", "error");
  } finally {
    setSubmitLoading(false);
  }
}

/* ── AUTH GATE ── */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    /* Not logged in — redirect to login/home */
    window.location.href = "index.html";
    return;
  }

  /* Save user info to localStorage for account page */
  localStorage.setItem("sp_uid",    user.uid);
  localStorage.setItem("sp_name",   user.displayName  || "SignalPro User");
  localStorage.setItem("sp_email",  user.email        || "");
  localStorage.setItem("sp_avatar", user.photoURL     || "");

  /* Load history */
  loadHistory(user.uid);

  /* Submit listener */
  document.getElementById("submitBtn")?.addEventListener("click", () => {
    handleSubmit(user.uid, user.email);
  });
});

/* ============================================================
   add-money.js — SignalPro AI
   FIXED: onSnapshot se real-time coin update
   Jaise hi admin approve kare → user ka balance instantly update
   ============================================================ */

import { initializeApp }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore,
         collection, doc,
         addDoc, query, where, orderBy, getDocs,
         onSnapshot,                              /* ← REAL-TIME */
         serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDh_fzIv1_YLP6X8DzjFdXvvFQv2sciFzU",
  authDomain:        "lucky-b3886.firebaseapp.com",
  projectId:         "lucky-b3886",
  storageBucket:     "lucky-b3886.firebasestorage.app",
  messagingSenderId: "314352804588",
  appId:             "1:314352804588:web:96697e2668a95c19affbc9"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
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
  btn.disabled      = loading;
  txtEl.textContent = loading ? "Submitting…" : "Submit Request 🚀";
  spinner.classList.toggle("hidden", !loading);
}

function statusIcon(s) {
  return s === "approved" ? "✅" : s === "rejected" ? "❌" : "⏳";
}

/* ════════════════════════════════════════
   COIN BALANCE — Real-time update
════════════════════════════════════════ */
function updateCoinDisplay(coins) {
  const el = document.getElementById("coinBalance");
  if (!el) return;

  /* Animate counter */
  const current = parseInt(el.textContent.replace(/[^\d]/g, "")) || 0;
  const target  = parseInt(coins) || 0;

  if (target === current) return;

  /* Flash green if coins increased */
  if (target > current) {
    el.style.transition = "color .3s";
    el.style.color      = "#00e676";
    setTimeout(() => { el.style.color = ""; }, 1500);
  }

  /* Animate number */
  const diff    = target - current;
  const steps   = 30;
  const stepVal = diff / steps;
  let   cur     = current;
  let   count   = 0;

  const iv = setInterval(() => {
    cur += stepVal;
    count++;
    el.textContent = "₹" + Math.round(cur);
    if (count >= steps) {
      el.textContent = "₹" + target;
      clearInterval(iv);
    }
  }, 20);

  /* Update bar */
  const bar = document.getElementById("coinBar");
  if (bar) {
    const pct = Math.min(100, (target / 5000) * 100);
    bar.style.width = pct + "%";
  }

  /* Save to localStorage */
  localStorage.setItem("sp_coins", target);
}

/* ════════════════════════════════════════
   RENDER HISTORY
════════════════════════════════════════ */
function renderHistory(docs) {
  const list  = document.getElementById("historyList");
  const count = document.getElementById("historyCount");
  if (!list) return;

  list.innerHTML    = "";
  count.textContent = docs.length + " requests";

  if (docs.length === 0) {
    list.innerHTML = `<div class="hist-empty">📭 Abhi koi request nahi hai</div>`;
    return;
  }

  docs.forEach((docSnap, i) => {
    const d      = docSnap.data();
    const date   = d.createdAt?.toDate
      ? d.createdAt.toDate().toLocaleString("en-IN", {
          day:"2-digit", month:"short",
          hour:"2-digit", minute:"2-digit"
        })
      : "—";
    const status = (d.status || "pending").toLowerCase();

    const item = document.createElement("div");
    item.className          = "hist-item";
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

/* ════════════════════════════════════════
   LOAD HISTORY (one-time)
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   REAL-TIME LISTENER — user document
   Jaise hi admin approve kare aur coins update ho
   → yeh function turant fire hoga
   → user ka balance screen pe update hoga
════════════════════════════════════════ */
let _unsubscribeUser = null;

function startUserListener(uid) {
  /* Pehle wala listener band karo */
  if (_unsubscribeUser) _unsubscribeUser();

  _unsubscribeUser = onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      if (!snap.exists()) return;
      const data  = snap.data();
      const coins = data.coins ?? 0;

      /* Coin balance update */
      updateCoinDisplay(coins);

      /* Agar naya coin amount aaya (approved hua) → toast dikhao */
      const prevCoins = parseInt(localStorage.getItem("sp_coins") || "0");
      if (coins > prevCoins && prevCoins >= 0) {
        const added = coins - prevCoins;
        showToast(`✅ +${added} coins add ho gaye! Balance: ₹${coins}`, "success");

        /* History bhi refresh karo */
        loadHistory(uid);
      }
    },
    (err) => {
      console.error("User listener error:", err);
    }
  );
}

/* ════════════════════════════════════════
   SUBMIT UTR
════════════════════════════════════════ */
async function handleSubmit(uid, userEmail) {
  const amount  = document.getElementById("amountConfirm")?.value?.trim();
  const utr     = document.getElementById("utr")?.value?.trim();
  const app_val = document.getElementById("paymentApp")?.value || "UPI";

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
      email:      userEmail || "",
      amount:     Number(amount),
      coins:      Number(amount),
      utr,
      paymentApp: app_val,
      status:     "pending",
      createdAt:  serverTimestamp(),
    });

    showToast("✅ Request submit ho gayi! Admin approve karte hi coins milenge.", "success");

    /* Reset form */
    document.getElementById("amount").value        = "";
    document.getElementById("amountConfirm").value = "";
    document.getElementById("utr").value           = "";
    document.getElementById("paymentApp").value    = "UPI";
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("amountPreview")?.classList.add("hidden");

    await loadHistory(uid);

  } catch (err) {
    console.error("Submit error:", err);
    showToast("❌ Submit failed. Internet check karo.", "error");
  } finally {
    setSubmitLoading(false);
  }
}

/* ════════════════════════════════════════
   AUTH — Entry point
════════════════════════════════════════ */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    const list = document.getElementById("historyList");
    if (list) list.innerHTML = `<div class="hist-empty">📭 Login karke history dekhein</div>`;

    document.getElementById("submitBtn")?.addEventListener("click", () => {
      showToast("⚠️ Pehle login karo", "warn");
      setTimeout(() => { window.location.href = "login.html"; }, 1500);
    });
    return;
  }

  /* Save to localStorage */
  localStorage.setItem("sp_uid",    user.uid);
  localStorage.setItem("sp_name",   user.displayName || "SignalPro User");
  localStorage.setItem("sp_email",  user.email       || "");
  localStorage.setItem("sp_avatar", user.photoURL    || "");

  /* ★ START REAL-TIME LISTENER — coins update hote hi screen update hoga */
  startUserListener(user.uid);

  /* Load history */
  loadHistory(user.uid);

  /* Submit button */
  document.getElementById("submitBtn")?.addEventListener("click", () => {
    handleSubmit(user.uid, user.email);
  });
});

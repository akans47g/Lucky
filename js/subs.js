/* ============================================================
   subs.js — SignalPro AI
   - User ke coins check karo
   - Plan purchase: Firestore mein save + coins cut
   - Active plan load karo + countdown
   - Admin panel mein: users/{uid} ka plan field dekh sakte ho
   ============================================================ */

import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore,
         doc, getDoc, updateDoc, setDoc,
         serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ── CONFIG ── */
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

/* ── PLAN CONFIG ── */
const PLAN_CONFIG = {
  '7days':  { name:'7 Days Trial',    coins:259,  days:7  },
  '14days': { name:'14 Days',         coins:499,  days:14 },
  '28days': { name:'28 Days Premium', coins:949,  days:28 },
  '56days': { name:'56 Days Elite',   coins:1799, days:56 },
};

/* ── helpers ── */
function pad2(n){ return String(n).padStart(2,'0'); }

/* ── Load user data from Firestore ── */
async function loadUser(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data();
  } catch(e) {
    console.error('loadUser:', e);
    return null;
  }
}

/* ── Show coin balance ── */
function showCoins(coins) {
  const el = document.getElementById('coinDisplay');
  if (!el) return;
  let cur = 0;
  const target = parseInt(coins) || 0;
  if (target === 0) { el.textContent = '0'; return; }
  const step = Math.max(1, Math.ceil(target / 50));
  const iv = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(iv); }
    el.textContent = cur;
  }, 18);
}

/* ── Show active plan + countdown ── */
function showActivePlan(data) {
  const card = document.getElementById('activePlanCard');

  /* Check if plan exists and not expired */
  if (!data.plan || data.plan === 'free' || !data.planExpiresAt) {
    card.style.display = 'none';
    return;
  }

  const expiresAt = data.planExpiresAt.toMillis
    ? data.planExpiresAt.toMillis()
    : new Date(data.planExpiresAt).getTime();

  if (Date.now() >= expiresAt) {
    card.style.display = 'none';
    return;
  }

  /* Show card */
  card.style.display = 'block';
  document.getElementById('activePlanName').textContent = data.planName || data.plan;

  const expDate = new Date(expiresAt);
  document.getElementById('apcExpires').textContent =
    '⏳ Expires: ' + expDate.toLocaleDateString('en-IN', {
      day:'2-digit', month:'short', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    });

  /* Start countdown */
  window.startCountdown(expiresAt);
}

/* ── Update UI after purchase ── */
function refreshUI(uid) {
  loadUser(uid).then(data => {
    if (!data) return;
    const coins = data.coins ?? 0;
    localStorage.setItem('sp_coins', coins);
    localStorage.setItem('sp_plan',  data.plan  || 'free');
    showCoins(coins);
    showActivePlan(data);
  });
}

/* ── EXECUTE PURCHASE (called from HTML) ── */
window.executePurchase = async function() {
  const card = window._pendingCard;
  if (!card) return;

  const user = window._currentUser || auth.currentUser;
  if (!user) {
    window.showToast('⚠️ Pehle login karo', 'warn');
    setTimeout(() => window.location.href = 'login.html', 1200);
    return;
  }

  const planId  = card.dataset.plan;
  const cfg     = PLAN_CONFIG[planId];
  if (!cfg) return;

  /* Disable confirm button */
  const okBtn = document.getElementById('confirmOkBtn');
  const okTxt = document.getElementById('confirmOkTxt');
  const okSp  = document.getElementById('confirmSpinner');
  okBtn.disabled = true;
  okTxt.textContent = 'Processing…';
  okSp.classList.remove('hidden');

  try {
    /* Fresh read from Firestore */
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const userData  = userSnap.exists() ? userSnap.data() : {};
    const curCoins  = parseInt(userData.coins ?? 0);

    /* Double-check coins */
    if (curCoins < cfg.coins) {
      window.closeConfirm();
      window.openNoCoinModal(curCoins, cfg.coins);
      return;
    }

    /* Calculate expiry */
    const now       = Date.now();
    const expiresAt = new Date(now + cfg.days * 24 * 60 * 60 * 1000);
    const newCoins  = curCoins - cfg.coins;

    /* Update Firestore */
    await updateDoc(doc(db, 'users', user.uid), {
      coins:         newCoins,
      plan:          planId,
      planName:      cfg.name,
      planDays:      cfg.days,
      planActivatedAt: serverTimestamp(),
      planExpiresAt: expiresAt,
      updatedAt:     serverTimestamp(),
    });

    /* Update localStorage */
    localStorage.setItem('sp_coins', newCoins);
    localStorage.setItem('sp_plan',  planId);
    localStorage.setItem('sp_planName', cfg.name);
    localStorage.setItem('sp_planExpires', expiresAt.getTime());

    /* Close modal + refresh UI */
    window.closeConfirm();
    window.showToast(`🎉 ${cfg.name} activate ho gaya! Enjoy VIP Access.`, 'success');
    refreshUI(user.uid);

  } catch(e) {
    console.error('Purchase error:', e);
    window.showToast('❌ Kuch galat hua: ' + e.message, 'error');
  } finally {
    okBtn.disabled  = false;
    okTxt.textContent = '✅ Confirm';
    okSp.classList.add('hidden');
    window._pendingCard = null;
  }
};

/* ── GLOBAL state ── */
window._firestoreCoins = 0;
window._currentUser    = null;

/* ── AUTH + INIT ── */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showCoins(0);
    window._firestoreCoins = 0;
    window._currentUser    = null;
    return;
  }

  window._currentUser = user;
  localStorage.setItem('sp_uid',   user.uid);
  localStorage.setItem('sp_name',  user.displayName || 'SignalPro User');
  localStorage.setItem('sp_email', user.email || '');

  /* Load Firestore data — FRESH read */
  const data = await loadUser(user.uid);
  if (!data) {
    await setDoc(doc(db, 'users', user.uid), {
      uid:       user.uid,
      name:      user.displayName || 'SignalPro User',
      email:     user.email || '',
      avatar:    user.photoURL || '',
      coins:     0,
      plan:      'free',
      createdAt: serverTimestamp(),
    });
    window._firestoreCoins = 0;
    showCoins(0);
    return;
  }

  const coins = data.coins ?? 0;
  window._firestoreCoins = coins;   /* Always fresh from Firestore */
  localStorage.setItem('sp_coins', coins);
  localStorage.setItem('sp_plan',  data.plan || 'free');

  showCoins(coins);
  showActivePlan(data);
});

/* ============================================================
   admin.js — SignalPro AI Admin Panel
   Firebase logic: Auth check, Requests, Users, Reviews, Settings
   Admin Email: akans47g@gmail.com
   ============================================================ */

import { initializeApp }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore,
         collection, doc,
         getDoc, getDocs, updateDoc, deleteDoc, setDoc,
         query, where, orderBy, limit, startAfter,
         serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ══════════════════════════════════════════
   CONFIG
══════════════════════════════════════════ */
const ADMIN_EMAIL = "akans47g@gmail.com";

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

/* ══════════════════════════════════════════
   PLAN CONFIG
══════════════════════════════════════════ */
const PLANS = {
  '7days':  { name:'7 Days Trial',    days:7  },
  '14days': { name:'14 Days',         days:14 },
  '28days': { name:'28 Days Premium', days:28 },
  '56days': { name:'56 Days Elite',   days:56 },
};

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let allUsers = [], allReqs = [], allRevs = [];
let reqFilter = 'pending', userFilter = 'all', revFilter = 'all';
let reqCursor = null, userCursor = null, revCursor = null;
let pendingReqId = null, pendingUserId = null, pendingRevId = null;
let _approveData = {};

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const COLORS = ['#9c6fff','#ff9100','#00e676','#f5c518','#ff4757','#00bcd4','#e91e63','#4caf50'];
function avatarColor(s){ let h=0; for(let c of (s||'A')) h=(h*31+c.charCodeAt(0))%COLORS.length; return COLORS[h]; }
function initials(n='U'){ const p=(n||'U').split(' '); return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase(); }

function timeAgo(ts){
  if(!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if(diff < 60000)   return 'Just now';
  if(diff < 3600000) return Math.floor(diff/60000)+'m ago';
  if(diff < 86400000)return Math.floor(diff/3600000)+'h ago';
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
}

function fmtDate(ts){
  if(!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}

function expiryMs(ts){
  if(!ts) return 0;
  return ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
}

function toast(msg, t='i'){ window.showToast(msg, t); }

function setBtnLoading(btnId, txtId, spId, loading, resetTxt=''){
  const btn = document.getElementById(btnId);
  const txt = document.getElementById(txtId);
  const sp  = document.getElementById(spId);
  if(!btn) return;
  btn.disabled = loading;
  if(!loading && resetTxt) txt.textContent = resetTxt;
  sp.classList.toggle('hidden', !loading);
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
async function loadDashboard(){
  try {
    const [uSnap, rSnap] = await Promise.all([
      getDocs(collection(db,'users')),
      getDocs(collection(db,'addMoneyRequests'))
    ]);

    const users   = uSnap.docs.map(d=>({id:d.id,...d.data()}));
    const reqs    = rSnap.docs.map(d=>({id:d.id,...d.data()}));
    const now     = Date.now();
    const vips    = users.filter(u => expiryMs(u.planExpiresAt) > now).length;
    const pending = reqs.filter(r => r.status === 'pending').length;
    const revenue = reqs.filter(r => r.status === 'approved')
                        .reduce((s,r) => s+(r.amount||0), 0);

    document.getElementById('s-users').textContent   = users.length;
    document.getElementById('s-vips').textContent    = vips;
    document.getElementById('s-pending').textContent = pending;
    document.getElementById('s-revenue').textContent = '₹'+revenue.toLocaleString('en-IN');

    /* Pending badge on tab */
    const badge = document.getElementById('pendingBadge');
    if(pending > 0){ badge.textContent = pending; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');

    /* Recent activity — last 5 requests */
    const recent = reqs
      .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
      .slice(0, 5);

    const actEl = document.getElementById('recentActivity');
    if(!recent.length){
      actEl.innerHTML = '<div class="empty-state"><div class="ei">📭</div><p>Koi request nahi abhi</p></div>';
      return;
    }
    actEl.innerHTML = recent.map(r=>`
      <div class="act-item">
        <span class="act-icon">${r.status==='approved'?'✅':r.status==='rejected'?'❌':'⏳'}</span>
        <div class="act-body">
          <strong>${r.email || r.uid?.slice(0,8) || 'User'}</strong>
          <span>${timeAgo(r.createdAt)} · ${r.paymentApp||'UPI'}</span>
        </div>
        <span class="act-amt">₹${r.amount||0}</span>
      </div>`).join('');

  } catch(e){
    console.error('Dashboard error:', e);
    toast('Dashboard load failed','e');
  }
}

/* ══════════════════════════════════════════
   ADD MONEY REQUESTS
══════════════════════════════════════════ */
async function loadRequests(reset=true){
  if(reset){ reqCursor = null; allReqs = []; }
  try {
    let q;
    if(reqFilter === 'all'){
      q = query(collection(db,'addMoneyRequests'), orderBy('createdAt','desc'), limit(20));
    } else {
      q = query(collection(db,'addMoneyRequests'),
          where('status','==',reqFilter),
          orderBy('createdAt','desc'),
          limit(20));
    }
    if(reqCursor) q = query(q, startAfter(reqCursor));

    const snap = await getDocs(q);
    reqCursor  = snap.docs[snap.docs.length-1];
    const newItems = snap.docs.map(d=>({id:d.id,...d.data()}));
    allReqs = reset ? newItems : [...allReqs, ...newItems];

    document.getElementById('reqCount').textContent = allReqs.length+(snap.docs.length===20?'+':'');
    document.getElementById('reqLoadMore').classList.toggle('hidden', snap.docs.length < 20);
    renderRequests();
  } catch(e){
    console.error('Requests error:', e);
    document.getElementById('reqList').innerHTML =
      '<div class="empty-state"><div class="ei">⚠️</div><p>Load failed. Firestore index check karo:<br><strong>status ASC + createdAt DESC</strong></p></div>';
  }
}

function renderRequests(){
  const el = document.getElementById('reqList');
  if(!allReqs.length){
    el.innerHTML = '<div class="empty-state"><div class="ei">📭</div><p>Is filter mein koi request nahi</p></div>';
    return;
  }
  el.innerHTML = allReqs.map((r,i) => `
    <div class="req-card status-${r.status||'pending'}" style="animation-delay:${i*.04}s">
      <div class="req-top">
        <div class="req-user">
          <div class="req-avatar" style="background:${avatarColor(r.email)}">${initials(r.email)}</div>
          <div>
            <div class="req-name">${r.email||'Unknown'}</div>
            <div class="req-email">${timeAgo(r.createdAt)}</div>
          </div>
        </div>
        <span class="status-pill pill-${r.status||'pending'}">${r.status||'pending'}</span>
      </div>
      <div class="req-details">
        <div class="req-detail-item"><div class="rdl">Amount</div><div class="rdv gold">₹${r.amount||0}</div></div>
        <div class="req-detail-item"><div class="rdl">Coins</div><div class="rdv green">+${r.coins||r.amount||0} 🪙</div></div>
        <div class="req-detail-item"><div class="rdl">UTR</div><div class="rdv">${r.utr||'—'}</div></div>
        <div class="req-detail-item"><div class="rdl">App</div><div class="rdv">${r.paymentApp||'UPI'}</div></div>
      </div>
      ${r.status==='pending' ? `
        <div class="req-actions">
          <button class="btn-approve"
            onclick="window.openApprove('${r.id}','${(r.email||'').replace(/'/g,"\\'")}',${r.amount||0},${r.coins||r.amount||0},'${r.utr||''}','${r.uid}')">
            ✅ Approve
          </button>
          <button class="btn-reject" onclick="window.openReject('${r.id}')">❌ Reject</button>
        </div>` : ''}
      ${r.status==='rejected' && r.rejectReason ?
        `<div style="font-size:11px;color:var(--red);margin-top:6px;padding:6px 10px;background:rgba(255,71,87,.08);border-radius:8px">
          Reason: ${r.rejectReason}
        </div>` : ''}
    </div>`).join('');
}

window.openApprove = (id, email, amount, coins, utr, uid) => {
  _approveData = { id, uid, coins, amount };
  document.getElementById('ap-user').textContent   = email;
  document.getElementById('ap-amount').textContent = '₹' + amount;
  document.getElementById('ap-utr').textContent    = utr || '—';
  document.getElementById('ap-coins').textContent  = coins;
  document.getElementById('approveModal').classList.add('open');
};

window.executeApprove = async () => {
  const { id, uid, coins, amount } = _approveData;
  if(!id) return;
  setBtnLoading('approveOkBtn','approveTxt','approveSpinner', true);
  try {
    const userRef  = doc(db,'users',uid);
    const userSnap = await getDoc(userRef);
    const curCoins = userSnap.exists() ? (userSnap.data().coins||0) : 0;
    await updateDoc(userRef, { coins: curCoins+coins, updatedAt: serverTimestamp() });
    await updateDoc(doc(db,'addMoneyRequests',id), {
      status: 'approved',
      approvedAt: serverTimestamp()
    });
    window.closeModal('approveModal');
    toast(`✅ ₹${amount} approved! ${coins} coins added to user.`, 's');
    loadRequests();
    loadDashboard();
  } catch(e){
    console.error(e);
    toast('Approve failed: ' + e.message, 'e');
  } finally {
    setBtnLoading('approveOkBtn','approveTxt','approveSpinner', false, '✅ Approve');
  }
};

window.openReject = (id) => {
  pendingReqId = id;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectModal').classList.add('open');
};

window.executeReject = async () => {
  if(!pendingReqId) return;
  const reason = document.getElementById('rejectReason').value.trim();
  try {
    await updateDoc(doc(db,'addMoneyRequests',pendingReqId), {
      status: 'rejected',
      rejectReason: reason || '',
      rejectedAt: serverTimestamp()
    });
    window.closeModal('rejectModal');
    toast('❌ Request rejected', 'w');
    loadRequests();
    loadDashboard();
  } catch(e){ toast('Reject failed: ' + e.message, 'e'); }
};

window.setReqFilter = (f, btn) => {
  reqFilter = f;
  document.querySelectorAll('#sec-req .f-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadRequests();
};

window.loadMoreReqs = () => loadRequests(false);

/* ══════════════════════════════════════════
   USERS
══════════════════════════════════════════ */
async function loadUsers(reset=true){
  if(reset){ userCursor = null; allUsers = []; }
  try {
    let q = query(collection(db,'users'), orderBy('createdAt','desc'), limit(20));
    if(userCursor) q = query(q, startAfter(userCursor));
    const snap = await getDocs(q);
    userCursor = snap.docs[snap.docs.length-1];
    const newItems = snap.docs.map(d=>({id:d.id,...d.data()}));
    allUsers = reset ? newItems : [...allUsers, ...newItems];
    document.getElementById('userCount').textContent = allUsers.length+(snap.docs.length===20?'+':'');
    document.getElementById('userLoadMore').classList.toggle('hidden', snap.docs.length < 20);
    renderUsers();
  } catch(e){
    console.error(e);
    document.getElementById('userList').innerHTML =
      '<div class="empty-state"><div class="ei">⚠️</div><p>Load failed</p></div>';
  }
}

function renderUsers(){
  const el  = document.getElementById('userList');
  const q   = (document.getElementById('userSearch').value||'').toLowerCase();
  const now = Date.now();

  let list = allUsers.filter(u => {
    if(q && !(u.name||'').toLowerCase().includes(q) && !(u.email||'').toLowerCase().includes(q)) return false;
    if(userFilter==='vip')    return expiryMs(u.planExpiresAt) > now;
    if(userFilter==='free')   return !u.plan||u.plan==='free'||expiryMs(u.planExpiresAt)<=now;
    if(userFilter==='banned') return u.banned;
    return true;
  });

  if(!list.length){
    el.innerHTML = '<div class="empty-state"><div class="ei">👥</div><p>No users found</p></div>';
    return;
  }

  el.innerHTML = list.map((u,i) => {
    const isVip    = expiryMs(u.planExpiresAt) > now;
    const isBanned = u.banned;
    const statusCls = isBanned ? 'us-banned' : isVip ? 'us-active' : 'us-free';
    const statusLbl = isBanned ? 'Banned'    : isVip ? 'VIP Active': 'Free';
    return `
    <div class="user-card" style="animation-delay:${i*.04}s">
      <div class="user-top">
        <div class="user-avatar" style="background:${avatarColor(u.email)}">${initials(u.name||u.email)}</div>
        <div class="user-info">
          <div class="user-name">${u.name||'—'}</div>
          <div class="user-email">${u.email||u.id}</div>
        </div>
        <span class="user-status ${statusCls}">${statusLbl}</span>
      </div>
      <div class="user-meta">
        <div class="um-item"><div class="um-lbl">Coins</div><div class="um-val gold">${u.coins||0}🪙</div></div>
        <div class="um-item"><div class="um-lbl">Plan</div>
          <div class="um-val ${isVip?'green':''}">${isVip?(u.planName||u.plan||'VIP'):'Free'}</div></div>
        <div class="um-item"><div class="um-lbl">Expires</div>
          <div class="um-val ${isVip?'':'red'}">${isVip?fmtDate(u.planExpiresAt):'—'}</div></div>
      </div>
      <div class="user-actions">
        <button class="ua-btn ua-coins"
          onclick="window.openCoinsModal('${u.id}','${(u.name||u.email||'').replace(/'/g,"\\'")}',${u.coins||0})">
          🪙 Coins
        </button>
        <button class="ua-btn ua-plan"
          onclick="window.openPlanModal('${u.id}','${(u.name||u.email||'').replace(/'/g,"\\'")}')">
          💎 Plan
        </button>
        ${isBanned
          ? `<button class="ua-btn ua-unban" onclick="window.toggleBan('${u.id}',false)">✅ Unban</button>`
          : `<button class="ua-btn ua-ban"   onclick="window.toggleBan('${u.id}',true)">🚫 Ban</button>`}
      </div>
    </div>`;
  }).join('');
}

window.filterUsers   = renderUsers;
window.setUserFilter = (f, btn) => {
  userFilter = f;
  document.querySelectorAll('#sec-users .f-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderUsers();
};
window.loadMoreUsers = () => loadUsers(false);

/* Edit Coins */
window.openCoinsModal = (uid, name, cur) => {
  pendingUserId = uid;
  document.getElementById('ec-user').textContent    = name;
  document.getElementById('ec-current').textContent = cur + ' 🪙';
  document.getElementById('ec-new').value           = cur;
  document.getElementById('coinsModal').classList.add('open');
};

window.executeEditCoins = async () => {
  const newCoins = parseInt(document.getElementById('ec-new').value);
  if(isNaN(newCoins) || newCoins < 0){ toast('Valid amount dalo','w'); return; }
  setBtnLoading('coinsOkBtn','coinsTxt','coinsSpinner', true);
  try {
    await updateDoc(doc(db,'users',pendingUserId), {
      coins: newCoins,
      updatedAt: serverTimestamp()
    });
    window.closeModal('coinsModal');
    toast('🪙 Coins update ho gaye!', 's');
    loadUsers();
  } catch(e){ toast('Failed: ' + e.message, 'e'); }
  finally{ setBtnLoading('coinsOkBtn','coinsTxt','coinsSpinner', false, '💾 Save'); }
};

/* Set Plan */
window.openPlanModal = (uid, name) => {
  pendingUserId = uid;
  document.getElementById('sp-user').textContent = name;
  const d = new Date(Date.now() + 28*86400000);
  document.getElementById('sp-expiry').value = d.toISOString().slice(0,16);
  document.getElementById('planModal').classList.add('open');
};

window.executeSetPlan = async () => {
  const planId = document.getElementById('sp-plan').value;
  const expiry = document.getElementById('sp-expiry').value;
  setBtnLoading('planOkBtn','planTxt','planSpinner', true);
  try {
    const cfg = PLANS[planId];
    if(planId === 'free'){
      await updateDoc(doc(db,'users',pendingUserId), {
        plan:'free', planName:'Free',
        planExpiresAt: null,
        updatedAt: serverTimestamp()
      });
    } else {
      const expiryDate = expiry ? new Date(expiry) : new Date(Date.now()+(cfg?.days||7)*86400000);
      await updateDoc(doc(db,'users',pendingUserId), {
        plan: planId,
        planName: cfg?.name || planId,
        planDays: cfg?.days || 7,
        planActivatedAt: serverTimestamp(),
        planExpiresAt: expiryDate,
        updatedAt: serverTimestamp()
      });
    }
    window.closeModal('planModal');
    toast('⚡ Plan set ho gaya!', 's');
    loadUsers();
  } catch(e){ toast('Failed: ' + e.message, 'e'); }
  finally{ setBtnLoading('planOkBtn','planTxt','planSpinner', false, '⚡ Activate'); }
};

/* Ban / Unban */
window.toggleBan = async (uid, ban) => {
  if(ban && !confirm('Iss user ko ban karna chahte ho?')) return;
  try {
    await updateDoc(doc(db,'users',uid), { banned: ban, updatedAt: serverTimestamp() });
    toast(ban ? '🚫 User banned' : '✅ User unbanned', ban ? 'w' : 's');
    loadUsers();
  } catch(e){ toast('Failed','e'); }
};

/* Manual plan from Settings tab */
window.manualActivatePlan = async () => {
  const uid    = document.getElementById('manualPlanUser').value.trim();
  const planId = document.getElementById('manualPlanSelect').value;
  if(!uid){ toast('UID dalo','w'); return; }
  try {
    const cfg = PLANS[planId];
    const expiryDate = new Date(Date.now()+(cfg?.days||7)*86400000);
    await updateDoc(doc(db,'users',uid), {
      plan: planId,
      planName: cfg?.name || planId,
      planDays: cfg?.days || 7,
      planActivatedAt: serverTimestamp(),
      planExpiresAt: expiryDate,
      updatedAt: serverTimestamp()
    });
    toast('⚡ Plan activate ho gaya!', 's');
    document.getElementById('manualPlanUser').value = '';
    loadUsers();
  } catch(e){ toast('Failed: ' + e.message + ' — UID check karo','e'); }
};

/* ══════════════════════════════════════════
   REVIEWS
══════════════════════════════════════════ */
async function loadReviews(reset=true){
  if(reset){ revCursor = null; allRevs = []; }
  try {
    let q = query(collection(db,'reviews'), orderBy('createdAt','desc'), limit(20));
    if(revCursor) q = query(q, startAfter(revCursor));
    const snap = await getDocs(q);
    revCursor  = snap.docs[snap.docs.length-1];
    const newItems = snap.docs.map(d=>({id:d.id,...d.data()}));
    allRevs = reset ? newItems : [...allRevs, ...newItems];
    document.getElementById('revCount').textContent = allRevs.length+(snap.docs.length===20?'+':'');
    document.getElementById('revLoadMore').classList.toggle('hidden', snap.docs.length < 20);
    renderReviews();
  } catch(e){
    console.error(e);
    document.getElementById('revList').innerHTML =
      '<div class="empty-state"><div class="ei">⚠️</div><p>Load failed</p></div>';
  }
}

function renderReviews(){
  const el = document.getElementById('revList');
  const q  = (document.getElementById('revSearch').value||'').toLowerCase();

  let list = allRevs.filter(r => {
    if(revFilter !== 'all' && String(r.stars) !== revFilter) return false;
    if(q && !(r.name||'').toLowerCase().includes(q) && !(r.text||'').toLowerCase().includes(q)) return false;
    return true;
  });

  if(!list.length){
    el.innerHTML = '<div class="empty-state"><div class="ei">⭐</div><p>No reviews found</p></div>';
    return;
  }

  el.innerHTML = list.map((r,i) => `
    <div class="rev-card s${r.stars||5}" style="animation-delay:${i*.04}s">
      <div class="rev-top">
        <div class="rev-user">
          <div class="rev-avatar" style="background:${avatarColor(r.name)}">${initials(r.name)}</div>
          <div>
            <div class="rev-name">${r.name||'Anonymous'}</div>
            <div class="rev-stars">${'⭐'.repeat(r.stars||5)}</div>
          </div>
        </div>
        <span style="font-size:11px;color:var(--gray)">${timeAgo(r.createdAt)}</span>
      </div>
      <div class="rev-text">${r.text||'—'}</div>
      <div class="rev-actions">
        <button class="btn-edit-rev"
          onclick="window.openRevEdit('${r.id}',
            '${(r.name||'').replace(/'/g,"\\'").replace(/\n/g,' ')}',
            ${r.stars||5},
            '${(r.text||'').replace(/'/g,"\\'").replace(/\n/g,'\\n')}')">
          ✏️ Edit
        </button>
        <button class="btn-del-rev" onclick="window.deleteReview('${r.id}')">🗑️</button>
      </div>
    </div>`).join('');
}

window.filterReviews = renderReviews;
window.setRevFilter  = (f, btn) => {
  revFilter = f;
  document.querySelectorAll('#sec-rev .f-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderReviews();
};
window.loadMoreRevs  = () => loadReviews(false);

window.openRevEdit = (id, name, stars, text) => {
  pendingRevId = id;
  document.getElementById('re-name').value  = name;
  document.getElementById('re-stars').value = stars;
  document.getElementById('re-text').value  = text.replace(/\\n/g,'\n');
  document.getElementById('revEditModal').classList.add('open');
};

window.executeEditRev = async () => {
  if(!pendingRevId) return;
  setBtnLoading('revEditOkBtn','revEditTxt','revEditSpinner', true);
  try {
    await updateDoc(doc(db,'reviews',pendingRevId), {
      name:  document.getElementById('re-name').value.trim(),
      stars: parseInt(document.getElementById('re-stars').value),
      text:  document.getElementById('re-text').value.trim(),
      updatedAt: serverTimestamp()
    });
    window.closeModal('revEditModal');
    toast('✏️ Review updated!', 's');
    loadReviews();
  } catch(e){ toast('Failed: ' + e.message, 'e'); }
  finally{ setBtnLoading('revEditOkBtn','revEditTxt','revEditSpinner', false, '💾 Save'); }
};

window.deleteReview = async (id) => {
  if(!confirm('Review delete karna chahte ho?')) return;
  try {
    await deleteDoc(doc(db,'reviews',id));
    toast('🗑️ Review deleted', 'w');
    loadReviews();
  } catch(e){ toast('Delete failed','e'); }
};

/* ══════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════ */
async function loadSettings(){
  try {
    const snap = await getDoc(doc(db,'settings','config'));
    if(snap.exists()){
      const d = snap.data();
      document.getElementById('maintenanceToggle').checked = d.maintenanceMode || false;
      document.getElementById('announcementText').value    = d.announcement    || '';
    }
  } catch(e){ console.error('Settings load error:', e); }
}

window.saveSettings = async () => {
  try {
    await setDoc(doc(db,'settings','config'), {
      maintenanceMode: document.getElementById('maintenanceToggle').checked,
      announcement:    document.getElementById('announcementText').value.trim(),
      updatedAt: serverTimestamp()
    }, { merge:true });
    toast('💾 Settings saved!', 's');
  } catch(e){ toast('Save failed: ' + e.message, 'e'); }
};

/* ══════════════════════════════════════════
   MODAL CLOSE
══════════════════════════════════════════ */
window.closeModal = (id) => {
  document.getElementById(id)?.classList.remove('open');
};
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if(e.target === m) m.classList.remove('open'); });
});

/* ══════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════ */
window.doLogout = async () => {
  await signOut(auth);
  window.location.replace('login.html');
};

/* ══════════════════════════════════════════
   AUTH GUARD — Entry point
══════════════════════════════════════════ */
onAuthStateChanged(auth, async (user) => {
  if(!user){
    window.location.replace('login.html');
    return;
  }
  if(user.email !== ADMIN_EMAIL){
    alert('Access denied. Admin only.');
    await signOut(auth);
    window.location.replace('index.html');
    return;
  }

  /* Show admin email in header */
  document.getElementById('adminEmail').textContent = user.email;

  /* Hide loading overlay */
  document.getElementById('authOverlay').classList.add('hidden');

  /* Load all data */
  loadDashboard();
  loadRequests();
  loadUsers();
  loadReviews();
  loadSettings();
});

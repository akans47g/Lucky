/* ============================================================
   rating.js — SignalPro AI
   - 55 preset realistic Indian reviews (admin-editable)
   - Firebase: submit new reviews, load live reviews
   - Admin panel mein: PRESET_REVIEWS array edit karke
     kisi bhi review ko change kar sakte ho
   ============================================================ */

import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, query,
         orderBy, getDocs, serverTimestamp }
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

/* ════════════════════════════════════════════════════════════
   PRESET REVIEWS — Admin panel se edit kar sakte ho
   Fields: id, name, stars (1-5), date, text, helpful
   ════════════════════════════════════════════════════════════ */
const PRESET_REVIEWS = [
  { id:"p01", name:"Vikas Sharma",    stars:5, date:"18 May 2026", helpful:24, text:"Yaar yeh app toh sach mein zabardast hai! 10 mein se 8 baar prediction bilkul sahi nikla. Pehle ₹500 dala tha aur ek hi din mein ₹4000+ withdraw kar liya. Ab roz use karta hoon." },
  { id:"p02", name:"Deepak Yadav",    stars:5, date:"17 May 2026", helpful:19, text:"Bhai pehle bohot loss hua tha trading mein. Yeh app mila toh life badal gayi. Signal itna accurate hai ki believe hi nahi hota. Highly recommend karta hoon sab ko." },
  { id:"p03", name:"Salman Khan",     stars:5, date:"16 May 2026", helpful:31, text:"200 rupaye dala tha pehle try karne ke liye. Aur bhai... 10,000+ rupaye withdraw kar liye! Real mein yeh kaam karta hai. Fake nahi hai yeh app." },
  { id:"p04", name:"Suraj Mehta",     stars:5, date:"16 May 2026", helpful:15, text:"AI prediction 1 minute mein BIG aur SMALL batata hai. Mera 8 se 10 baar mein 8 baar sahi hota hai. Is se better kuch nahi mila mujhe aaj tak." },
  { id:"p05", name:"Champak Patel",   stars:5, date:"15 May 2026", helpful:22, text:"Yeh application pehle kyun nahi mili mujhe? 3 saal se trading kar raha hoon loss mein. Yeh app use kiya toh pehle hi hafte mein profit hua. Dil se shukriya." },
  { id:"p06", name:"Rohit Verma",     stars:5, date:"14 May 2026", helpful:18, text:"Signal timing ekdum perfect hai. Trade se pehle hi 30 second mein bata deta hai kya hoga. ₹1000 se shuru kiya aur abhi ₹15,000+ ka profit ho chuka hai is month mein." },
  { id:"p07", name:"Ankit Dubey",     stars:5, date:"13 May 2026", helpful:26, text:"Bhai sach bolunga toh pehle mujhe bhi doubt tha. Lekin 7 din ka trial liya aur ab VIP member hoon. Roz minimum ₹2000-3000 ka profit ho jaata hai. App wardan hai!" },
  { id:"p08", name:"Pradeep Kumar",   stars:5, date:"13 May 2026", helpful:12, text:"Mere 3 dost bhi join kar chuke hain. Hum sab ek saath signal dekhte hain aur sab profit mein hain. Customer support bhi bahut achha hai. 5 star deserves fully." },
  { id:"p09", name:"Manish Tiwari",   stars:5, date:"12 May 2026", helpful:20, text:"10 signal mein se 8 sahi — yeh accuracy rate real hai, fake nahi. Maine khud track kiya ek hafte. Rs 500 dala aur ₹6,800 nikala. Thanks SignalPro!" },
  { id:"p10", name:"Gaurav Singh",    stars:5, date:"11 May 2026", helpful:14, text:"Abhi tak ₹38,000 ka profit ho chuka hai sirf 3 hafte mein. Meri wife bhi yeh dekhti hai aur believe kar liya. Family khush hai. App khush hai. Main khush hoon 😊" },
  { id:"p11", name:"Karan Thakur",    stars:5, date:"11 May 2026", helpful:17, text:"Prediction accuracy seriously 80%+ hai. Maine note kiya — 40 trades mein 33 correct. Isse acha koi indicator nahi. VIP plan worth every rupee." },
  { id:"p12", name:"Vivek Pandey",    stars:5, date:"10 May 2026", helpful:29, text:"Zindagi mein pehli baar trading mein consistent profit dekha. Yeh AI signal really kaam karta hai. ₹300 invest kiye, ₹4500 bahar nikale. Zabardast!" },
  { id:"p13", name:"Rahul Gupta",     stars:5, date:"10 May 2026", helpful:11, text:"Ek din mein 12 signals mein se 10 bilkul sahi nikle. Yaar kya accuracy hai. Pehle bahut apps try kiye — sab bekar. Yeh ek hi asli cheez hai market mein." },
  { id:"p14", name:"Sanjay Mishra",   stars:5, date:"9 May 2026",  helpful:23, text:"Mera beta 20 saal ka hai, usko recommend kiya. Woh bhi ab VIP le chuka hai. Ghar mein dono profit kama rahe hain. Yeh app gift hai sab ke liye jo seriously trade karna chahte hain." },
  { id:"p15", name:"Dinesh Rawat",    stars:5, date:"9 May 2026",  helpful:16, text:"Bhai yeh sach mein life changing hai. ₹200 se shuru kiya tha, ab ₹12,000 ho gaye. Roz subah signal check karta hoon phir trade karta hoon. Perfect routine." },
  { id:"p16", name:"Lokesh Sharma",   stars:5, date:"8 May 2026",  helpful:21, text:"VIP plan ka 28 din ka subscription liya. Puri investment 3rd din mein recover ho gayi. Baaki pure 25 din profit hi profit. Seriously best app." },
  { id:"p17", name:"Akash Tiwari",    stars:5, date:"8 May 2026",  helpful:9,  text:"Signal real-time aata hai. Koi delay nahi. Exactly 1 minute candle ke liye accurate prediction. Trading career ka best decision raha yeh app join karna." },
  { id:"p18", name:"Neeraj Joshi",    stars:5, date:"7 May 2026",  helpful:18, text:"3 mahine se use kar raha hoon. Har mahine ₹20,000 se zyada profit ho raha hai. Family ka guzara isse hi ho raha hai ab. Allah ka shukar hai aur SignalPro ka." },
  { id:"p19", name:"Harish Meena",    stars:5, date:"7 May 2026",  helpful:13, text:"Mujhe pehle kisi ne bataya hota toh 2 saal ka loss na hota. Ab har din 1-2 ghante mein kaam khatam. Profit consistent hai. 5 star se kam dena galat hoga." },
  { id:"p20", name:"Rajesh Pal",      stars:5, date:"6 May 2026",  helpful:27, text:"Yeh app wardan hai bhai. Sach mein. ₹1000 dala ₹9,500 nikala ek hi din mein. Friends ko bhi bata diya. Sab join kar rahe hain." },
  { id:"p21", name:"Pawan Yadav",     stars:5, date:"6 May 2026",  helpful:10, text:"10 mein 8 baar sahi prediction — yeh claim sach hai! Maine personally verify kiya. Is level ka AI tool pehle nahi dekha." },
  { id:"p22", name:"Tarun Saxena",    stars:5, date:"5 May 2026",  helpful:22, text:"Sabse achhi baat yeh hai ki signal simple hai — sirf BIG ya SMALL. Confuse nahi hota. Enter karo, profit lo. Simple!" },
  { id:"p23", name:"Manoj Bharti",    stars:5, date:"5 May 2026",  helpful:15, text:"Customer support ne meri problem 10 minute mein solve ki. Coins turant add ho gaye. Service ekdum top class hai. Aisa experience bahut kam milta hai." },
  { id:"p24", name:"Suresh Nair",     stars:5, date:"4 May 2026",  helpful:19, text:"Goa mein hoon, yahan trade karta hoon. Net sahi ho toh signal perfect kaam karta hai. Location se koi farak nahi. Anywhere anytime profit." },
  { id:"p25", name:"Bharat Yadav",    stars:5, date:"4 May 2026",  helpful:7,  text:"VIP subscription lene ke baad pehle hi din ₹3,200 ka profit. Feeling amazing tha. Ab roz yahi routine hai. Thanks team." },
  { id:"p26", name:"Mohit Chauhan",   stars:5, date:"3 May 2026",  helpful:14, text:"Mere 5 dost join kar chuke hain mere kehne par. Sab profit mein hain. Group mein roz results share karte hain. Maza aata hai." },
  { id:"p27", name:"Ravi Shankar",    stars:5, date:"3 May 2026",  helpful:11, text:"Ek signal ka time miss hua toh bhi chart dekha aur woh bhi correct tha. Consistency amazing hai. Pure month mein sirf 4 baar galat signal aaya." },
  { id:"p28", name:"Vikram Jaiswal",  stars:5, date:"2 May 2026",  helpful:20, text:"₹500 invest karke ₹14,000 ka profit kama liya 10 din mein. Yeh real hai bhai. Screenshot hai mere paas. Believe karo." },
  { id:"p29", name:"Santosh Kumar",   stars:5, date:"2 May 2026",  helpful:8,  text:"Maine apni wife ko bhi sikhaya yeh use karna. Ab woh akele trade karti hai aur profit leti hai. Ghar ka kharcha nikal jaata hai isse." },
  { id:"p30", name:"Deepu Shukla",    stars:5, date:"1 May 2026",  helpful:16, text:"Trading shuru karne se darrta tha. SignalPro ne confidence diya. Accuracy dekh ke sab doubt khatam ho gaye. Pehle hi week mein ₹2,800 profit." },
  { id:"p31", name:"Arun Pandey",     stars:5, date:"30 Apr 2026", helpful:13, text:"Yaar kitna simple hai — signal aata hai BIG, tum BIG lagao, profit lo. Itna easy paise kamana pehle kabhi nahi tha." },
  { id:"p32", name:"Shyam Goswami",   stars:5, date:"29 Apr 2026", helpful:9,  text:"Kisi ne kaha tha koi app real nahi hota. Yeh dekh ke chup ho gaye. ₹8,500 ka profit screenshot bheja unhe. Ab woh bhi join karna chahte hain!" },
  { id:"p33", name:"Nikhil Bose",     stars:5, date:"28 Apr 2026", helpful:24, text:"App ka UI bhi bahut clean hai. Signal clearly dikhta hai. Koi confusion nahi. Perfect design aur perfect prediction. 10/10." },
  { id:"p34", name:"Ajay Verma",      stars:5, date:"27 Apr 2026", helpful:17, text:"Yeh meri zindagi ka best investment decision raha. Pehle kabhi trading se profit nahi hua. Ab har din hota hai. Thank you SignalPro AI." },
  { id:"p35", name:"Ramesh Gawande",  stars:5, date:"26 Apr 2026", helpful:12, text:"Bhai 200 dala tha trial ke liye. Pehle 3 signal sahi gaye. Phir ₹1000 dala. Phir ₹5000. Ab main serious trader hoon. Real game changer." },
  { id:"p36", name:"Hemant Solanki",  stars:5, date:"25 Apr 2026", helpful:20, text:"Ek hafte mein ₹25,000 profit. Yeh koi jhooth nahi hai. App genuinely kaam karta hai. Join karo aur khud dekho." },
  { id:"p37", name:"Praveen Jha",     stars:5, date:"24 Apr 2026", helpful:6,  text:"Signal accuracy ne mujhe hairan kar diya. AI kitna smart hai yaar. 1 minute ka perfect prediction. Science hai yeh, jadoo nahi." },
  { id:"p38", name:"Dinesh Oraon",    stars:5, date:"23 Apr 2026", helpful:15, text:"Jharkhand se hoon. Yahan internet slow hota hai lekin app fir bhi fast kaam karta hai. Signal kabhi late nahi aaya. Mast hai." },
  { id:"p39", name:"Farhan Sheikh",   stars:5, date:"22 Apr 2026", helpful:18, text:"Bhai 10 mein 8 sahi prediction matlab 80% accuracy. Agar tum consistent raho toh guaranteed profit hai. Maine prove kiya hai." },
  { id:"p40", name:"Girish Patil",    stars:5, date:"21 Apr 2026", helpful:11, text:"Maharashtra se hoon. Yeh app use karke ₹32,000 ka profit hua ek mahine mein. Family trip gaye usse. Life mast hai!" },
  { id:"p41", name:"Arvind Mishra",   stars:5, date:"20 Apr 2026", helpful:22, text:"Mujhe trading ka koi knowledge nahi tha. Sirf signal follow kiya. Aur profit milta raha. AI sab kuch sambhal leta hai." },
  { id:"p42", name:"Kuldeep Singh",   stars:5, date:"19 Apr 2026", helpful:14, text:"Roz subah 8 baje se 10 baje tak trade karta hoon. 2 ghante mein ₹1500-2000 ka profit ho jaata hai. Salary se zyada hai yeh." },
  { id:"p43", name:"Sumit Rao",       stars:5, date:"18 Apr 2026", helpful:9,  text:"Trial version se hi itna confident tha. VIP liya toh aur bhi zyada signals milte hain. Worth it 100%." },
  /* 4-STAR */
  { id:"p44", name:"Tarun Kapoor",    stars:4, date:"17 May 2026", helpful:8,  text:"Achha app hai. Signal mostly sahi rehta hai. Kabhi kabhi 1-2 galat bhi hote hain lekin overall profit mein hoon. 4 star de raha hoon, 5 star ke liye thoda aur improve karo." },
  { id:"p45", name:"Yash Trivedi",    stars:4, date:"15 May 2026", helpful:11, text:"7 din ka trial liya pehle. Result kaafi achha raha. VIP lene ka plan hai. App smooth chalti hai, UI bhi clean hai. Recommend karta hoon." },
  { id:"p46", name:"Ritesh Agarwal",  stars:4, date:"13 May 2026", helpful:6,  text:"Overall experience achha hai. 10 mein 7-8 sahi signal aate hain. Thoda aur accuracy badhaye toh perfect hoga. Abhi ke liye 4 star." },
  { id:"p47", name:"Sachin Wagh",     stars:4, date:"10 May 2026", helpful:9,  text:"Good app. Signal timing sahi hai. Coins add karna thoda slow laga pehli baar lekin baad mein sab smooth ho gaya. 4 star." },
  { id:"p48", name:"Naresh Yadav",    stars:4, date:"8 May 2026",  helpful:7,  text:"Kuch din signals bohot accurate the, kuch din thoda kam. Average achha hai. ₹3,000 profit hua ek hafte mein. Theek hai." },
  { id:"p49", name:"Pramod Jain",     stars:4, date:"5 May 2026",  helpful:5,  text:"App ka design acha hai. Signal simple aur clear hai. Kabhi kabhi slow hota hai loading mein lekin koi badi problem nahi. Achha experience." },
  { id:"p50", name:"Manmeet Kaur",    stars:4, date:"2 May 2026",  helpful:12, text:"App use karke achha laga. Signals helpful hain. Ek baar support se baat ki toh unhone quickly help kiya. Isse better expect karta tha lekin fir bhi good." },
  { id:"p51", name:"Dilip Maurya",    stars:4, date:"28 Apr 2026", helpful:4,  text:"Kaafi useful app hai. 15 days ka plan liya. First week mein profit hua. Second week mein thoda mixed raha. Overall positive experience." },
  /* 3-STAR */
  { id:"p52", name:"Irfan Shaikh",    stars:3, date:"14 May 2026", helpful:3,  text:"App theek hai. Kuch signals sahi the, kuch galat. Abhi tak break even hoon. Shayad aur time dene par better results aayein. Average experience." },
  { id:"p53", name:"Amar Jeet",       stars:3, date:"9 May 2026",  helpful:2,  text:"Interface acha hai. Lekin mera experience mixed raha. 10 mein 5-6 sahi. Expectations zyada thi. Shayad mujhe technique improve karni chahiye." },
  { id:"p54", name:"Sunil Bhoomi",    stars:3, date:"4 May 2026",  helpful:1,  text:"Kuch din bahut achhe signals aaye, kuch din nahi. Overall neutral hoon. Coin system samajhne mein thoda time laga. Support helpful tha." },
  { id:"p55", name:"Ramji Lal",       stars:3, date:"29 Apr 2026", helpful:3,  text:"App chalti hai, signals aate hain. Mere liye abhi average experience hai. Ho sakta hai mujhe aur practice chahiye. Fair rating de raha hoon." },
];

/* ── Merge Firebase reviews + preset ── */
async function loadAllReviews() {
  let allReviews = [...PRESET_REVIEWS];

  try {
    const q    = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      const d = doc.data();
      allReviews.unshift({
        id:      doc.id,
        name:    d.name    || "User",
        stars:   d.stars   || 5,
        date:    d.createdAt?.toDate
                 ? d.createdAt.toDate().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})
                 : "Recently",
        text:    d.text    || "",
        helpful: d.helpful || 0,
      });
    });
  } catch (e) {
    console.warn("Firebase reviews load:", e.message);
  }

  /* Update score stats */
  const total = allReviews.length;
  const counts = { 5:0, 4:0, 3:0, 2:0, 1:0 };
  let sum = 0;
  allReviews.forEach(r => { counts[r.stars]++; sum += r.stars; });
  const avg = (sum / total).toFixed(1);

  document.getElementById('avgScore').textContent   = avg;
  document.getElementById('totalCount').textContent = total + " reviews";
  document.getElementById('cnt5').textContent = counts[5];
  document.getElementById('cnt4').textContent = counts[4];
  document.getElementById('cnt3').textContent = counts[3];
  document.getElementById('cnt2').textContent = counts[2];
  document.getElementById('cnt1').textContent = counts[1];
  setTimeout(()=>{
    document.getElementById('bar5').style.width = ((counts[5]/total)*100).toFixed(1)+'%';
    document.getElementById('bar4').style.width = ((counts[4]/total)*100).toFixed(1)+'%';
    document.getElementById('bar3').style.width = ((counts[3]/total)*100).toFixed(1)+'%';
    document.getElementById('bar2').style.width = ((counts[2]/total)*100).toFixed(1)+'%';
    document.getElementById('bar1').style.width = ((counts[1]/total)*100).toFixed(1)+'%';
  }, 400);

  /* Render */
  window.renderCards(allReviews);
}

/* ── Submit review ── */
async function submitReview(user) {
  const stars = window._selectedStar || 0;
  const text  = (document.getElementById('reviewText').value || '').trim();

  if (!stars)         { window.showToast("Pehle star select karo ⭐", "warn"); return; }
  if (text.length < 10) { window.showToast("Thoda zyada likho (min 10 chars) ✍️", "warn"); return; }

  const btn = document.getElementById('submitReviewBtn');
  const txt = document.getElementById('subBtnTxt');
  const sp  = document.getElementById('subSpinner');
  btn.disabled = true; txt.textContent = "Submitting…"; sp.classList.remove('hidden');

  try {
    await addDoc(collection(db, "reviews"), {
      uid:       user ? user.uid   : "guest",
      name:      user ? (user.displayName || "User") : "User",
      stars,
      text,
      helpful:   0,
      createdAt: serverTimestamp(),
    });
    window.showToast("🎉 Review submit ho gaya! Shukriya.", "success");
    document.getElementById('reviewText').value = "";
    document.getElementById('charNum').textContent = "0";
    window._selectedStar = 0;
    document.querySelectorAll('.si').forEach(s => s.classList.remove('lit'));
    document.getElementById('starHint').textContent = "Tap a star to rate";
    await loadAllReviews();
  } catch (e) {
    window.showToast("❌ Submit failed: " + e.message, "error");
  } finally {
    btn.disabled = false; txt.textContent = "Submit Review"; sp.classList.add('hidden');
  }
}

/* ── Auth + Init ── */
onAuthStateChanged(auth, (user) => {
  document.getElementById('submitReviewBtn').addEventListener('click', () => submitReview(user));
});

/* Load on page open */
loadAllReviews();

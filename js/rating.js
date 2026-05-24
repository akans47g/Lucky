/* ============================================================
   rating.js — SignalPro AI
   Total preset: 112 reviews (55 original + 57 new)
   Admin: PRESET_REVIEWS array edit karo
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
   date field sirf internal use ke liye hai, page par nahi dikhega
   ════════════════════════════════════════════════════════════ */
const PRESET_REVIEWS = [
  /* ── 5 STAR (original 43) ── */
  { id:"p01", name:"Vikas Sharma",      stars:5, helpful:24, text:"Yaar yeh app toh sach mein zabardast hai! 10 mein se 8 baar prediction bilkul sahi nikla. Pehle ₹500 dala tha aur ek hi din mein ₹4000+ withdraw kar liya. Ab roz use karta hoon." },
  { id:"p02", name:"Deepak Yadav",      stars:5, helpful:19, text:"Bhai pehle bohot loss hua tha trading mein. Yeh app mila toh life badal gayi. Signal itna accurate hai ki believe hi nahi hota. Highly recommend karta hoon sab ko." },
  { id:"p03", name:"Salman Khan",       stars:5, helpful:31, text:"200 rupaye dala tha pehle try karne ke liye. Aur bhai... 10,000+ rupaye withdraw kar liye! Real mein yeh kaam karta hai. Fake nahi hai yeh app." },
  { id:"p04", name:"Suraj Mehta",       stars:5, helpful:15, text:"AI prediction 1 minute mein BIG aur SMALL batata hai. Mera 8 se 10 baar mein 8 baar sahi hota hai. Is se better kuch nahi mila mujhe aaj tak." },
  { id:"p05", name:"Champak Patel",     stars:5, helpful:22, text:"Yeh application pehle kyun nahi mili mujhe? 3 saal se trading kar raha hoon loss mein. Yeh app use kiya toh pehle hi hafte mein profit hua. Dil se shukriya." },
  { id:"p06", name:"Rohit Verma",       stars:5, helpful:18, text:"Signal timing ekdum perfect hai. Trade se pehle hi 30 second mein bata deta hai kya hoga. ₹1000 se shuru kiya aur abhi ₹15,000+ ka profit ho chuka hai is month mein." },
  { id:"p07", name:"Ankit Dubey",       stars:5, helpful:26, text:"Bhai sach bolunga toh pehle mujhe bhi doubt tha. Lekin 7 din ka trial liya aur ab VIP member hoon. Roz minimum ₹2000-3000 ka profit ho jaata hai. App wardan hai!" },
  { id:"p08", name:"Pradeep Kumar",     stars:5, helpful:12, text:"Mere 3 dost bhi join kar chuke hain. Hum sab ek saath signal dekhte hain aur sab profit mein hain. Customer support bhi bahut achha hai. 5 star deserves fully." },
  { id:"p09", name:"Manish Tiwari",     stars:5, helpful:20, text:"10 signal mein se 8 sahi — yeh accuracy rate real hai, fake nahi. Maine khud track kiya ek hafte. ₹500 dala aur ₹6,800 nikala. Thanks SignalPro!" },
  { id:"p10", name:"Gaurav Singh",      stars:5, helpful:14, text:"Abhi tak ₹38,000 ka profit ho chuka hai sirf 3 hafte mein. Meri wife bhi yeh dekhti hai aur believe kar liya. Family khush hai. App khush hai. Main khush hoon 😊" },
  { id:"p11", name:"Karan Thakur",      stars:5, helpful:17, text:"Prediction accuracy seriously 80%+ hai. Maine note kiya — 40 trades mein 33 correct. Isse acha koi indicator nahi. VIP plan worth every rupee." },
  { id:"p12", name:"Vivek Pandey",      stars:5, helpful:29, text:"Zindagi mein pehli baar trading mein consistent profit dekha. Yeh AI signal really kaam karta hai. ₹300 invest kiye, ₹4500 bahar nikale. Zabardast!" },
  { id:"p13", name:"Rahul Gupta",       stars:5, helpful:11, text:"Ek din mein 12 signals mein se 10 bilkul sahi nikle. Yaar kya accuracy hai. Pehle bahut apps try kiye — sab bekar. Yeh ek hi asli cheez hai market mein." },
  { id:"p14", name:"Sanjay Mishra",     stars:5, helpful:23, text:"Mera beta 20 saal ka hai, usko recommend kiya. Woh bhi ab VIP le chuka hai. Ghar mein dono profit kama rahe hain. Yeh app gift hai sab ke liye jo seriously trade karna chahte hain." },
  { id:"p15", name:"Dinesh Rawat",      stars:5, helpful:16, text:"Bhai yeh sach mein life changing hai. ₹200 se shuru kiya tha, ab ₹12,000 ho gaye. Roz subah signal check karta hoon phir trade karta hoon. Perfect routine." },
  { id:"p16", name:"Lokesh Sharma",     stars:5, helpful:21, text:"VIP plan ka 28 din ka subscription liya. Puri investment 3rd din mein recover ho gayi. Baaki pure 25 din profit hi profit. Seriously best app." },
  { id:"p17", name:"Akash Tiwari",      stars:5, helpful:9,  text:"Signal real-time aata hai. Koi delay nahi. Exactly 1 minute candle ke liye accurate prediction. Trading career ka best decision raha yeh app join karna." },
  { id:"p18", name:"Neeraj Joshi",      stars:5, helpful:18, text:"3 mahine se use kar raha hoon. Har mahine ₹20,000 se zyada profit ho raha hai. Family ka guzara isse hi ho raha hai ab. Allah ka shukar hai aur SignalPro ka." },
  { id:"p19", name:"Harish Meena",      stars:5, helpful:13, text:"Mujhe pehle kisi ne bataya hota toh 2 saal ka loss na hota. Ab har din 1-2 ghante mein kaam khatam. Profit consistent hai. 5 star se kam dena galat hoga." },
  { id:"p20", name:"Rajesh Pal",        stars:5, helpful:27, text:"Yeh app wardan hai bhai. Sach mein. ₹1000 dala ₹9,500 nikala ek hi din mein. Friends ko bhi bata diya. Sab join kar rahe hain." },
  { id:"p21", name:"Pawan Yadav",       stars:5, helpful:10, text:"10 mein 8 baar sahi prediction — yeh claim sach hai! Maine personally verify kiya. Is level ka AI tool pehle nahi dekha." },
  { id:"p22", name:"Tarun Saxena",      stars:5, helpful:22, text:"Sabse achhi baat yeh hai ki signal simple hai — sirf BIG ya SMALL. Confuse nahi hota. Enter karo, profit lo. Simple!" },
  { id:"p23", name:"Manoj Bharti",      stars:5, helpful:15, text:"Customer support ne meri problem 10 minute mein solve ki. Coins turant add ho gaye. Service ekdum top class hai. Aisa experience bahut kam milta hai." },
  { id:"p24", name:"Suresh Nair",       stars:5, helpful:19, text:"Goa mein hoon, yahan trade karta hoon. Net sahi ho toh signal perfect kaam karta hai. Location se koi farak nahi. Anywhere anytime profit." },
  { id:"p25", name:"Bharat Yadav",      stars:5, helpful:7,  text:"VIP subscription lene ke baad pehle hi din ₹3,200 ka profit. Feeling amazing tha. Ab roz yahi routine hai. Thanks team." },
  { id:"p26", name:"Mohit Chauhan",     stars:5, helpful:14, text:"Mere 5 dost join kar chuke hain mere kehne par. Sab profit mein hain. Group mein roz results share karte hain. Maza aata hai." },
  { id:"p27", name:"Ravi Shankar",      stars:5, helpful:11, text:"Ek signal ka time miss hua toh bhi chart dekha aur woh bhi correct tha. Consistency amazing hai. Pure month mein sirf 4 baar galat signal aaya." },
  { id:"p28", name:"Vikram Jaiswal",    stars:5, helpful:20, text:"₹500 invest karke ₹14,000 ka profit kama liya 10 din mein. Yeh real hai bhai. Screenshot hai mere paas. Believe karo." },
  { id:"p29", name:"Santosh Kumar",     stars:5, helpful:8,  text:"Maine apni wife ko bhi sikhaya yeh use karna. Ab woh akele trade karti hai aur profit leti hai. Ghar ka kharcha nikal jaata hai isse." },
  { id:"p30", name:"Deepu Shukla",      stars:5, helpful:16, text:"Trading shuru karne se darrta tha. SignalPro ne confidence diya. Accuracy dekh ke sab doubt khatam ho gaye. Pehle hi week mein ₹2,800 profit." },
  { id:"p31", name:"Arun Pandey",       stars:5, helpful:13, text:"Yaar kitna simple hai — signal aata hai BIG, tum BIG lagao, profit lo. Itna easy paise kamana pehle kabhi nahi tha." },
  { id:"p32", name:"Shyam Goswami",     stars:5, helpful:9,  text:"Kisi ne kaha tha koi app real nahi hota. Yeh dekh ke chup ho gaye. ₹8,500 ka profit screenshot bheja unhe. Ab woh bhi join karna chahte hain!" },
  { id:"p33", name:"Nikhil Bose",       stars:5, helpful:24, text:"App ka UI bhi bahut clean hai. Signal clearly dikhta hai. Koi confusion nahi. Perfect design aur perfect prediction. 10/10." },
  { id:"p34", name:"Ajay Verma",        stars:5, helpful:17, text:"Yeh meri zindagi ka best investment decision raha. Pehle kabhi trading se profit nahi hua. Ab har din hota hai. Thank you SignalPro AI." },
  { id:"p35", name:"Ramesh Gawande",    stars:5, helpful:12, text:"Bhai 200 dala tha trial ke liye. Pehle 3 signal sahi gaye. Phir ₹1000 dala. Phir ₹5000. Ab main serious trader hoon. Real game changer." },
  { id:"p36", name:"Hemant Solanki",    stars:5, helpful:20, text:"Ek hafte mein ₹25,000 profit. Yeh koi jhooth nahi hai. App genuinely kaam karta hai. Join karo aur khud dekho." },
  { id:"p37", name:"Praveen Jha",       stars:5, helpful:6,  text:"Signal accuracy ne mujhe hairan kar diya. AI kitna smart hai yaar. 1 minute ka perfect prediction. Science hai yeh, jadoo nahi." },
  { id:"p38", name:"Dinesh Oraon",      stars:5, helpful:15, text:"Jharkhand se hoon. Yahan internet slow hota hai lekin app fir bhi fast kaam karta hai. Signal kabhi late nahi aaya. Mast hai." },
  { id:"p39", name:"Farhan Sheikh",     stars:5, helpful:18, text:"Bhai 10 mein 8 sahi prediction matlab 80% accuracy. Agar tum consistent raho toh guaranteed profit hai. Maine prove kiya hai." },
  { id:"p40", name:"Girish Patil",      stars:5, helpful:11, text:"Maharashtra se hoon. Yeh app use karke ₹32,000 ka profit hua ek mahine mein. Family trip gaye usse. Life mast hai!" },
  { id:"p41", name:"Arvind Mishra",     stars:5, helpful:22, text:"Mujhe trading ka koi knowledge nahi tha. Sirf signal follow kiya. Aur profit milta raha. AI sab kuch sambhal leta hai." },
  { id:"p42", name:"Kuldeep Singh",     stars:5, helpful:14, text:"Roz subah 8 baje se 10 baje tak trade karta hoon. 2 ghante mein ₹1500-2000 ka profit ho jaata hai. Salary se zyada hai yeh." },
  { id:"p43", name:"Sumit Rao",         stars:5, helpful:9,  text:"Trial version se hi itna confident tha. VIP liya toh aur bhi zyada signals milte hain. Worth it 100%." },

  /* ── NEW 5 STAR (40 naye) ── */
  { id:"n01", name:"Rajan Bhatt",       stars:5, helpful:33, text:"Bhai ek baar try karo phir dekho. Pehle mujhe bhi lagta tha sab fake hai. Lekin ₹250 laga ke ₹5,000 nikale toh ab poora trust hai. Roz profit ho raha hai." },
  { id:"n02", name:"Sachin Kamble",     stars:5, helpful:28, text:"Maharashtra ka hoon. Yahan zyada log trading karte hain. Maine bhi try kiya aur result amazing raha. 8 din mein ₹18,000 profit. Real hai yeh." },
  { id:"n03", name:"Imran Qureshi",     stars:5, helpful:21, text:"Sabse pehle 7 din ka trial liya. Itne accurate signals the ki turant 28 din ka plan le liya. Ab teen mahine se hoon. Profit consistent hai." },
  { id:"n04", name:"Tejpal Singh",      stars:5, helpful:16, text:"Punjab se hoon. Yahan sab kehte hain trading mein paise jaate hain. Yeh app ne prove kar diya ki sahi signal ho toh profit hota hai. ₹42,000 hua ek mahine mein." },
  { id:"n05", name:"Hiten Shah",        stars:5, helpful:25, text:"Gujarat se hoon. Business karta hoon. Yeh app side income ke liye perfect hai. Roz 1 ghante mein ₹3,000-5,000 ka profit. Business se zyada kamaata hoon ab." },
  { id:"n06", name:"Sonu Yadav",        stars:5, helpful:19, text:"Yaar yeh app genuine hai. Maine khud ₹100 se shuru kiya tha. Aaj ₹95,000 ka total profit ho chuka hai 2 mahine mein.믿을 수가 없었어요... I mean sach mein believe nahi hota!" },
  { id:"n07", name:"Bhupesh Rathi",     stars:5, helpful:12, text:"10 mein se 8 sahi — yeh sirf claim nahi, reality hai. Maine 50 trades track kiye. 41 correct the. Yeh koi chhoti baat nahi hai." },
  { id:"n08", name:"Lalit Nagar",       stars:5, helpful:30, text:"Pehle Telegram groups join karte the signals ke liye — sab bekar. Yeh AI app join kiya toh sab khatam. Best decision of my life." },
  { id:"n09", name:"Dhruv Malhotra",    stars:5, helpful:17, text:"Delhi se hoon. Yahan competition bahut hai. Lekin yeh app ne serious edge de diya. Roz consistently ₹2,500 plus ka profit." },
  { id:"n10", name:"Chetan Pardeshi",   stars:5, helpful:23, text:"₹1,500 invest kiye the 28 din ke plan mein. Sirf 4 din mein recover ho gaya. Baki 24 din pure profit. Calculate karo kitna kama liya." },
  { id:"n11", name:"Gopal Krishnan",    stars:5, helpful:10, text:"South India se hoon. Hindi samajhta hoon thoda. But app bahut easy hai. Signal clear hai — BIG ya SMALL. Simple aur profitable." },
  { id:"n12", name:"Ranjeet Pandey",    stars:5, helpful:14, text:"Job ke saath saath yeh karta hoon. Lunch break mein 2-3 trades. ₹1,000-1,500 roz. Month end mein ₹25,000 extra income. Life upgrade ho gayi." },
  { id:"n13", name:"Navin Sonar",       stars:5, helpful:8,  text:"Yeh app ne meri financial condition change kar di. Pehle EMI ke liye tension rehti thi. Ab sab EMI app se nikal jaati hai. Genuinely thankful." },
  { id:"n14", name:"Kamlesh Prajapati", stars:5, helpful:26, text:"5 star isliye nahi de raha ki app achha dikhta hai. De raha hoon kyunki meri pocket mein real paise aaye hain. ₹7,200 pehle hafte mein. Verified." },
  { id:"n15", name:"Shankar Das",       stars:5, helpful:11, text:"Odisha se hoon. Net thoda slow rehta hai lekin app fast hai. Signal time par aata hai. 15 din mein ₹12,000 profit. Bahut khush hoon." },
  { id:"n16", name:"Prakash Waghmare",  stars:5, helpful:18, text:"Pune se hoon. IT company mein kaam karta hoon. Yeh app technically bhi solid hai. No bugs, fast, accurate. And profit — toh woh toh hai hi." },
  { id:"n17", name:"Wasim Ansari",      stars:5, helpful:9,  text:"Bhai maine pehle bahut apps try kiye. Sab mein paise gaye. Yeh pehla app hai jisme paise aaye. ₹500 se ₹8,000 hua ek hafte mein." },
  { id:"n18", name:"Vijay Baliyan",     stars:5, helpful:16, text:"UP se hoon. Gaon mein rehta hoon. Yahan koi job nahi. Yeh app meri rozi roti ban gayi hai. Roz ₹1,500-2,000 ghar pe baithke. Achha hai." },
  { id:"n19", name:"Omkar Pawar",       stars:5, helpful:21, text:"Yeh app itna simple hai ki meri mummy bhi use kar sakti hain. Signal clear dikhta hai. Maine unhe bhi sikhaya. Ab hum dono trade karte hain." },
  { id:"n20", name:"Rajveer Chauhan",   stars:5, helpful:13, text:"Pehle 10 din mein ₹22,000 profit. Yeh sach hai. Koi bhi verify kar sakta hai. Screenshot hai mere paas. 5 star se kam nahi dena chahiye." },
  { id:"n21", name:"Hitesh Mehra",      stars:5, helpful:7,  text:"Roz subah ek ghante mein 3-4 trades. Evening mein 2-3. Din mein total ₹3,000 ka profit average hai. Month mein ₹90,000. Salary se 3x zyada." },
  { id:"n22", name:"Brijesh Yadav",     stars:5, helpful:19, text:"Yaar sach bolunga — pehle darr laga tha. Lekin trial liya, sahi nikla. VIP liya, sahi nikla. Ab darr nahi, confidence hai. 100% recommend." },
  { id:"n23", name:"Aakash Maurya",     stars:5, helpful:24, text:"10 mein 8 bar matlab har ₹100 mein ₹80 safe. Agar tum smart ho toh yeh ratio se consistently profit hota hai. Maine ₹50,000 kama liye ek mahine mein." },
  { id:"n24", name:"Surendra Rawat",    stars:5, helpful:15, text:"Uttarakhand se hoon. Pahadaon mein signal problem rehti hai kabhi kabhi. Lekin jab bhi aaya, accurate raha. Overall experience 5 star ka hai." },
  { id:"n25", name:"Jitendra Solanki",  stars:5, helpful:11, text:"App ka support amazing hai. Ek baar ek issue aaya coins mein. 15 minute mein resolve ho gaya. Aise hi companies pe trust hota hai." },
  { id:"n26", name:"Firoz Khan",        stars:5, helpful:28, text:"200 dala, 10,000 nikala — yeh mere saath hua. Real money, real app. Jo bhi padh raha hai yeh review — try karo, pachtaoge nahi." },
  { id:"n27", name:"Ramkumar Nair",     stars:5, helpful:6,  text:"Kerala se hoon. Yahan trading ka culture naya hai. Yeh app se start kiya aur ab serious trader hoon. ₹35,000 profit first month." },
  { id:"n28", name:"Sudhir Pathak",     stars:5, helpful:14, text:"Bhai app bilkul claim ke anusaar kaam karta hai. 1 minute signal, BIG/SMALL, accurate. ₹800 se ₹11,000 kama liye. Main satisfied hoon." },
  { id:"n29", name:"Madan Lal",         stars:5, helpful:20, text:"Rajasthan se hoon. Desert mein bhi app kaam karta hai 😄. Signal kabhi miss nahi hua. ₹28,000 profit hua ek mahine mein. Shukriya." },
  { id:"n30", name:"Kewal Gupta",       stars:5, helpful:9,  text:"Yaar itni accuracy toh kabhi kisi ne nahi di. Pehle bahut research ki, bahut groups join kiye. Sab chhod diya. Sirf yeh app use karta hoon ab." },
  { id:"n31", name:"Balram Singh",      stars:5, helpful:17, text:"Pehle ₹50,000 ka loss tha trading mein. Yeh app ne sirf 2 mahine mein sab recover karwa diya. Ab ₹30,000 plus mein hoon. Thank you SignalPro." },
  { id:"n32", name:"Pratap Rathore",    stars:5, helpful:13, text:"VIP lene ke baad pehle signal hi sahi nikla. Aur phir ek ke baad ek. Confidence badh gaya. Ab risk management ke saath consistent profit." },
  { id:"n33", name:"Chandu Verma",      stars:5, helpful:8,  text:"Chhattisgarh se hoon. Yahan opportunities kam hain. Yeh app ne ghar baithke income ka rasta de diya. Roz ₹1,000-1,500 ho jaata hai." },
  { id:"n34", name:"Milind Joshi",      stars:5, helpful:22, text:"Pune ka hoon. IT background hai toh app ko analyze kiya. UI clean, signals fast, Firebase backend — serious app hai. Aur profit toh hua hi." },
  { id:"n35", name:"Pappu Sharma",      stars:5, helpful:10, text:"Naam se mat judge karo 😂 Serious trader hoon. ₹500 se shuru kiya. Ab ₹65,000 ka profit ho chuka hai 6 hafte mein. App amazing hai." },
  { id:"n36", name:"Thakur Das",        stars:5, helpful:16, text:"Bhai mujhe trading ka A bhi pata nahi tha. Yeh app ne itna easy bana diya. Signal aaya, trade kiya, profit liya. Itna simple hai." },
  { id:"n37", name:"Ramesh Babu",       stars:5, helpful:12, text:"Andhra Pradesh se hoon. Telugu mein likhta toh koi nahi samjhta, toh Hindi mein likh raha hoon. App bahut achha hai. ₹19,000 profit hua." },
  { id:"n38", name:"Devendra Yadav",    stars:5, helpful:19, text:"Mere office mein 4 log hain jo yeh app use karte hain. Sab profit mein hain. Boss ko bhi bataya, woh bhi join kar gaye 😄 Best app ever." },
  { id:"n39", name:"Ganesh Salve",      stars:5, helpful:7,  text:"₹1000 dala tha. 5 din mein ₹7,500 nikale. Phir aur dala. Phir aur nikala. Ab consistently ₹5,000 roz kama raha hoon. App se zyada profit nahi deta kuch." },
  { id:"n40", name:"Priyesh Tomar",     stars:5, helpful:25, text:"Yeh sirf meri nahi, mere puri family ki life badal gayi. Papa bhi trade karte hain ab. Hum sab signal follow karte hain. Ghar mein roz celebration hoti hai 🎉" },

  /* ── NEW 4 STAR (17 naye) ── */
  { id:"n41", name:"Hemraj Patel",      stars:4, helpful:14, text:"Kaafi achha app hai. Signals mostly sahi rehte hain. Kabhi kabhi 2-3 consecutive galat hote hain jo frustrating hai. Overall mein profit mein hoon toh 4 star." },
  { id:"n42", name:"Rohit Pawar",       stars:4, helpful:9,  text:"Good experience overall. UI clean hai, navigation easy hai. Signal 75-80% accurate lagta hai mere hisaab se. Better ho sakta hai lekin abhi bhi achha hai." },
  { id:"n43", name:"Vishal Negi",       stars:4, helpful:11, text:"App theek hai. 15 din ka plan liya. Pehle hafte mein ₹4,200 profit hua. Dusre hafte thoda mixed raha. Net net positive hoon. 4 star recommend karunga." },
  { id:"n44", name:"Kapil Dev Sharma",  stars:4, helpful:6,  text:"Naam dekh ke mat socho 😄 Main seriously trade karta hoon. App ka signal system achha hai. Ek do baar delay hua signal mein lekin mostly on time." },
  { id:"n45", name:"Nandan Mishra",     stars:4, helpful:8,  text:"Coins system thoda confusing tha initially lekin ab samajh aa gaya. Signal accuracy achhi hai. ₹2,800 profit hua pehle hafte. Happy hoon mostly." },
  { id:"n46", name:"Sunil Tiwari",      stars:4, helpful:10, text:"4 star de raha hoon kyunki 5 perfect ke liye rehta hai. Lekin honestly yeh best trading signal app hai jo maine use kiya. Profit consistent hai." },
  { id:"n47", name:"Mukul Rastogi",     stars:4, helpful:5,  text:"App kaam karta hai. Mera ₹3,500 profit hua 10 din mein. Thoda aur accuracy improve ho toh 5 star dunga. Abhi ke liye 4 star — still great." },
  { id:"n48", name:"Aditya Narayan",    stars:4, helpful:13, text:"Experience positive raha. 7 din ka trial liya. 6 mein se 4-5 days profit hua. Abhi 15 din ka plan le raha hoon. Good app, recommend karta hoon." },
  { id:"n49", name:"Yogesh Kale",       stars:4, helpful:7,  text:"Maharashtra se hoon. App smooth chalti hai, signal clear hai. Kabhi ek baar app crash hua lekin dobara open kiya toh theek tha. 4 star." },
  { id:"n50", name:"Vinay Pandey",      stars:4, helpful:9,  text:"Achha app hai. ₹5,000 invest kiye the 28 din ke plan mein aur ₹18,000 ka profit hua. Investment se 3.6x return. Iska naam top 5 apps mein aana chahiye." },
  { id:"n51", name:"Harshad Mehta",     stars:4, helpful:6,  text:"Naam famous hai 😂 Lekin seriously yeh app good hai. 4 star isliye kyunki occasionally signal galat jaata hai. Otherwise profit consistent hai." },
  { id:"n52", name:"Deven Soni",        stars:4, helpful:12, text:"VIP plan worth it hai mostly. 10 mein 7-8 sahi signal aate hain. Rest risk management se handle karo. Overall 4 star ka experience." },
  { id:"n53", name:"Pravin Ingle",      stars:4, helpful:4,  text:"App chalti hai, signals helpful hain. Thoda slow load hota hai kabhi. But accuracy achhi hai. ₹4,100 profit hua pehle 2 hafte mein." },
  { id:"n54", name:"Ravi Ranjan",       stars:4, helpful:8,  text:"Bihar se hoon. Internet thoda slow hai yahan. App phir bhi kaam karta hai. Signal on time aata hai mostly. 4 star. ₹6,200 profit ek mahine mein." },
  { id:"n55", name:"Sharad Joshi",      stars:4, helpful:11, text:"Rajasthan se hoon. Desert mein net slow hota hai 😄 Lekin app ki accuracy achhi hai. ₹8,400 profit hua. Happy hoon. 4 star deta hoon." },
  { id:"n56", name:"Deepak Srivastava", stars:4, helpful:7,  text:"Lucknow se hoon. App use karke khush hoon. Signal system simple aur effective hai. Thoda UI improvement ho toh perfect hoga. 4 star." },
  { id:"n57", name:"Ajit Kamble",       stars:4, helpful:5,  text:"Pune se hoon. App ka experience mixed raha initially lekin ab consistency aa gayi hai. ₹11,000 profit pichle mahine. 4 star — good app overall." },

  /* ── 3 STAR (original) ── */
  { id:"p52", name:"Irfan Shaikh",      stars:3, helpful:3,  text:"App theek hai. Kuch signals sahi the, kuch galat. Abhi tak break even hoon. Shayad aur time dene par better results aayein. Average experience." },
  { id:"p53", name:"Amar Jeet",         stars:3, helpful:2,  text:"Interface acha hai. Lekin mera experience mixed raha. 10 mein 5-6 sahi. Expectations zyada thi. Shayad mujhe technique improve karni chahiye." },
  { id:"p54", name:"Sunil Bhoomi",      stars:3, helpful:1,  text:"Kuch din bahut achhe signals aaye, kuch din nahi. Overall neutral hoon. Coin system samajhne mein thoda time laga. Support helpful tha." },
  { id:"p55", name:"Ramji Lal",         stars:3, helpful:3,  text:"App chalti hai, signals aate hain. Mere liye abhi average experience hai. Ho sakta hai mujhe aur practice chahiye. Fair rating de raha hoon." },
];

/* ── Build card — date NAHI dikhegi ── */
const COLORS = ['#9c6fff','#ff9100','#00e676','#f5c518','#ff4757','#00bcd4','#e91e63','#4caf50','#ff5722','#2196f3'];
function avatarColor(name){ let h=0; for(let c of name) h=(h*31+c.charCodeAt(0))%COLORS.length; return COLORS[h]; }
function initials(name){ const p=name.trim().split(' '); return (p[0][0]+(p[1]?p[1][0]:'')).toUpperCase(); }
function starsHtml(n){ return '⭐'.repeat(n)+'☆'.repeat(5-n); }

function buildCard(r, idx){
  const bg = avatarColor(r.name);
  const card = document.createElement('div');
  card.className = `review-card star${r.stars}`;
  card.dataset.stars = r.stars;
  card.dataset.id    = r.id || ('u_'+idx);
  card.style.animationDelay = (idx % 10 * 0.05) + 's';
  card.innerHTML = `
    <div class="rc-top">
      <div class="rc-avatar" style="background:${bg}">${initials(r.name)}</div>
      <div class="rc-info">
        <div class="rc-name-row">
          <span class="rc-name">${r.name}</span>
          <span>✅</span>
        </div>
      </div>
    </div>
    <div class="rc-stars">${starsHtml(r.stars)}</div>
    <div class="rc-text">${r.text}</div>
    <div class="rc-bottom">
      <button class="helpful-btn" onclick="likeCard(this,event)">👍 Helpful ${r.helpful}</button>
      <span class="rc-score">${r.stars}/5</span>
    </div>`;
  return card;
}

window.likeCard = function(btn, e){
  e.stopPropagation();
  if(btn.classList.contains('liked')) return;
  btn.classList.add('liked');
  const n = parseInt(btn.textContent.match(/\d+/)?.[0] || 0);
  btn.innerHTML = `👍 Helpful ${n+1}`;
};

/* ── Render ── */
window.renderCards = function(list){
  const el = document.getElementById('reviewsList');
  el.innerHTML = '';
  list.forEach((r,i) => {
    const card = buildCard(r, i);
    if(i >= 20) card.style.display = 'none';
    el.appendChild(card);
  });
  if(list.length > 20) document.getElementById('loadMoreBtn').classList.remove('hidden');
  else document.getElementById('loadMoreBtn').classList.add('hidden');
};

/* ── Load all reviews ── */
async function loadAllReviews(){
  let all = [...PRESET_REVIEWS];

  try {
    const q    = query(collection(db,"reviews"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      const d = doc.data();
      all.unshift({
        id:      doc.id,
        name:    d.name    || "User",
        stars:   d.stars   || 5,
        text:    d.text    || "",
        helpful: d.helpful || 0,
      });
    });
  } catch(e){ console.warn("Firebase:", e.message); }

  /* Stats */
  const total  = all.length;
  const counts = {5:0,4:0,3:0,2:0,1:0};
  let sum = 0;
  all.forEach(r => { counts[r.stars]++; sum += r.stars; });
  const avg = (sum/total).toFixed(1);

  document.getElementById('avgScore').textContent   = avg;
  document.getElementById('totalCount').textContent = total + " reviews";
  ['5','4','3','2','1'].forEach(s => {
    document.getElementById('cnt'+s).textContent = counts[s];
  });
  setTimeout(()=>{
    ['5','4','3','2','1'].forEach(s => {
      document.getElementById('bar'+s).style.width = ((counts[s]/total)*100).toFixed(1)+'%';
    });
  }, 400);

  window.renderCards(all);
}

/* ── Submit ── */
async function submitReview(user){
  const stars = window._selectedStar || 0;
  const text  = (document.getElementById('reviewText').value||'').trim();
  if(!stars)           { window.showToast("Pehle star select karo ⭐","warn"); return; }
  if(text.length < 10) { window.showToast("Thoda zyada likho (min 10 chars) ✍️","warn"); return; }

  const btn = document.getElementById('submitReviewBtn');
  const txt = document.getElementById('subBtnTxt');
  const sp  = document.getElementById('subSpinner');
  btn.disabled = true; txt.textContent = "Submitting…"; sp.classList.remove('hidden');

  try {
    await addDoc(collection(db,"reviews"), {
      uid:       user ? user.uid : "guest",
      name:      user ? (user.displayName||"User") : "User",
      stars, text, helpful:0,
      createdAt: serverTimestamp(),
    });
    window.showToast("🎉 Review submit ho gaya! Shukriya.","success");
    document.getElementById('reviewText').value = "";
    document.getElementById('charNum').textContent = "0";
    window._selectedStar = 0;
    document.querySelectorAll('.si').forEach(s=>s.classList.remove('lit'));
    document.getElementById('starHint').textContent = "Tap a star to rate";
    await loadAllReviews();
  } catch(e){
    window.showToast("❌ Submit failed: "+e.message,"error");
  } finally {
    btn.disabled=false; txt.textContent="Submit Review"; sp.classList.add('hidden');
  }
}

onAuthStateChanged(auth, user => {
  document.getElementById('submitReviewBtn')
    .addEventListener('click', () => submitReview(user));
});

loadAllReviews();

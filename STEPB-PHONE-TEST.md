# Step B — Account binding: phone test (PREVIEW మాత్రమే)

> ఈ test మొత్తం **preview database** మీద జరుగుతుంది. Students వాడే database ని ఏదీ touch చేయదు.
> ప్రతి section చివర ✅ / ❌ నాకు పంపండి. ❌ వస్తే అక్కడే ఆగండి.

---

## 0. ముందు తెలుసుకోండి

| | |
|---|---|
| **Preview URL** | `https://mind-power-vaultt-git-stepb-ac-871eed-mpviwm2025-9339s-projects.vercel.app/portal` |
| **Account A** | `ssjservices2023+stepb1@gmail.com` · password `Stepb-58a63aadec` |
| **Account B** (Section H మాత్రమే) | `ssjservices2023+stepb2@gmail.com` · password `Stepb-fd8eae2728` |

రెండూ preview DB లో మాత్రమే ఉన్నాయి — real site లో పని చేయవు. Sections A–G లో Account A మాత్రమే వాడండి.

- **Login ఎలా:** Portal లో **Sign in** → email type చేయండి → కింద ఉన్న ఎర్ర dashed box
  **🧪 PREVIEW TEST LOGIN** లో password → **Test login**.
  *"Send OTP" వాడకండి* — preview database email కి code పంపదు.
- **🧪 TEST button** (పైన కుడి వైపు, ఎర్ర banner కింద): tap చేస్తే ఈ phone state చూపిస్తుంది
  (binding, trades count, unsynced, PIN) + test tools ①②③④.
- **Chrome normal tab** వాడండి. Home screen app / real site tab వాడకండి.
- ఏ WhatsApp message కూడా **send చేయకండి** — open అయిందో లేదో మాత్రమే చూడండి.

---

## A. PREVIEW banner

| # | చేయండి | కనిపించాలి |
|---|---|---|
| A1 | `https://mind-power-vaultt-git-stepb-ac-871eed-mpviwm2025-9339s-projects.vercel.app/` open చేయండి | పైన full width **ఎర్ర banner: ⚠ PREVIEW — TEST DATA ⚠**, కింద `ఇది students వాడే site కాదు · … · DB: staging` |
| A2 | Banner మీద ✕ / close కోసం వెతకండి, banner మీద tap చేయండి | Close option **లేదు**. Tap చేస్తే ఏమీ జరగదు |
| A3 | Page కిందకి scroll చేయండి | Banner పైనే fixed గా ఉంటుంది |
| A4 | `https://mind-power-vaultt-git-stepb-ac-871eed-mpviwm2025-9339s-projects.vercel.app/portal` open చేయండి | Portal లో కూడా అదే banner. Chrome tab title `[PREVIEW] …` తో మొదలవుతుంది |
| A5 | వేరే tab లో `mindpowervaultt.com/portal` open చేయండి (login **చేయకండి**) | ఎర్ర banner **లేదు**, 🧪 TEST button **లేదు**, test login box **లేదు**. చూసి tab close చేయండి |

---

## B. కొత్త phone — blank bind

| # | చేయండి | కనిపించాలి |
|---|---|---|
| B1 | Preview portal లో 🧪 TEST tap | `binding (mpvOwner): — లేదు`, `trades: 0`, `blank device: yes`. *(yes కాకపోతే నాకు చెప్పండి — ముందు clean చేయాలి)* |
| B2 | Test login (section 0 లాగా) | Journal open → onboarding. **PIN 4 digits set చేయండి, గుర్తుంచుకోండి.** Onboarding finish |
| B3 | 🧪 TEST tap | `binding: s***@gmail.com` |
| B4 | **2 trades** add చేయండి. Sync dot **✓ synced** అయ్యే వరకు ఆగండి | ✓ synced |
| B5 | 🧪 TEST tap | `trades: 2`, `unsynced: no` |

👉 **"B done" అని నాకు పంపండి** — cloud లో 2 trades ఉన్నాయో నేను preview DB లో check చేస్తా.

---

## C. First-open proof — **BIND** (update తర్వాత real student phone ఇలానే ఉంటుంది)

| # | చేయండి | కనిపించాలి |
|---|---|---|
| C1 | 🧪 TEST → **① Binding తీసేయి** → OK | Page reload అవుతుంది |
| C2 | PIN enter చేయండి | Journal **normal గా** open. **ఏ popup / warning రాదు.** Restore toast రాదు. Sync dot ✓ synced |
| C3 | 🧪 TEST tap | `binding: s***@gmail.com` మళ్ళీ వచ్చింది. `trades: 2` — ఏదీ పోలేదు |

---

## D. First-open proof — **REFUSE** (వేరే account data కలిసిన phone)

| # | చేయండి | కనిపించాలి |
|---|---|---|
| D1 | 🧪 TEST → **② వేరే account పాత trade కలుపు + binding తీసేయి** → OK | Reload. Screen: **⏸ Cloud sync ఆపాం — మీ data ఈ phone లో safe**. Code: **FOREIGN_RECORDS** |
| D2 | 🧪 TEST tap | `binding: — లేదు`, `trades: 3`, `TEST-FOREIGN trades: 1`. **ఏదీ delete కాలేదు** |
| D3 | **📥 Backup download చేయి** → PIN అడుగుతుంది → **తప్పు PIN** (`1111`) | `❌ PIN తప్పు — backup download కాలేదు.` File download **కాదు** |
| D4 | మళ్ళీ **📥 Backup download చేయి** → **సరైన PIN** | `✅ MPV_Backup_2026-…json download అయింది`. Phone Downloads లో file ఉంది |
| D5 | **💬 Mentor కి WhatsApp చేయి** | WhatsApp open, message లో `Code: FOREIGN_RECORDS`. **Send చేయకండి** — back వచ్చేయండి |
| D6 | **Journal ఈ phone లో వాడు (sync లేకుండా) →** → PIN | Journal open. Sync dot: **⏸ sync ఆగింది** |
| D7 | **1 trade** add చేయండి | Dot ⏸ గానే ఉంటుంది (sync అవ్వదు) |
| D8 | Sync dot (**⏸ sync ఆగింది**) మీద tap | Refusal screen మళ్ళీ open — Backup button అక్కడే ఉంది. "Journal ఈ phone లో వాడు" తో close |

👉 **"D done" అని పంపండి** — cloud row మారలేదని (ఇంకా 2 trades, TEST-FOREIGN 0) నేను check చేస్తా.

---

## E. Refused phone లో Logout — ఒక్క tap తో data పోకూడదు

| # | చేయండి | కనిపించాలి |
|---|---|---|
| E1 | More (☰) → **🚪 Logout** | ఎర్ర screen: **Logout చేస్తే ఈ phone లో ఉన్న journal పోతుంది** |
| E2 | **Backup తీసుకున్నాను — Logout చేయి** button చూడండి | Faded — tap చేసినా ఏమీ జరగదు (backup ఇంకా తీసుకోలేదు) |
| E3 | **వద్దు** | Journal కి back. 🧪 TEST: `trades: 4` — ఏమీ మారలేదు |

*(ఇక్కడ నిజంగా logout చేయకండి.)*

---

## F. Cleanup → మళ్ళీ BIND

| # | చేయండి | కనిపించాలి |
|---|---|---|
| F1 | 🧪 TEST → **③ TEST-FOREIGN trade తీసేయి** → OK → PIN | Refusal screen **రాదు**. Journal normal. Dot ✓ synced |
| F2 | 🧪 TEST tap | `binding: s***@gmail.com`, `TEST-FOREIGN trades: 0`, `trades: 3`, `unsynced: no` |

👉 **"F done" అని పంపండి** — D7 trade cloud కి వెళ్ళిందని (3 trades, TEST-FOREIGN 0) check చేస్తా.

---

## G. Normal Logout

| # | చేయండి | కనిపించాలి |
|---|---|---|
| G1 | More → 🚪 Logout | **Logout చేయాలా?** screen, 3 points: ☁️ ముందు sync (కుదరకపోతే logout ఆపుతాం) · 📱 ఈ phone నుండి journal తీసేస్తాం, cloud లో safe · 🔐 PIN మళ్ళీ set చేయాలి. Telugu సరిగ్గా, అర్థమయ్యేలా ఉందా? |
| G2 | **వద్దు** → **Airplane mode ON** → 1 trade add → More → Logout → **అవును, Logout చేయి** | **⚠️ Sync కాలేదు — logout ఆపాం**. **Cancel**. 🧪 TEST: `trades: 4`, `unsynced: YES`, binding ఉంది |
| G3 | **Airplane mode OFF** → dot ✓ synced వరకు ఆగండి → More → Logout → **అవును** | Portal page open అవుతుంది |
| G4 | 🧪 TEST tap | `binding: — లేదు`, `trades: 0`, `PIN set: no`, `blank device: yes` |
| G5 | Test login మళ్ళీ | Journal open, toast **మీ journal cloud నుండి restore అయింది ✦**, **4 trades**. **PIN screen రాదు**, onboarding రాదు |
| G6 | More → PIN Lock → PIN set | PIN updated ✦ |

👉 **"G done" అని పంపండి.**

---

## H. ఒకే phone లో రెండు accounts — ఈ fix మొత్తం దీని కోసమే

**H0. మొదలుపెట్టే ముందు**
- "G done" పంపాక నేను preview కి చిన్న update push చేస్తా (🧪 TEST లో account tag + lock screen wording).
  "కొత్త version వచ్చింది — refresh చేయి" వస్తే **refresh** చేయండి (రాకపోతే More → 🔄 App Update చేయి).
- 🧪 TEST లో binding `s***@gmail.com (+stepb1)` అని **+tag తో** కనిపిస్తే కొత్త version వచ్చినట్టు. Tag లేకపోతే H మొదలుపెట్టకండి.
- **A** = `+stepb1` (`Stepb-58a63aadec`) · **B** = `+stepb2` (`Stepb-fd8eae2728`)
- మొదలు state: A journal open, **4 trades**, dot **✓ synced**.
- *రెండు accounts వాడాలంటే Logout చేయకుండా address bar లో `/portal` type చేసి వెళ్ళండి — అదే test.*

### H1. A phone మీద B login (A పూర్తిగా sync అయి ఉంది) → A data clear, B ఖాళీగా మొదలు

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H1.1 | A journal లో dot ✓ synced చూడండి → 🧪 TEST | binding `(+stepb1)`, trades 4, unsynced no, PIN set yes |
| H1.2 | Logout **చేయకుండా** address bar లో `/portal` → Sign in → **+stepb2** → B password → Test login | B journal **onboarding** screen. A trades ఎక్కడా కనిపించవు. PIN screen రాదు |
| H1.3 | 🧪 TEST | binding `(+stepb2)`, trades 0, PIN set no |
| H1.4 | Onboarding finish, PIN **5678** set. **1 trade** add → ✓ synced | ✓ synced |

👉 **"H1 done"** — A cloud ఇంకా 4 trades (మారలేదు), B cloud 1 trade, రెండింటిలో common trade 0 అని check చేస్తా.

### H2. తిరిగి A → A journal cloud నుండి వస్తుంది, B trade కనిపించదు

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H2.1 | `/portal` → **+stepb1** → Test login | Toast **మీ journal cloud నుండి restore అయింది ✦**, **4 trades**, B trade లేదు. PIN screen రాదు |
| H2.2 | 🧪 TEST | binding `(+stepb1)`, trades 4 |
| H2.3 | More → PIN Lock → PIN **1357** set | PIN updated ✦ |

### H3. A కి sync కాని మార్పు ఉండగా B login → **REFUSE** (A పని పోకూడదు)

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H3.1 | **Airplane mode ON** → A journal లో **1 trade** add | dot ⌁ offline |
| H3.2 | Address bar లో `/portal` open → page వచ్చినా రాకపోయినా **Airplane mode OFF** → `/portal` **reload** | Portal page. **Journal open చేయకండి** |
| H3.3 | 🧪 TEST | binding `(+stepb1)`, trades 5, **unsynced YES**. *(YES కాకపోతే: ④ Unsynced mark చేయి → OK, నాకు చెప్పి కొనసాగించండి)* |
| H3.4 | Sign in → **+stepb2** → Test login | **⛔ ఈ login ఆపాం** — "cloud కి ఇంకా వెళ్ళని మార్పులు ఉన్నాయి… ఏమీ delete చేయలేదు", 3 steps |
| H3.5 | 📥 Backup download చేయి → PIN **1111** | ❌ PIN తప్పు — download కాదు |
| H3.6 | 📥 Backup download చేయి → PIN **1357** | ✅ file download |
| H3.7 | 💬 Mentor కి WhatsApp చేయి | Message లో `Code: SWITCH_UNSYNCED`. **Send చేయకండి**, back |
| H3.8 | 🧪 TEST | binding `(+stepb1)`, trades 5, unsynced YES — **ఏదీ clear కాలేదు** |
| H3.9 | ← వెనక్కి → Sign in → **+stepb1** → Test login → PIN 1357 | A journal, 5 trades, dot కొద్ది సేపట్లో ✓ synced |
| H3.10 | ✓ synced అయ్యాక More → 🚪 Logout → అవును, Logout చేయి | Portal page |
| H3.11 | Sign in → **+stepb2** → Test login | B journal, restore toast, **1 trade** మాత్రమే (A 5 trades కాదు) |

👉 **"H3 done"** — A cloud 5, B cloud 1, common 0 check చేస్తా.

### H4. ఒకే phone, రెండు Chrome tabs, రెండు accounts → **LOCK**

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H4.1 | Tab 1 లో B journal dot **✓ synced** చూడండి. Chrome లో **కొత్త tab** → `…/portal` → **+stepb1** → Test login | Tab 2: A journal, restore toast, 5 trades |
| H4.2 | **Tab 1** కి వెళ్ళండి (B journal ఉన్న tab). వెంటనే రాకపోతే 1 నిమిషం ఆగండి | Tab 1: **🔒 ఈ phone లో account మారింది**. Journal కనిపించదు. "ఏమీ delete చేయలేదు" |
| H4.3 | Tab 1: 🧪 TEST | binding `(+stepb1)`, trades 5 — B data A storage లో కలవలేదు |
| H4.4 | **Tab 2 close** చేయండి. Tab 1: **Portal లో మళ్ళీ login అవ్వండి →** | Portal page |
| H4.5 | Sign in → **+stepb1** → Test login | A journal, 5 trades |

*(Tab 2 ని close చేయకుండా ఉంచితే అది కొద్ది సేపట్లో "Session expired" చూపిస్తుంది — expected: ఒక phone లో ఒకేసారి ఒక login.)*

👉 **"H4 done"** — A 5, B 1, B cloud H3 తర్వాత మారలేదు, common 0 check చేస్తా.

### H5. Update కి ముందు phone + వేరే account — ఈ వారం జరిగిన సరిగ్గా అదే → **REFUSE**

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H5.1 | A journal ✓ synced చూడండి → address bar `/portal` → 🧪 TEST → **① Binding తీసేయి** → OK | Portal reload. 🧪 TEST: binding — లేదు, trades 5 |
| H5.2 | Sign in → **+stepb2** → Test login | **⏸ Cloud sync ఆపాం — మీ data ఈ phone లో safe**, Code **FOREIGN_RECORDS** |
| H5.3 | 🧪 TEST | binding — లేదు, trades 5 (A data అలాగే ఉంది) |
| H5.4 | **ఏ button నొక్కకుండా** address bar `/portal` → **+stepb1** → Test login | A journal **normal** — refusal రాదు, 5 trades, ✓ synced |
| H5.5 | 🧪 TEST | binding `(+stepb1)` |

👉 **"H5 done"** — B cloud ఇంకా 1 trade, updated_at మారలేదు (A trades B లోకి వెళ్ళలేదు) check చేస్తా.

### H6. Cleanup

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H6.1 | More → 🚪 Logout → అవును | Portal. 🧪 TEST: binding — లేదు, trades 0 |

👉 **"H done"** — final check. Test accounts preview DB లోనే ఉంటాయి; students database ఎప్పుడూ touch కాలేదు.

---

## నేను preview DB లో check చేసే query (మీరు run చేయాల్సిన అవసరం లేదు)

```sql
with acc as (
  select u.email, j.updated_at, coalesce(j.data->'mpvtr', '[]'::jsonb) as tr
  from auth.users u left join journal_data j on j.user_id = u.id
  where u.email like 'ssjservices2023+stepb%'
)
select email, updated_at,
       jsonb_array_length(tr) as trades,
       (select count(*) from jsonb_array_elements(tr) t where t->>'inst' = 'TEST-FOREIGN') as test_foreign,
       (select count(*) from jsonb_array_elements(tr) t
         where t->>'id' in (select t2->>'id' from acc a2, jsonb_array_elements(a2.tr) t2
                             where a2.email <> acc.email)) as ids_shared_with_other_account
from acc order by email;
```

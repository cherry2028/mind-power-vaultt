# Step B — Account binding: phone test (PREVIEW మాత్రమే)

> ఈ test మొత్తం **preview database** మీద జరుగుతుంది. Students వాడే database ని ఏదీ touch చేయదు.
> ప్రతి section చివర ✅ / ❌ నాకు పంపండి. ❌ వస్తే అక్కడే ఆగండి.

---

## 0. ముందు తెలుసుకోండి

| | |
|---|---|
| **Preview URL** | `__PREVIEW_URL__/portal` |
| **Test email** | `ssjservices2023+stepb1@gmail.com` |
| **Test password** | `Stepb-58a63aadec` (preview DB లో మాత్రమే ఉంది — real site లో పని చేయదు) |

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
| A1 | `__PREVIEW_URL__/` open చేయండి | పైన full width **ఎర్ర banner: ⚠ PREVIEW — TEST DATA ⚠**, కింద `ఇది students వాడే site కాదు · … · DB: staging` |
| A2 | Banner మీద ✕ / close కోసం వెతకండి, banner మీద tap చేయండి | Close option **లేదు**. Tap చేస్తే ఏమీ జరగదు |
| A3 | Page కిందకి scroll చేయండి | Banner పైనే fixed గా ఉంటుంది |
| A4 | `__PREVIEW_URL__/portal` open చేయండి | Portal లో కూడా అదే banner. Chrome tab title `[PREVIEW] …` తో మొదలవుతుంది |
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

## H. రెండు accounts tests — ⏸ WAIT

Account switch tests (వేరే account తో sign-in → clear; unsynced ఉంటే refuse; రెండు tabs లో account మారితే lock)
కి **రెండో test subscription** preview DB లో కావాలి. మీ OK వచ్చాక add చేసి ఈ section పంపుతా.

---

## నేను preview DB లో check చేసే query (మీరు run చేయాల్సిన అవసరం లేదు)

```sql
select j.updated_at,
       jsonb_array_length(coalesce(j.data->'mpvtr','[]'::jsonb)) as trades,
       (select count(*) from jsonb_array_elements(coalesce(j.data->'mpvtr','[]'::jsonb)) t
         where t->>'inst' = 'TEST-FOREIGN') as test_foreign
from journal_data j join auth.users u on u.id = j.user_id
where u.email = 'ssjservices2023+stepb1@gmail.com';
```

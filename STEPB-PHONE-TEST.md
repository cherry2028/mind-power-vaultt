# Step B — Account binding: phone test (PREVIEW మాత్రమే)

> ఈ test మొత్తం **preview database** మీద జరుగుతుంది. Students వాడే database ని ఏదీ touch చేయదు.
> ప్రతి section చివర ✅ / ❌ నాకు పంపండి. ❌ వస్తే అక్కడే ఆగండి.
> *Revised 2026-09-13 after the first full run — every step below is the version that actually worked.*

---

## 0. ముందు తెలుసుకోండి

| | |
|---|---|
| **Preview URL** | `https://mind-power-vaultt-git-stepb-ac-871eed-mpviwm2025-9339s-projects.vercel.app/portal` |
| **Account A** | `ssjservices2023+stepb1@gmail.com` · password `Stepb-58a63aadec` |
| **Account B** (Section H మాత్రమే) | `ssjservices2023+stepb2@gmail.com` · password `Stepb-fd8eae2728` |

రెండూ preview DB లో మాత్రమే ఉన్నాయి — real site లో పని చేయవు.

- **Login ఎలా:** Portal లో **Sign in** → email type చేయండి → కింద ఎర్ర dashed box
  **🧪 PREVIEW TEST LOGIN** లో password → **Test login**.
  *"Send OTP" వాడకండి* — preview database email కి code పంపదు.
  **Test login నొక్కే ముందు email field లో సరైన account (+stepb1 / +stepb2) ఉందో చూడండి.**
- **🧪 TEST panel** (పైన కుడి వైపు): **LIVE** — ప్రతి అర second మళ్ళీ చదువుతుంది. పైన `read at` time తిరుగుతూ ఉండాలి.
  Rows: page, binding, unsynced, last sync stamp, trades, PIN. కింద **Decision trail** — app తీసుకున్న ప్రతి
  binding నిర్ణయం (`signin_deferred`, `refused_foreign_records`, …) ఈ tab లో.
- **Tools ①②③④ ని ఎప్పుడూ `/portal` page లో మాత్రమే నొక్కండి.** `/journal` లో నొక్కితే reload అయిన journal వెంటనే
  మళ్ళీ check చేసి binding తిరిగి పెడుతుంది — tool పని చేయనట్టే.
- **ప్రతి "setup check" లో మూడూ ఒకేసారి match అవ్వాలి: page + binding + trades.** Binding ఒక్కటే చూడటం సరిపోదు.
- Chrome normal tab వాడండి. ఏ WhatsApp message కూడా **send చేయకండి**.

---

## A. PREVIEW banner

| # | చేయండి | కనిపించాలి |
|---|---|---|
| A1 | Preview URL open | పైన full width **ఎర్ర banner: ⚠ PREVIEW — TEST DATA ⚠**, కింద `… · DB: staging`. Close option లేదు, scroll చేసినా fixed |
| A2 | Chrome tab title చూడండి | `[PREVIEW] …` తో మొదలవుతుంది |

---

## B. కొత్త phone — blank bind

| # | చేయండి | కనిపించాలి |
|---|---|---|
| B1 | 🧪 TEST | page `/portal`, binding **— లేదు**, trades **0**, blank device **yes** *(yes కాకపోతే నాకు చెప్పండి)* |
| B2 | Test login **A** | Journal → onboarding. **PIN 4 digits set చేయండి, గుర్తుంచుకోండి.** Finish. Trail: `signin_bound_new_device` |
| B3 | **2 trades** add → **✓ synced** వరకు ఆగండి | ✓ synced. 🧪: binding `(+stepb1)`, trades 2, unsynced no |

👉 **"B done"**

---

## C. First-open proof — **BIND** (update తర్వాత real student phone)

| # | చేయండి | కనిపించాలి |
|---|---|---|
| C1 | Address bar లో `/portal` type చేయండి (Back కాదు). 🧪 → **⑤** trail clear | Page `/portal` |
| C2 | **`/portal` లో ఉండగానే** 🧪 → **① Binding తీసేయి** → OK | Portal reload |
| C3 | **Setup check** — 🧪 లో మూడూ: | page **`/portal`** · binding **— లేదు** · trades **2**. *ఒక్కటి తప్పినా ఆగండి* |
| C4 | Email **+stepb1** చూసి → Test login | Journal **normal** (PIN screen → PIN). **Popup రాదు.** ✓ synced. Trail: `signin_deferred` → `bound_proven`. 🧪: binding `(+stepb1)`, trades 2 |

---

## D. First-open proof — **REFUSE** (వేరే account data కలిసిన phone)

| # | చేయండి | కనిపించాలి |
|---|---|---|
| D1 | Address bar `/portal`. 🧪 → **⑤** trail clear | Page `/portal` |
| D2 | **`/portal` లో ఉండగానే** 🧪 → **② వేరే account పాత trade కలుపు + binding తీసేయి** → OK | Portal reload |
| D3 | **Setup check** — 🧪 లో అన్నీ: | page **`/portal`** · binding **— లేదు** · trades **3** · TEST-FOREIGN **1** |
| D4 | Email **+stepb1** చూసి → Test login | **⏸ Cloud sync ఆపాం — మీ data ఈ phone లో safe**, Code **FOREIGN_RECORDS**. Trail: `signin_deferred` → `refused_foreign_records`. 🧪: binding — లేదు, trades 3 |
| D5 | **📥 Backup download చేయి** → PIN **1111** (తప్పు) | `❌ PIN తప్పు` — download **కాదు** |
| D6 | **📥 Backup download చేయి** → సరైన PIN | `✅ MPV_Backup_…json download అయింది` |
| D7 | **Journal ఈ phone లో వాడు (sync లేకుండా) →** → PIN | Journal open, dot **⏸ sync ఆగింది** |
| D8 | **1 trade** add | Dot ⏸ గానే. 🧪: trades 4 |
| D9 | Dot (**⏸ sync ఆగింది**) మీద tap | Refusal screen మళ్ళీ open. "Journal ఈ phone లో వాడు" తో close |

👉 **"D done"** — cloud లో ఇంకా 2 trades, TEST-FOREIGN 0 అని check చేస్తా.

---

## E. Refused phone లో Logout — ఒక్క tap తో data పోకూడదు

| # | చేయండి | కనిపించాలి |
|---|---|---|
| E1 | More (☰) → **🚪 Logout** | ఎర్ర screen: **Logout చేస్తే ఈ phone లో ఉన్న journal పోతుంది** |
| E2 | **Backup తీసుకున్నాను — Logout చేయి** చూడండి | Faded — tap చేసినా ఏమీ జరగదు |
| E3 | **వద్దు** | Journal కి back. 🧪: trades 4 |

---

## F. Cleanup → మళ్ళీ BIND

| # | చేయండి | కనిపించాలి |
|---|---|---|
| F1 | Address bar `/portal`. 🧪 → **⑤** trail clear | Page `/portal` |
| F2 | **`/portal` లో ఉండగానే** 🧪 → **③ TEST-FOREIGN trade తీసేయి** → OK | Portal reload |
| F3 | **Setup check** — 🧪 లో అన్నీ: | page **`/portal`** · binding **— లేదు** · trades **3** · TEST-FOREIGN **0** · unsynced **YES** |
| F4 | Email **+stepb1** చూసి → Test login → PIN | Refusal **రాదు**. ✓ synced. Trail: `signin_deferred` → `bound_proven`. 🧪: binding `(+stepb1)`, unsynced no |

👉 **"F done"** — D8 trade cloud కి వెళ్ళిందని (3 trades, TEST-FOREIGN 0) check చేస్తా.

---

## G. Logout

| # | చేయండి | కనిపించాలి |
|---|---|---|
| G1 | More → 🚪 Logout | **Logout చేయాలా?** — ☁️ ముందు sync · 📱 ఈ phone నుండి journal తీసేస్తాం, cloud లో safe · 🔐 PIN మళ్ళీ set చేయాలి. Telugu సరిగ్గా ఉందా? → **వద్దు** |
| G2 | **ముందు network OFF** (Airplane mode / DevTools → Network → Offline). **తర్వాతే** 1 trade add | Dot ⌁ offline |
| G3 | 🧪 | **unsynced YES**, trades 4. *(no అయితే: trade network off చేయకముందే sync అయింది — G2 మళ్ళీ చేయండి)* |
| G4 | More → Logout → **అవును, Logout చేయి** | **⚠️ Sync కాలేదు — logout ఆపాం**. **Cancel**. 🧪: binding ఉంది, trades 4, unsynced YES. Trail: `logout_refused_unsynced` |
| G5 | **Network ON** → ✓ synced వరకు ఆగండి → More → Logout → **అవును** | Portal. 🧪: binding — లేదు, trades 0, PIN set no. Trail: `logout_done` |
| G6 | Test login **A** | Toast **మీ journal cloud నుండి restore అయింది ✦**, **4 trades**, PIN screen రాదు |

👉 **"G done"** — cloud లో 4 trades check చేస్తా.

---

## H. ఒకే phone లో రెండు accounts — ఈ fix మొత్తం దీని కోసమే

మొదలు: A journal open, **4 trades**, ✓ synced. Logout **చేయకుండా** address bar లో `/portal` type చేసి account మారండి.

### H1. A phone మీద B (A పూర్తిగా sync) → A data clear, B ఖాళీగా

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H1.1 | `/portal`. **Setup check:** | page `/portal` · binding `(+stepb1)` · trades 4 · unsynced no |
| H1.2 | Email **+stepb2** చూసి → Test login | B **onboarding**, A trades ఎక్కడా లేవు, PIN screen రాదు. Trail: `signin_switch_cleared` |
| H1.3 | Onboarding finish (PIN **5678**). **1 trade** add → ✓ synced | 🧪: binding `(+stepb2)`, trades 1 |

👉 **"H1 done"** — A cloud 4 (మారలేదు), B 1, common 0.

### H2. తిరిగి A

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H2.1 | `/portal` → email **+stepb1** చూసి → Test login | Restore toast, **4 trades**, B trade లేదు. Trail: `signin_switch_cleared` |
| H2.2 | More → PIN Lock → PIN **1357** | PIN updated ✦ |

### H3. A కి sync కాని మార్పు ఉండగా B → **REFUSE**

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H3.1 | A journal ✓ synced చూసి → address bar `/portal` | Page `/portal` |
| H3.2 | **`/portal` లో ఉండగానే** 🧪 → **④ Unsynced mark చేయి** → OK | Portal reload |
| H3.3 | **Setup check:** | page **`/portal`** · binding **`(+stepb1)`** · trades **4** · unsynced **YES** |
| H3.4 | Email **+stepb2** చూసి → Test login | **⛔ ఈ login ఆపాం**. Trail: `signin_switch_refused_unsynced` |
| H3.5 | 📥 Backup → PIN **1111**, తర్వాత **1357** | మొదటిది ❌, రెండోది ✅ download |
| H3.6 | 🧪 | binding `(+stepb1)`, trades 4, unsynced YES — **ఏదీ clear కాలేదు** |
| H3.7 | ← వెనక్కి → email **+stepb1** → Test login → PIN 1357 | A journal, ✓ synced |
| H3.8 | More → 🚪 Logout → అవును → email **+stepb2** → Test login | B journal, restore toast, **1 trade** మాత్రమే |

👉 **"H3 done"**

### H4. ఒకే phone, రెండు Chrome tabs → **LOCK**

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H4.1 | Tab 1: B journal ✓ synced. **కొత్త tab** → `…/portal` → email **+stepb1** → Test login | Tab 2: A journal, 4 trades |
| H4.2 | **Tab 1** కి వెళ్ళండి (1 నిమిషం లోపు) | **🔒 ఈ phone లో account మారింది**, journal కనిపించదు. Tab 1 trail: `mismatch_locked` |
| H4.3 | Tab 1: 🧪 | binding `(+stepb1)`, trades 4 |
| H4.4 | **Tab 2 close**. Tab 1: **Portal లో మళ్ళీ login అవ్వండి →** → email **+stepb1** → Test login | A journal, 4 trades |

👉 **"H4 done"** — B cloud మారలేదు, common 0.

### H5. Update కి ముందు phone + వేరే account → **REFUSE**

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H5.1 | A journal ✓ synced చూసి → address bar `/portal` → 🧪 → **⑤** trail clear | Page `/portal` |
| H5.2 | **`/portal` లో ఉండగానే** 🧪 → **① Binding తీసేయి** → OK | Portal reload |
| H5.3 | **Setup check** — మూడూ: | page **`/portal`** · binding **— లేదు** · trades **4** |
| H5.4 | **`/journal` open చేయకుండా, Back నొక్కకుండా** — email **+stepb2** చూసి → Test login | **⏸ Cloud sync ఆపాం**, Code **FOREIGN_RECORDS**. Trail: `/portal → signin_deferred`, `/journal → refused_foreign_records`. 🧪: binding — లేదు, trades 4 |
| H5.5 | ఏమీ నొక్కకుండా `/portal` → email **+stepb1** → Test login | A journal normal, 4 trades. Trail: `signin_deferred` → `bound_proven` |

👉 **"H5 done"** — B cloud మారలేదని check చేస్తా.

### H6. Cleanup

| # | చేయండి | కనిపించాలి |
|---|---|---|
| H6.1 | More → 🚪 Logout → అవును | Portal. 🧪: binding — లేదు, trades 0 |

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

Request log: a phone that is **bound** makes **1** `journal_data` read on journal open (the pull); an **unbound** phone
whose data **passes** the proof makes **2** (proof + pull); a **refusal** makes **1** and restores nothing.

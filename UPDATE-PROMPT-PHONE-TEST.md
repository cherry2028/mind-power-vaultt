# Update prompt — phone test (PREVIEW మాత్రమే)

> Branch `fix/update-prompt-reappears`. ఈ test staging database మీద జరుగుతుంది.
> Students వాడే site ని ఏదీ touch చేయదు. ప్రతి step చివర ✅ / ❌ పంపండి.

**ఎందుకు ఈ మార్పు:** ✕ నొక్కిన తర్వాత "కొత్త version వచ్చింది" prompt ఆ session
మొత్తం మళ్ళీ రాదు. అందుకే background లో ఉన్న app రోజుల తరబడి పాత code మీదే
ఉండిపోతుంది — +₹69,600 profit ని loss గా చూపిన build లాంటిది.

**కొత్త rules:**
1. Trade sheet / form తెరిచి ఉంటే prompt **ఎప్పుడూ** రాదు (ముందు ఇదే check).
2. **09:00–15:45 IST మధ్య ఎప్పుడూ రాదు.** Market hours లో journal disturb చేయదు.
3. 15:45 తర్వాత **మొదటిసారి** app కి తిరిగి వచ్చినప్పుడు తప్పకుండా వస్తుంది.
4. మిగతా సమయాల్లో: ✕ నొక్కాక **10 నిమిషాలు** ఆగి మళ్ళీ వస్తుంది
   (preview లో test కోసం **30 సెకన్లు**).

IST device timezone నుండి కాదు — server clock తో సరిచూసి లెక్కిస్తాం. Clock
నమ్మకం లేకపోతే prompt **రాదు** (market hours లో పొరపాటున రాకూడదు).

---

## Setup

| | |
|---|---|
| **Preview** | `https://mind-power-vaultt-git-fix-upda-0d2295-mpviwm2025-9339s-projects.vercel.app/portal` |
| **Login** | ఎప్పటిలాగే 🧪 PREVIEW TEST LOGIN |
| **🧪 panel కొత్త rows** | `build` · `update prompt` · `prompt decision` · `prompt clock` · `prompt IST override` |

🧪 లో కొత్త buttons: **⑩ IST 10:00** · **⑪ IST 16:00** · **⑫ real time** · **⑬ prompt memory reset**

> "వేరే app కి వెళ్ళి వెనక్కి రండి" = home button నొక్కి, WhatsApp తెరిచి,
> మళ్ళీ browser కి రావడం. అదే foreground return.

---

## A. Market hours — prompt రాకూడదు

| # | చేయండి | కనిపించాలి |
|---|---|---|
| A1 | 🧪 → **⑬ prompt memory reset** → **⑩ IST 10:00** | `prompt IST override: 10:00` |
| A2 | వేరే app కి వెళ్ళి వెనక్కి రండి | **Prompt రాకూడదు.** `prompt decision: hide · market_hours` |
| A3 | మళ్ళీ ఒకసారి వెళ్ళి రండి | ఇంకా prompt లేదు |

## B. Market close తర్వాత — మొదటిసారే రావాలి

| # | చేయండి | కనిపించాలి |
|---|---|---|
| B1 | 🧪 → **⑪ IST 16:00** | override `16:00` |
| B2 | వేరే app → వెనక్కి | **"కొత్త version వచ్చింది — refresh చేయి"** prompt. `hide` కాదు: `show · first_after_close` |

## C. Form తెరిచి ఉంటే — prompt పోవాలి

| # | చేయండి | కనిపించాలి |
|---|---|---|
| C1 | Prompt కనిపిస్తుండగా, portal లోని ఏదైనా box లో ఏదైనా type చేయండి | ~3 సెకన్లలో prompt **మాయం**. `hide · entry_in_progress` |
| C2 | Type చేసింది తీసేసి, వేరే app → వెనక్కి | Prompt మళ్ళీ వస్తుంది |
| C3 | Journal → **New Trade** sheet తెరవండి → వేరే app → వెనక్కి | **Prompt రాకూడదు** (`entry_in_progress`) |
| C4 | Sheet మూసేసి → వేరే app → వెనక్కి | Prompt వస్తుంది |

## D. ✕ తర్వాత quiet period

| # | చేయండి | కనిపించాలి |
|---|---|---|
| D1 | Prompt మీద **✕** నొక్కండి | Prompt పోతుంది |
| D2 | వెంటనే వేరే app → వెనక్కి | **రాకూడదు.** `hide · quiet_period` |
| D3 | **30 సెకన్లు** ఆగి → వేరే app → వెనక్కి | Prompt మళ్ళీ వస్తుంది |

## E. Market open అయితే prompt తొలగిపోవాలి

| # | చేయండి | కనిపించాలి |
|---|---|---|
| E1 | Prompt కనిపిస్తుండగా 🧪 → **⑩ IST 10:00** | ~3 సెకన్లలో prompt **మాయం** (`market_hours`) |

## F. Refresh పని చేయాలి

| # | చేయండి | కనిపించాలి |
|---|---|---|
| F1 | 🧪 → **⑪ IST 16:00** → వేరే app → వెనక్కి → prompt | prompt కనిపిస్తుంది |
| F2 | **Refresh** నొక్కండి | Page reload. 🧪 `build` row లో **కొత్త build** కనిపించాలి |

## G. చివర

| # | చేయండి |
|---|---|
| G1 | 🧪 → **⑫ real time** (override తీసేయి) |
| G2 | 🧪 → **⑬ prompt memory reset** |

---

**Production లో తేడా:** quiet period 30 సెకన్లు కాదు, **10 నిమిషాలు**.
🧪 panel, IST override — ఇవి preview builds లో మాత్రమే; students వాడే build లో ఉండవు.

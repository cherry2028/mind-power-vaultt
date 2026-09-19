# Update prompt — phone test (PREVIEW మాత్రమే)

> Branch `fix/update-prompt-reappears`. ఈ test staging database మీద జరుగుతుంది.
> Students వాడే site ని ఏదీ touch చేయదు. ప్రతి step చివర ✅ / ❌ పంపండి.

**ఎందుకు ఈ మార్పు:** ✕ నొక్కిన తర్వాత "కొత్త version వచ్చింది" prompt ఆ session
మొత్తం మళ్ళీ రాదు. అందుకే background లో ఉన్న app రోజుల తరబడి పాత code మీదే
ఉండిపోతుంది — +₹69,600 profit ని loss గా చూపిన build లాంటిది.

**కొత్త rules (3 మాత్రమే):**
1. Trade sheet / form తెరిచి ఉంటే prompt **ఎప్పుడూ** రాదు (ముందు ఇదే check).
2. Journal లో **చివరిగా save చేసి 15 నిమిషాలు** కాకపోతే prompt రాదు
   (preview లో test కోసం **1 నిమిషం**).
3. ✕ నొక్కాక **10 నిమిషాలు** ఆగి మళ్ళీ వస్తుంది (preview లో **30 సెకన్లు**).

**తీసేసినవి:** 09:00–15:45 market-hours block, "15:45 తర్వాత మొదటిసారి"
rule. ఈ journal లో crypto, forex, gold కూడా ఉన్నాయి — 6 journals లో 244
trades లో 09:00–15:59 మధ్య log అయినవి 35 మాత్రమే, busiest hour **20:00**.
కాబట్టి "student busy" అన్నది market clock కాదు, **student రాస్తున్నాడా లేదా**
అన్నదే.

Server clock తో పని లేదు ఇప్పుడు — రెండు rules కూడా ఒకే phone లోని రెండు
stamps మధ్య తేడా. అందుకే offline లో కూడా prompt సరిగ్గా వస్తుంది.

---

## Setup

| | |
|---|---|
| **Preview** | `https://mind-power-vaultt-git-fix-upda-0d2295-mpviwm2025-9339s-projects.vercel.app/portal` |
| **Login** | ఎప్పటిలాగే 🧪 PREVIEW TEST LOGIN |
| **🧪 panel కొత్త rows** | `build` · `update prompt` · `prompt decision` · `last journal write` · `idle / quiet needed` |

🧪 లో కొత్త buttons:
**⑩ ఇప్పుడే రాసినట్టు** · **⑪ రాసి 1 గంట అయినట్టు** · **⑫ write stamp తీసేయి** ·
**⑬ prompt memory reset**

> "వేరే app కి వెళ్ళి వెనక్కి రండి" = home button నొక్కి, WhatsApp తెరిచి,
> మళ్ళీ browser కి రావడం. అదే foreground return.

---

## A. మొదటి prompt

| # | చేయండి | కనిపించాలి |
|---|---|---|
| A1 | 🧪 → **⑬ prompt memory reset** | `last journal write: — (never)` |
| A2 | వేరే app కి వెళ్ళి వెనక్కి రండి | **"కొత్త version వచ్చింది — refresh చేయి"**. `prompt decision: show · idle · foreground` |

## B. Rule 2 — ఇప్పుడే రాస్తే prompt రాకూడదు

| # | చేయండి | కనిపించాలి |
|---|---|---|
| B1 | Prompt కనిపిస్తుండగా 🧪 → **⑩ ఇప్పుడే రాసినట్టు** | ~3 సెకన్లలో prompt **మాయం**. `hide · recent_write` |
| B2 | వేరే app → వెనక్కి | ఇంకా prompt **లేదు** (`recent_write`) |
| B3 | **1 నిమిషం** ఆగి → వేరే app → వెనక్కి | Prompt **వస్తుంది** (`idle`) |

## C. Rule 2 — నిజమైన trade తోనే

| # | చేయండి | కనిపించాలి |
|---|---|---|
| C1 | 🧪 → **⑪ రాసి 1 గంట అయినట్టు** → వేరే app → వెనక్కి | Prompt వస్తుంది |
| C2 | Journal లో ఏదైనా **నిజంగా save** చేయండి (Pre-Market ritual లేదా Foundation save) | Save అయ్యాక 🧪 లో `last journal write: 0s ago` |
| C3 | వేరే app → వెనక్కి | **Prompt రాకూడదు** (`recent_write`) |

> ఇదే అసలు test: app తనంతట తాను చూసుకుంటోందా అని.
> C2 లో save చేయకుండా జరిగితే ❌ పంపండి.

## D. Rule 1 — form తెరిచి ఉంటే

| # | చేయండి | కనిపించాలి |
|---|---|---|
| D1 | 🧪 → **⑪** → వేరే app → వెనక్కి → prompt వచ్చాక, portal లోని ఏదైనా box లో type చేయండి | ~3 సెకన్లలో prompt **మాయం**. `hide · entry_in_progress` |
| D2 | Type చేసింది తీసేసి, వేరే app → వెనక్కి | Prompt మళ్ళీ వస్తుంది |
| D3 | Journal → **New Trade** sheet తెరవండి → వేరే app → వెనక్కి | **Prompt రాకూడదు** (`entry_in_progress`) |
| D4 | Sheet **cancel** చేసి (save చేయకుండా) → వేరే app → వెనక్కి | Prompt వస్తుంది |

## E. Rule 3 — ✕ తర్వాత quiet period

| # | చేయండి | కనిపించాలి |
|---|---|---|
| E1 | Prompt మీద **✕** నొక్కండి | Prompt పోతుంది |
| E2 | వెంటనే వేరే app → వెనక్కి | **రాకూడదు.** `hide · quiet_period` |
| E3 | **30 సెకన్లు** ఆగి → వేరే app → వెనక్కి | Prompt మళ్ళీ వస్తుంది |

## F. Refresh పని చేయాలి

| # | చేయండి | కనిపించాలి |
|---|---|---|
| F1 | Prompt కనిపిస్తుండగా **Refresh** నొక్కండి | Page reload. 🧪 `build` row లో **కొత్త build** |

## G. చివర

| # | చేయండి |
|---|---|
| G1 | 🧪 → **⑬ prompt memory reset** |

---

**Production లో తేడా:** 1 నిమిషం కాదు — **15 నిమిషాలు**; 30 సెకన్లు కాదు —
**10 నిమిషాలు**. 🧪 panel, write-stamp buttons — ఇవి preview builds లో
మాత్రమే; students వాడే build లో ఉండవు.

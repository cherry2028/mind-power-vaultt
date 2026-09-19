# Market setting — phone test (PREVIEW మాత్రమే)

> Branch `feat/market-setting`. ఈ test staging database మీద జరుగుతుంది.
> Students వాడే site ని ఏదీ touch చేయదు. ప్రతి step చివర ✅ / ❌ పంపండి.

**ఏం మారింది:** Foundation లో ఒకే ఒక కొత్త ప్రశ్న — **"ఏ market లో trade
చేస్తావు?"** Indian (equity / F&O) లేదా 24x7 (crypto / forex / gold).
ఆ జవాబు ఆ student కి **"ఈరోజు" ఎక్కడ మొదలై ఎక్కడ ముగుస్తుంది** అన్నది మాత్రమే
నిర్ణయిస్తుంది. ఇంకేదీ మారదు.

| Setting | రోజు ఎప్పుడు మారుతుంది | ఎవరికి |
|---|---|---|
| **Indian** (default) | అర్ధరాత్రి 12:00 — **ఇప్పుడున్నట్టే** | అందరూ, ఏమీ మార్చుకోకపోతే |
| **24x7** | ఉదయం **5:30 IST** (= 00:00 UTC) | crypto / forex / gold |

**ఎందుకు 5:30:** crypto daily candle, daily volume, funding window — అన్నీ
00:00 UTC కి close అవుతాయి. Forex, gold 17:00 New York కి roll అవుతాయి, అదీ
దాదాపు అదే line. అంటే రాత్రి 2 గంటలకు తీసుకున్న position ఇంకా **అదే session**
లోనే ఉంటుంది, మధ్యలో కొత్త రోజు మొదలవదు.

**ముఖ్యం:** ఏ student కీ default మారలేదు. ఈ ప్రశ్నకి జవాబు ఇవ్వకపోతే Indian —
అంటే ఇప్పటికే ఉన్న 6 journals లో **ఏ ఒక్కటీ కదలదు**.

---

## Setup

| | |
|---|---|
| **Preview** | `https://mind-power-vaultt-git-feat-mar-d7b624-mpviwm2025-9339s-projects.vercel.app/portal` |
| **Login** | ఎప్పటిలాగే 🧪 PREVIEW TEST LOGIN |
| **🧪 panel కొత్త rows** | `market (Foundation)` · `day now — Indian / 24x7` |

> `day now` row రెండు తేదీలూ చూపిస్తుంది. **ఉదయం 5:30 నుంచి అర్ధరాత్రి వరకు
> రెండూ ఒకటే** (`same`). అర్ధరాత్రి 12:00 – ఉదయం 5:30 మధ్య మాత్రమే వేరుగా
> ఉంటాయి (`← DIFFERENT`). ఇది తప్పు కాదు — అదే ఈ setting చేసే పని.

---

## A. ఏమీ మార్చకుండా — ఏదీ కదలకూడదు

| # | చేయండి | కనిపించాలి |
|---|---|---|
| A1 | Login → 🧪 open | `market (Foundation): in (default)` |
| A2 | Journal → Evening screen → date field | ఈరోజు తేదీ, ఎప్పటిలాగే |
| A3 | Journal → More → Trade Log | Trades అన్నీ ఎప్పటిలాగే, తేదీలు మారలేదు |
| A4 | Pre-Market ritual చేసి ఉంటే — అది ఇంకా "ఈరోజు complete" గా ఉందా | అవును |

> A లో ఏదైనా మారితే **వెంటనే ఆపి ❌ పంపండి** — default లో ఏదీ మారకూడదు.

## B. ప్రశ్న కనిపించాలి

| # | చేయండి | కనిపించాలి |
|---|---|---|
| B1 | More → Foundation | Capital Framework కింద కొత్త card: **నా Market** |
| B2 | రెండు choices చదవండి | 🇮🇳 Indian — equity / F&O · 🌐 24x7 — crypto / forex / gold |
| B3 | Indian select అయి ఉందా | అవును (highlight అయి ఉంటుంది) |
| B4 | కింది వివరణ చదవండి | "రోజు అర్ధరాత్రి 12:00 కి మారుతుంది — ఇప్పుడు ఉన్నట్టే, ఏ మార్పూ లేదు." |

## C. 24x7 కి మార్చి save

| # | చేయండి | కనిపించాలి |
|---|---|---|
| C1 | **🌐 24x7** నొక్కండి | వివరణ మారుతుంది: "రోజు ఉదయం 5:30 (IST) కి మారుతుంది… 00:00 UTC" |
| C2 | **Foundation Save చేయి ✦** | "Foundation save అయింది ✦" |
| C3 | 🧪 open | `market (Foundation): 24x7` |
| C4 | Foundation మళ్ళీ open చేయండి | 24x7 ఇంకా select అయి ఉంది (save అయింది) |

## D. Sync — రెండో device లో కూడా

| # | చేయండి | కనిபించాలి |
|---|---|---|
| D1 | App close చేసి మళ్ళీ open (లేదా laptop లో login) | Foundation లో ఇంకా **24x7** |

## E. తిరిగి Indian కి

| # | చేయండి | కనిపించాలి |
|---|---|---|
| E1 | Foundation → **🇮🇳 Indian** → Save | 🧪 లో `market: in (default)` |
| E2 | Evening screen → date field | ఈరోజు తేదీ, A2 లో ఉన్నట్టే |

## F. (Optional) సరిహద్దు నిజంగా చూడాలంటే

అర్ధరాత్రి 12:00 – ఉదయం 5:30 మధ్య ఎప్పుడైనా:

| # | చేయండి | కనిపించాలి |
|---|---|---|
| F1 | 🧪 → `day now` row | రెండు తేదీలు **వేరుగా** (`← DIFFERENT`) |
| F2 | Foundation → 24x7 → Save → Evening screen date | `day now` లోని **24x7 తేదీ** (అంటే ముందు రోజు) |
| F3 | Foundation → Indian → Save → Evening screen date | `day now` లోని **Indian తేదీ** |

> F చేయడం కుదరకపోతే పర్వాలేదు — A, B, C, D, E పాస్ అయితే చాలు.

---

**మారని విషయాలు (deliberate):** 3-screen day flow (morning / trade / evening)
ఇంకా Indian market hours మీదే నడుస్తుంది; F&O expiry calculator కూడా అలాగే.
అవి "ఈరోజు ఏది" అనే ప్రశ్న కాదు, వేరే ప్రశ్నలు — వాటిని ఇప్పుడు touch చేయలేదు.

# Changelog

Visų svarbių projekto pakeitimų protokolas.

## [1.1.0] - 2026-04-15 (Dabartinė)

### 🚀 Naujos funkcijos
- **Domeno palaikymas:** Sistema paruošta `reforgermods.com` domenui.
- **Reliatyvus API:** Frontend dabar naudoja `/api` proxy, todėl nebeliko CORS problemų.
- **WORKER_URL kintamasis:** Cloudflare Pages funkcijos dabar palaiko dinaminį worker URL.

### 🛠 Klaidų taisymai (Stability Overhaul)
- **Node.js 24 vykdymas:** Sutvarkytas diegimas panaudojant `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` kintamąjį.
- **Wrangler stabilumas:** Fiksuota `wrangler` versija (`3.101.0`) visose darbo eigose.
- **Projektų pavadinimai:** Ištaisyta klaida, kai diegimas ieškojo `armamods-web` projekto, nors jis vadinasi `armamods-leaderboard`.
- **Kolektoriaus optimizacija:** Duomenų rašymas į KV dabar vyksta sekvenciškai su geresniu klaidų žurnalinimu (prevencija nuo rate-limits).

### 🧹 Valymas
- Ištrintos pasenusios šakos ir uždaryti nebeaktualūs Pull Requests (#1, #2).

## [1.0.1] - 2026-04-13

### 🛠 Klaidų taisymai
- Pirmas bandymas atnaujinti kolektorių į Node 24.
- Ištaisytos TypeScript kompiliavimo klaidos web dalyje.
- Licencijos pakeitimas iš MIT į CC BY-NC 4.0.
- Sutvarkytas istorijos grafikų rodymas (24h vaizdas).

## [1.0.0] - 2026-03-24

### 🎉 Pradinė versija
- Bazinis funkcionalumas: Modų sąrašas, serverių sąrašas, BattleMetrics integracija.
- Cloudflare Workers + D1 + KV infrastruktūros inicializacija.

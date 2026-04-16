# Arma Reforger Mod Leaderboard (reforgermods.com)

## 🎯 Vizija

**Problema**: Arma Reforger Workshop'as yra nepatogus, o modų reitingavimas pagal "likes/subscribes" neatspindi realaus naudojimo.

**Sprendimas**: Sukurti modų leaderbordą, kuris reitinguoja modus pagal **realią statistiką**:
- Kiek serverių šiuo metu naudoja modą
- Kiek žaidėjų realiai žaidžia su šiuo modu
- Trend'ai - kurie modai populiarėja

**Vertė žaidėjui**:
- Greitai rasti populiariausius ir patikimus modus
- Matyti realų modų aktyvumą (ne fake likes)
- Filtruoti pagal kategorijas (survival, roleplay, pvp)

---

## 🛠 Technologijų Stackas

### Architektūra (Cloudflare Native)
```
Hosting:
  - Cloudflare Pages (Frontend / React)
  - Cloudflare Workers (API / Hono)
  - Cloudflare KV (Pagrindinė duomenų saugykla - JSON)
  - Cloudflare Cron Triggers (Data Collector)
```

### Duomenų struktūra (JSON / KV)
Visa informacija saugoma Cloudflare KV kaip JSON objektai:
- `cache:mods` - Pagrindinis modų sąrašas (suskirstytas į blokus dėl dydžio limitų)
- `cache:servers` - Serverių sąrašas
- `cache:stats` - Globali statistika
- `history:hourly:[game]` - Valandinė populiarumo istorija (JSON masyvas)
- `history:daily:[game]` - Dienos populiarumo istorija (JSON masyvas)

---

## 📊 Dabartinė Būsena (Production Ready)

### ✅ Atlikta
- **Data Collector**: Skriptas, kuris kas valandą renka duomenis iš BattleMetrics ir saugo juos KV saugykloje kaip optimizuotus JSON blokus.
- **API (Workers)**: Itin greitas API, naudojantis „Ultra-Optimization“ (tikslinę paiešką tekste) ir „Cloudflare Cache API“, užtikrinant 0% CPU perkrovą net ir dideliems failams.
- **Frontend (Pages)**: Modernus React puslapis, rodantis populiariausius modus su interaktyviais grafikais.
- **Edge Caching**: Įdiegtas globalus talpinimas, leidžiantis pasiekti populiarių modų analitika per <10ms.

---

## 🚧 Planuojami darbai

□ Arma Workshop scraper (modų papildomi metaduomenys) - [IN PROGRESS]
  - Thumbnail/image
  - Autorius
  - Aprašymas
  - Kategorija
  - Failo dydis
- [x] Implement Rank-based Intelligence trending (Overall Rank Delta)
- [x] Extend history tracking to 90 days with monthly hybrid lookup

---

## 📝 Techninės pastabos
- Pasirinkta **KV (JSON)** architektūra užtikrina žaibišką veikimą ir paprastą duomenų valdymą be sudėtingų SQL migracijų.
- Duomenų kiekis valdomas naudojant `CHUNK_SIZE` (500), kad būtų išvengta Cloudflare KV 25MB dydžio apribojimų.

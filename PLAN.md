# Arma Reforger Mod Leaderboard - Projektas

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

### Lokalus vystymas (Dabar)
```
Backend:
  - Node.js + TypeScript
  - Express.js (API server)
  - Prisma ORM (DB abstraction)
  - SQLite (local DB)
  - node-cron (periodinis collector)

Frontend (planuojamas):
  - React + TypeScript
  - Vite (build tool)
  - TailwindCSS (styling)
```

### Produkcija (Cloudflare)
```
Hosting:
  - Cloudflare Pages (Frontend)
  - Cloudflare Workers (API)
  - Cloudflare D1 (Duomenų bazė)
  - Cloudflare KV (Cache)
  - Cloudflare Cron Triggers (Collector)
```

### Išorės API
```
Data source:
  - BattleMetrics API (serverių sąrašas)
  - (Future) Arma Workshop scraper (modų metaduomenys)
```

---

## 📊 Dabartinė Būsena

### ✅ Atlikta (Phase 1 - Backend API)

#### 1. Projekto struktūra
```
armamods/
├── src/
│   ├── api/           # API endpoint'ai
│   │   ├── mods.ts    # GET /api/mods, /api/mods/:id
│   │   └── servers.ts # GET /api/servers
│   ├── services/
│   │   ├── battlemetrics.ts # BM API integracija
│   │   └── collector.ts     # Periodinis duomenų rinkimas
│   ├── lib/
│   │   └── db.ts      # Prisma client
│   └── index.ts       # Express server
├── prisma/
│   └── schema.prisma  # DB schema (Server, Mod, ServerMod)
├── package.json
├── tsconfig.json
└── README.md
```

#### 2. Duomenų bazė (Prisma + SQLite)
**Lentelės**:
- `Server` - serverių info (pavadinimas, žaidėjai, IP)
- `Mod` - modų metaduomenys (modId, pavadinimas)
- `ServerMod` - ryšio lentelė (many-to-many)

#### 3. API Endpoint'ai
- `GET /api/mods` - Populiariausi modai (pagal žaidėjų sk.)
- `GET /api/mods/:modId` - Modo detalė + serveriai
- `GET /api/servers` - Serverių sąrašas su filtrais

#### 4. Collector Service
- Automatiškai kas 10 min. fetchina BattleMetrics
- Upsertina serverius ir modus
- Išvalo neaktyvius serverius (>24h)
- Rate limiting (6s delay užtikrina BM free tier)

---

## 🚧 To Do (Phase 2-4)

### Phase 2: Frontend (React)
```
□ React + Vite projekto setup
□ Komponentai:
  □ ModList (populiariausių modų sąrašas)
  □ ModCard (modo info + statistika)
  □ ServerList (serveriai su modu)
  □ SearchBar (paieška filtravimas)
□ Styling su TailwindCSS
□ API integracija (fetch + loading states)
□ Responsive design
```

### Phase 3: Workshop Scraping
```
□ Arma Workshop scraper (mod metaduomenys)
  - Pavadinimas (jau turim)
  - Thumbnail/image
  - Autorius
  - Aprašymas
  - Kategorija
  - Failo dydis
  - Update data
□ Cache'inimas (nešpjauti per dažnai)
□ Error handling (nenaudoti BM API jei nereikia)
```

### Phase 4: Cloudflare Migracija
```
□ Prisma adapter keitimas: SQLite → D1
□ Express → Cloudflare Workers
□ node-cron → Cloudflare Cron Triggers
□ SQLite → Cloudflare D1
□ Frontend deploy į Cloudflare Pages
□ KV cache (TOP modų sąrašas)
□ Environment variables setup
□ Domain + SSL
```

---

## 🔄 Migracijos Planas (Lokalus → Cloudflare)

### 1. Prisma Schema Pakeitimas
```prisma
// DABAR (local)
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// PRODUKCIJA (Cloudflare D1)
datasource db {
  provider = "cloudflare-d1"
  url      = env("DATABASE_URL") // per wrangler
}
```

### 2. Backend Express → Workers
```typescript
// DABAR (Express)
app.get('/api/mods', async (req, res) => {
  const mods = await prisma.mod.findMany();
  res.json(mods);
});

// PRODUKCIJA (Workers)
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/mods') {
      const mods = await prisma(env.DB).mod.findMany();
      return Response.json(mods);
    }
  }
}
```

### 3. Collector Cron
```typescript
// DABAR (node-cron)
cron.schedule('*/10 * * * *', collectData);

// PRODUKCIJA (wrangler.toml)
[triggers]
crons = ["*/10 * * * *"]

// worker.ts
export default {
  async scheduled(event, env, ctx) {
    await collectData(env);
  }
}
```

### 4. KV Cache (Optimizacija)
```typescript
// Collector rašo į KV po fetch
await env.KV.put('topMods', JSON.stringify(topMods));

// Frontend skaito iš KV (greitai!)
const cached = await env.KV.get('topMods', 'json');
if (cached) return Response.json(cached);
```

---

## 📈 Sėkmės Metrikai

### Technical
- ✅ API response time < 200ms (su KV cache)
- ✅ Collector veikia be crashes
- ✅ DB queries optimized (indeksai)
- ✅ Rate limiting neperžengia BM limits

### Business
- 📊 Unikalių lankytojų per mėnesį
- ⏱️ Avg. time on site (ar žmonės naudojasi)
- 🔁 Return rate (ar grįžta ieškoti naujų modų)

---

## 🎯 MVP Pabaigos Kriterijai

1. ✅ Automatinis duomenų rinkimas (veikia)
2. ✅ API endpoint'ai (veikia)
3. ⏳ Frontend su modų sąrašu (reikia padaryti)
4. ⏳ Deploy į Cloudflare (reikia padaryti)
5. ⏳ Domain + SSL (reikia padaryti)

**Estimas**: 2-3 savaitės iki MVP

---

## 📝 Notes

- BattleMetrics free tier: 10 requests/min, 5000 requests/day
- D1 limits: 5GB storage, 5M reads/day (free)
- Workers: 100k requests/day free
- KV: 100k reads/day, 1k writes/day free

**Potential Issues**:
- Workshop scraping gali būti ribojamas → reikės protingo cache
- BM API gali keisti formatą → reikės error handling
- D1性能 negarantuotas → KV cache išspręs

---

## 🔮 Future Features (Post-MVP)

- User accounts (save favorite mods)
- Mod reviews/ratings
- Server discovery (rasti serverius su konkrečiais modais)
- Discord bot integration
- Historical data (modų populiarumo istorija)
- Email alerts (naujų modų notification'as)

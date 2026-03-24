# Arma Mod Leaderboard 🚀

Modernas Arma Reforger modifikacijų reitingavimo platforma.

## 🏗 Techninis Stackas
- **Frontend**: React + Vite + Tailwind CSS (Tactical Aesthetic)
- **Database**: Cloudflare D1 (Serverless SQL)
- **Runtime**: Cloudflare Workers (Hono framework)

---

## 🛠 Local Development

### 1. Įdiekite priklausomybes
```bash
# Main project
npm install

# Frontend
cd web
npm install
```

### 2. Paleiskite programą
```bash
# Terminalas 1 (Backend)
npm run dev

# Terminalas 2 (Frontend)
cd web
npm run dev
```

---

## ☁️ Cloudflare Deployment

### 1. Sukurkite D1 duomenų bazę
```bash
wrangler d1 create armamods-db
```
Nukopijuokite `database_id` į `wrangler.toml` failą.

### 2. Sukurkite DB lenteles (Initial Schema)
```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > initial.sql
wrangler d1 execute armamods-db --remote --file=initial.sql
```

### 3. Deploy API (Worker)
```bash
npm run build
wrangler deploy
```

### 4. Deploy Website (Pages)
Prijunkite savo GitHub repozitoriją prie Cloudflare Pages dashboard'e.
Instaliavimo nustatymai:
- Framework preset: `Vite`
- Build command: `npm run build`
- Build output: `dist`
- Environment: `Node.js v18+`

---

## 🏁 GitHub Setup
Jei dar nesukūrėte repozitorijos:
1. Eikite į [github.com/new](https://github.com/new)
2. Sukurkite `armamods-leaderboard`
3. Vykdykite terminale:
```bash
git remote add origin https://github.com/YOUR_USER/armamods-leaderboard.git
git branch -M main
git push -u origin main
```

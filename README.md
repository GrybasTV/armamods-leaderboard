# Arma Reforger Mod Leaderboard

API that tracks popular Arma Reforger mods by analyzing active servers.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up database:
```bash
npm run prisma:migrate
npm run prisma:generate
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Start development server:
```bash
npm run dev
```

## API Endpoints

- `GET /api/mods` - Popular mods (pagal žaidėjų skaičių)
- `GET /api/mods/:modId` - Detali informacija apie modą
- `GET /api/servers` - Serverių sąrašas

## Database

Prisma + SQLite (lokalam vystymui)
- Vėliau lengvai migravimas į Cloudflare D1 (tas pats schema!)

## Collector

Automatiškai kas 10 min.:
1. Fetchina serverius iš BattleMetrics
2. Atnaujina modų statistiką
3. Ištrina neaktyvius serverius

## Migration to Cloudflare

```bash
# Keisti schema.prisma:
# datasource db { provider = "sqlite" }
# → datasource db { provider = "cloudflare-d1" }

# Naudojti @prisma/adapter-d1
```

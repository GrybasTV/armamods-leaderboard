# Arma Reforger Mod Leaderboard 🚀

Šis projektas yra skirtas Arma Reforger modams stebėti ir reitinguoti pagal realią serverių bei žaidėjų statistiką, naudojant BattleMetrics API.

## 🛠 Technologijos
- **Frontend**: Vite + React
- **Backend**: Cloudflare Workers + GitHub Actions (duomenų rinkimas)
- **Database**: Cloudflare KV (laikinoji atmintis ir istorija)

## 📊 Kaip tai veikia?
1. **GitHub Actions** kas valandą paleidžia kolektorių (scripts/collector.ts).
2. Kolektorius parsiunčia visus Arma Reforger serverius iš **BattleMetrics**.
3. Duomenys suskaičiuojami ir išsaugomi **Cloudflare KV** saugykloje.
4. **Cloudflare Worker** pateikia šiuos duomenis per paprastą API jūsų naršyklei.

## 🛡 Teisinė informacija ir Licencija
Šis projektas yra platinamas pagal **MIT License**. Galite laisvai naudoti, modifikuoti ir platinti šį kodą asmeniniams ar bendruomenės poreikiams.

## 💼 Komercinis naudojimas
Nors projektas yra atviro kodo, **komercinis naudojimas** (pvz., integravimas į mokamas paslaugas, verslo projektus ar šio kodo pagrindu sukurtų svetainių monetizavimas be susitarimo) yra apribotas. Dėl komercinio naudojimo sąlygų, specialių pritaikymų ar komercinės licencijos prašome susisiekti el. paštu: **info@saulespro.lt**.

---
© 2026 Saulėspro
# Arma Reforger Mod Leaderboard 🚀

This project tracks and ranks Arma Reforger mods based on real server and player statistics using the BattleMetrics API.

## 🛠 Technologies
- **Frontend**: Vite + React
- **Backend**: Cloudflare Workers + GitHub Actions (data collection)
- **Database**: Cloudflare KV (temporary storage and history)

## 📊 How it works?
1. **GitHub Actions** runs the collector (scripts/collector.ts) every hour.
2. The collector fetches all Arma Reforger servers from **BattleMetrics**.
3. Data is calculated and stored in **Cloudflare KV** storage.
4. **Cloudflare Worker** serves this data via a simple API to your browser.

## 🛡 Legal Information and License
This project is distributed under the **MIT License**. You are free to use, modify, and distribute this code for personal or community needs.

## 💼 Commercial Use
While this project is open source, **commercial use** (e.g., integration into paid services, business projects, or monetization of websites based on this code without agreement) is restricted. For commercial use terms, custom adaptations, or commercial licensing, please contact us at: **info@saulespro.lt**.

---
© 2026 Saulėspro

# 🗺️ Project Roadmap: Arma Mods Leaderboard

This document outlines the strategic vision, current implementation status, and future technical milestones for the platform.

---

## 🎯 Strategic Vision

**The Goal**: To provide the Arma community with a data-driven alternative to the official Steam/Reforger Workshop, ranking mods by **actual player engagement** rather than static subscription counts.

---

## 🏗️ System Architecture (Current)

- [x] **Data Ingestion**: Multi-game (Reforger/Arma 3) collector with BattleMetrics API integration.
- [x] **Storage Layer**: Sharded Cloudflare KV (JSON-based) to bypass 25MB limits.
- [x] **API Layer**: High-performance Hono-based Edge API with global caching.
- [x] **Frontend**: Reactive React 19 dashboard with client-side caching.

---

## 🚀 Phase 1: Performance & Stability [COMPLETED]

- [x] **Edge Caching**: Implemented Cloudflare Cache API for <10ms TTFB.
- [x] **Ultra-Optimization**: String-based JSON scanning to reduce Worker CPU usage by 80%.
- [x] **Sharding Engine**: Automated sharding for large history datasets.
- [x] **Dynamic Trending**: Implemented logarithmic trend scoring.

---

## 🚧 Phase 2: Metadata Enrichment [IN PROGRESS]

- [ ] **Arma Workshop Scraper**:
  - [ ] Automated thumbnail and image extraction.
  - [ ] Metadata retrieval (Author, File Size, Last Update).
  - [ ] Categorization (Survival, Roleplay, PvP, MilSim).
- [ ] **Mod Comparison Tool**: Side-by-side performance analytics for multiple mods.
- [ ] **User Alerts**: Discord/Webhook notifications for mod developers when their mods hit "Trending".

---

## 🔭 Phase 3: Advanced Analytics [PLANNED]

- [ ] **Predictive Trending**: Using historical patterns to predict the next "big thing" in the modding scene.
- [ ] **Market Share Analysis**: Visualizing mod ecosystem dominance across different game versions.
- [ ] **API for Developers**: Publicly available SDK for other sites to pull mod rankings.

---

## 📝 Technical Notes

- **Language**: TypeScript (End-to-End).
- **Environment**: 100% Serverless (Cloudflare Pages + Workers).
- **Compliance**: Adhering to BattleMetrics API rate limits via custom throttling logic.

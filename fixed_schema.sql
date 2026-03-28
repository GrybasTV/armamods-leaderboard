-- Sukuriam naują istorijos lentelę be sudėtingų migracijų, kad neviršytume D1 limitų
CREATE TABLE IF NOT EXISTS "ModHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalPlayers" INTEGER NOT NULL,
    "serverCount" INTEGER NOT NULL,
    "overallRank" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sukuriam reikiamus indeksus greitai statistikų paieškai
CREATE INDEX IF NOT EXISTS "ModHistory_modId_idx" ON "ModHistory"("modId");
CREATE INDEX IF NOT EXISTS "ModHistory_date_idx" ON "ModHistory"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "ModHistory_modId_date_key" ON "ModHistory"("modId", "date");

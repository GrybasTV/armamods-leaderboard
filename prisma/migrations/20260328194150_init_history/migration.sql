-- CreateTable
CREATE TABLE "ModHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalPlayers" INTEGER NOT NULL,
    "serverCount" INTEGER NOT NULL,
    "overallRank" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModHistory_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Mod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "author" TEXT,
    "description" TEXT,
    "thumbnail" TEXT,
    "totalPlayers" INTEGER NOT NULL DEFAULT 0,
    "serverCount" INTEGER NOT NULL DEFAULT 0,
    "overallRank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Mod" ("author", "createdAt", "description", "id", "modId", "name", "thumbnail", "updatedAt") SELECT "author", "createdAt", "description", "id", "modId", "name", "thumbnail", "updatedAt" FROM "Mod";
DROP TABLE "Mod";
ALTER TABLE "new_Mod" RENAME TO "Mod";
CREATE UNIQUE INDEX "Mod_modId_key" ON "Mod"("modId");
CREATE INDEX "Mod_name_idx" ON "Mod"("name");
CREATE INDEX "Mod_totalPlayers_idx" ON "Mod"("totalPlayers");
CREATE INDEX "Mod_serverCount_idx" ON "Mod"("serverCount");
CREATE INDEX "Mod_overallRank_idx" ON "Mod"("overallRank");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ModHistory_modId_idx" ON "ModHistory"("modId");

-- CreateIndex
CREATE INDEX "ModHistory_date_idx" ON "ModHistory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ModHistory_modId_date_key" ON "ModHistory"("modId", "date");

-- CreateIndex
CREATE INDEX "Server_players_idx" ON "Server"("players");

-- CreateIndex
CREATE INDEX "Server_name_idx" ON "Server"("name");

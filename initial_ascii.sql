-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ip" TEXT,
    "port" INTEGER,
    "players" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Mod" (
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

-- CreateTable
CREATE TABLE "ServerMod" (
    "serverId" TEXT NOT NULL,
    "modId" TEXT NOT NULL,

    PRIMARY KEY ("serverId", "modId"),
    CONSTRAINT "ServerMod_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServerMod_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Server_players_idx" ON "Server"("players");

-- CreateIndex
CREATE INDEX "Server_name_idx" ON "Server"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Mod_modId_key" ON "Mod"("modId");

-- CreateIndex
CREATE INDEX "Mod_name_idx" ON "Mod"("name");

-- CreateIndex
CREATE INDEX "Mod_totalPlayers_idx" ON "Mod"("totalPlayers");

-- CreateIndex
CREATE INDEX "Mod_serverCount_idx" ON "Mod"("serverCount");

-- CreateIndex
CREATE INDEX "Mod_overallRank_idx" ON "Mod"("overallRank");

-- CreateIndex
CREATE INDEX "ServerMod_modId_idx" ON "ServerMod"("modId");

-- CreateIndex
CREATE INDEX "ServerMod_serverId_idx" ON "ServerMod"("serverId");


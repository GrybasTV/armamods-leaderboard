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
CREATE UNIQUE INDEX "Mod_modId_key" ON "Mod"("modId");

-- CreateIndex
CREATE INDEX "ServerMod_modId_idx" ON "ServerMod"("modId");

-- CreateIndex
CREATE INDEX "ServerMod_serverId_idx" ON "ServerMod"("serverId");

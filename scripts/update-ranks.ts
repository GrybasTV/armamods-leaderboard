import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateRankings() {
  console.log('Calculating hybrid rankings...');
  
  // Get all mods with stats
  const mods = await prisma.mod.findMany({
    select: {
      id: true,
      totalPlayers: true,
      serverCount: true
    }
  });

  if (mods.length === 0) {
    console.log('No mods found.');
    return;
  }

  // Calculate Player Ranks
  const sortedByPlayers = [...mods].sort((a, b) => b.totalPlayers - a.totalPlayers);
  const playerRankMap = new Map();
  sortedByPlayers.forEach((m, index) => playerRankMap.set(m.id, index + 1));

  // Calculate Server Ranks
  const sortedByServers = [...mods].sort((a, b) => b.serverCount - a.serverCount);
  const serverRankMap = new Map();
  sortedByServers.forEach((m, index) => serverRankMap.set(m.id, index + 1));

  console.log(`Updating ${mods.length} mods...`);

  // Batch update
  for (const m of mods) {
    const pRank = playerRankMap.get(m.id);
    const sRank = serverRankMap.get(m.id);
    const hybridRank = Math.floor((pRank + sRank) / 2);

    await prisma.mod.update({
      where: { id: m.id },
      data: { overallRank: hybridRank }
    });
  }

  console.log('Ranking update complete.');
}

updateRankings()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const totalServers = await prisma.server.count();
  const rawSum: any = await prisma.$queryRaw`SELECT SUM(players) as total FROM Server`;
  const totalPlayers = Number(rawSum[0].total) || 0;
  
  console.log('--- DB STATS ---');
  console.log(`Total Servers: ${totalServers}`);
  console.log(`Total Players: ${totalPlayers}`);

  const topServers = await prisma.server.findMany({
    orderBy: { players: 'desc' },
    take: 5
  });
  console.log('Top Servers by players:');
  topServers.forEach(s => console.log(`${s.name}: ${s.players} players`));

  await prisma.$disconnect();
}

main();

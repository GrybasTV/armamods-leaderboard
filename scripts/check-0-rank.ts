import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const count = await prisma.mod.count({ where: { overallRank: 0, serverCount: { gt: 0 } } });
  console.log('Mods with 0 rank and >0 servers:', count);
}
run().finally(() => prisma.$disconnect());

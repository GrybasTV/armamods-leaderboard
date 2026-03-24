import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting one-time stats population...');
  const allMods = await prisma.mod.findMany({
    include: {
      servers: {
        include: {
          server: true
        }
      }
    }
  });

  console.log(`📊 Processing ${allMods.length} mods...`);

  for (const mod of allMods) {
    const totalP = mod.servers.reduce((sum, sm) => sum + sm.server.players, 0);
    const sCount = mod.servers.length;

    await prisma.mod.update({
      where: { id: mod.id },
      data: {
        totalPlayers: totalP,
        serverCount: sCount
      }
    });
  }

  console.log('✅ Stats population complete!');
  await prisma.$disconnect();
}

main().catch(console.error);

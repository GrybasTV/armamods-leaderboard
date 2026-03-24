import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.serverMod.deleteMany();
  await prisma.mod.deleteMany();
  await prisma.server.deleteMany();

  // Insert 30 popular mods
  const modData = [
    { modId: '61ECB5EFAA346151', name: 'TacticalAnimationOverhaul' },
    { modId: '6864C085DBF0E9D5', name: 'SimMovement - Headbob' },
    { modId: '66475093193ABD26', name: 'SH-UHC-Movement' },
    { modId: '68AE6B8DCA078FF1', name: 'SH-ScriptsCore' },
    { modId: '65AD7D0D9941A380', name: 'ACE Core Dev' },
    { modId: '6586079789278413', name: 'ACE Medical Core Dev' },
    { modId: '65AD7D4F994EA327', name: 'ACE Medical Circulation Dev' },
    { modId: '671F73D99978B4F2', name: 'ACE Medical Breathing Dev' },
    { modId: '65B343F799FB521B', name: 'ACE Medical Hitzones Dev' },
    { modId: '68D24B1F04D418B4', name: 'SH-ScriptFixes' },
    { modId: '6739326907106051', name: 'SH-XP-Adjustments' },
    { modId: '68B00B67AC6AA5B8', name: 'SH-GarbageCollector' },
    { modId: '687A303B1C62BABB', name: 'SH-FX-Tweaks' },
    { modId: '687CD82F6E41D627', name: 'Attachment Framework-Core' },
    { modId: '645F08FA9E7CDEDE', name: 'Attachment Framework' },
    { modId: '64722DADC53CB75E', name: 'NV-System' },
    { modId: '1337C0DE5DABBEEF', name: 'RHS - Content Pack 01' },
    { modId: 'BADC0DEDABBEDA5E', name: 'RHS - Content Pack 02' },
    { modId: '595F2BF2F44836FB', name: 'RHS - Status Quo' },
    { modId: '65AD7CF69FAF1FDD', name: 'ACE Compass Dev' },
    { modId: '65AD7BCC9F6B3B4E', name: 'ACE Chopping Dev' },
    { modId: '65AD7D1E9EEAFA53', name: 'ACE Explosives Dev' },
    { modId: '65AD7D4099944EBD', name: 'ACE Magazine Repack Dev' },
    { modId: '65AD7C379CBD394D', name: 'ACE Carrying Dev' },
    { modId: '667B230F9505C8BA', name: 'ACE Weather Dev' },
    { modId: '65AD7C139EB4C1A1', name: 'ACE Backblast Dev' },
    { modId: '5E92F5A4A1B75A75', name: 'Player Map Markers' },
    { modId: '62FCEB51DF8527B6', name: 'Improved Blood Effect' },
    { modId: '660896EB172D4B7F', name: 'Improved Blood Effect Deluxe' },
    { modId: '64900A5A31F5DCB5', name: 'MRZR' },
  ];

  const mods = await Promise.all(
    modData.map(data =>
      prisma.mod.create({
        data: {
          id: crypto.randomUUID(),
          ...data,
        },
      })
    )
  );

  console.log(`✅ Created ${mods.length} mods`);

  // Insert 50 servers
  const servers = [];
  for (let i = 1; i <= 50; i++) {
    const players = Math.floor(Math.random() * 100) + 3;
    servers.push({
      id: `s${i}`,
      name: `Server ${i}`,
      ip: `192.168.1.${i}`,
      port: 2001,
      players,
      maxPlayers: Math.max(players + Math.floor(Math.random() * 20), 10),
    });
  }

  await prisma.server.createMany({ data: servers });
  console.log(`✅ Created ${servers.length} servers`);

  // Create mod-server relationships
  // SpearHead server (s1) - lots of mods
  const s1 = await prisma.server.findUnique({ where: { id: 's1' } });
  await prisma.server.update({
    where: { id: 's1' },
    data: {
      name: '[NA3] SpearHead Bakhmut Ultra Hardcore',
      players: 127,
      maxPlayers: 128,
    }
  });
  for (const mod of mods) {
    await prisma.serverMod.create({
      data: { serverId: 's1', modId: mod.id },
    });
  }

  // ACE servers - use ACE mods
  const aceModIds = mods.slice(4, 10).map(m => m.id); // ACE Core + Medical
  for (let i = 2; i <= 6; i++) {
    for (const modId of aceModIds) {
      await prisma.serverMod.create({
        data: { serverId: `s${i}`, modId },
      });
    }
  }

  // Mixed servers - various combinations
  for (let i = 7; i <= 50; i++) {
    const numMods = Math.floor(Math.random() * 8) + 2;
    const selectedMods = mods.slice(0, Math.min(numMods, mods.length));
    for (const mod of selectedMods) {
      await prisma.serverMod.create({
        data: { serverId: `s${i}`, modId: mod.id },
      });
    }
  }

  console.log('✅ Created server-mod relationships');

  // Stats
  const modCount = await prisma.mod.count();
  const serverCount = await prisma.server.count();
  const relCount = await prisma.serverMod.count();

  console.log('\n📊 Database stats:');
  console.log(`   Mods: ${modCount}`);
  console.log(`   Servers: ${serverCount}`);
  console.log(`   Relationships: ${relCount}`);
  console.log('\n✅ Seeding complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

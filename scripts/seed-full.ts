import { prisma } from '../src/lib/db.js';

interface BattleMetricsServer {
  id: string;
  attributes: {
    name: string;
    ip: string;
    port: number;
    players: number;
    maxPlayers: number;
    details?: {
      reforger?: {
        mods?: Array<{
          modId: string;
          name: string;
        }>;
      };
    };
  };
}

interface BattleMetricsResponse {
  data: BattleMetricsServer[];
  links: {
    next?: string;
  };
}

async function fetchAllServers() {
  const servers: BattleMetricsServer[] = [];
  let url = 'https://api.battlemetrics.com/servers?filter[game]=reforger&page[size]=100';

  console.log('🚀 Fetching servers from BattleMetrics...');

  while (url) {
    console.log(`Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ReforgerMods/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`BattleMetrics API error: ${response.status}`);
    }

    const json: BattleMetricsResponse = await response.json();
    servers.push(...json.data);

    console.log(`Fetched ${json.data.length} servers, total: ${servers.length}`);

    url = json.links?.next || '';

    // Rate limiting - safe 60 req/min (1000ms) to avoid 429 errors
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return servers;
}

async function main() {
  await prisma.$connect();
  console.log('✅ Database connected');

  // Fetch all servers
  const servers = await fetchAllServers();
  console.log(`✅ Fetched ${servers.length} servers`);

  // Collect unique mods
  const modsMap = new Map<string, string>(); // modId -> name
  const serverMods: Array<{ serverId: string; modId: string }> = [];

  for (const server of servers) {
    const mods = server.attributes.details?.reforger?.mods || [];

    for (const mod of mods) {
      modsMap.set(mod.modId, mod.name);
      serverMods.push({
        serverId: server.id,
        modId: mod.modId,
      });
    }
  }

  console.log(`✅ Found ${modsMap.size} unique mods`);
  console.log(`✅ Found ${serverMods.length} server-mod relationships`);

  // Delete old data
  console.log('🗑️  Cleaning old data...');
  await prisma.serverMod.deleteMany({});
  await prisma.server.deleteMany({});
  await prisma.mod.deleteMany({});

  // Bulk insert servers
  console.log('📦 Inserting servers...');
  const serverData = servers.map(s => ({
    id: s.id,
    name: s.attributes.name,
    ip: s.attributes.ip,
    port: s.attributes.port,
    players: s.attributes.players,
    maxPlayers: s.attributes.maxPlayers,
  }));

  await prisma.server.createMany({
    data: serverData,
  });
  console.log(`✅ Inserted ${serverData.length} servers`);

  // Bulk insert mods
  console.log('📦 Inserting mods...');
  const modData = Array.from(modsMap.entries()).map(([modId, name]) => ({
    modId,
    name,
  }));

  await prisma.mod.createMany({
    data: modData,
  });
  console.log(`✅ Inserted ${modData.length} mods`);

  // Get mod IDs from database
  console.log('🔗 Linking mods to servers...');
  const modsInDb = await prisma.mod.findMany({
    where: {
      modId: { in: Array.from(modsMap.keys()) },
    },
  });

  const modIdMap = new Map(modsInDb.map(m => [m.modId, m.id]));

  // Bulk insert server-mod relationships
  const relationships = serverMods
    .filter(sm => modIdMap.has(sm.modId))
    .map(sm => ({
      serverId: sm.serverId,
      modId: modIdMap.get(sm.modId)!,
    }));

  // Insert in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < relationships.length; i += batchSize) {
    const batch = relationships.slice(i, i + batchSize);
    await prisma.serverMod.createMany({
      data: batch,
    });
    console.log(`✅ Linked ${i + batch.length}/${relationships.length} relationships`);
  }

  console.log('✅ Seed complete!');
  await prisma.$disconnect();
}

main().catch(console.error);

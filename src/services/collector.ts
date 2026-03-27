import cron from 'node-cron';
import { prisma } from '../lib/db.js';
import { BattleMetricsService } from './battlemetrics.js';

export class CollectorService {
  private bmService: BattleMetricsService;
  private isRunning = false;

  constructor() {
    this.bmService = new BattleMetricsService();
  }

  async collectOnce(updateMode = false) {
    if (this.isRunning) {
      console.log('⏳ Collection already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const mode = updateMode ? '🔄 UPDATE' : '🚀 FULL IMPORT';
    console.log(`${mode} Starting server collection...`);

    try {
      const servers = await this.bmService.fetchAllServers(updateMode);
      console.log(`✅ Fetched ${servers.length} servers from BattleMetrics`);

      let updatedCount = 0;
      let modCount = 0;

      for (const server of servers) {
        const mods = server.attributes.details?.reforger?.mods || [];

        // Upsert server
        await prisma.server.upsert({
          where: { id: server.id },
          update: {
            name: server.attributes.name,
            ip: server.attributes.ip,
            port: server.attributes.port,
            players: server.attributes.players,
            maxPlayers: server.attributes.maxPlayers,
          },
          create: {
            id: server.id,
            name: server.attributes.name,
            ip: server.attributes.ip,
            port: server.attributes.port,
            players: server.attributes.players,
            maxPlayers: server.attributes.maxPlayers,
          },
        });

        // Upsert mods and relationships
        for (const mod of mods) {
          const modRecord = await prisma.mod.upsert({
            where: { modId: mod.modId },
            update: {
              name: mod.name,
              updatedAt: new Date(),
            },
            create: {
              modId: mod.modId,
              name: mod.name,
            },
          });

          await prisma.serverMod.upsert({
            where: {
              serverId_modId: {
                serverId: server.id,
                modId: modRecord.id,
              },
            },
            update: {},
            create: {
              serverId: server.id,
              modId: modRecord.id,
            },
          });

          modCount++;
        }

        updatedCount++;
      }

      console.log(`✅ Updated ${updatedCount} servers with ${modCount} mod relationships`);

      // 🔄 Pre-calculate stats for all mods (NEW: for performance)
      console.log('📊 Updating mod statistics cache...');
      const allMods = await prisma.mod.findMany({
        include: {
          servers: {
            include: {
              server: true
            }
          }
        }
      });

      // 1. Update basic totals (Players, Servers)
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

      // 2. 🏁 CALCULATE RANKS (The Hybrid Logic)
      console.log('🏁 Recalculating hybrid rankings...');
      const modsWithStats = await prisma.mod.findMany({
        select: { id: true, totalPlayers: true, serverCount: true }
      });

      const sortByPlayers = [...modsWithStats].sort((a, b) => (b.totalPlayers || 0) - (a.totalPlayers || 0));
      const playerRankMap = new Map();
      sortByPlayers.forEach((m, index) => playerRankMap.set(m.id, index + 1));

      const sortByServers = [...modsWithStats].sort((a, b) => (b.serverCount || 0) - (a.serverCount || 0));
      const serverRankMap = new Map();
      sortByServers.forEach((m, index) => serverRankMap.set(m.id, index + 1));

      for (const m of modsWithStats) {
        const pRank = playerRankMap.get(m.id);
        const sRank = serverRankMap.get(m.id);
        const hybridRank = Math.round((pRank + sRank) / 2);

        await prisma.mod.update({
          where: { id: m.id },
          data: { overallRank: hybridRank }
        });
      }
      
      console.log(`✅ Updated statistics and rankings for ${allMods.length} mods`);

      // Clean up old servers (not seen in last 24h)
      const deleted = await prisma.server.deleteMany({
        where: {
          updatedAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });
      console.log(`🗑️  Cleaned up ${deleted.count} inactive servers`);

    } catch (error) {
      console.error('❌ Collection failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  startCron() {
    // Run once on startup (FULL import of all servers)
    this.collectOnce(false);

    // Run every hour (UPDATE mode - only recent servers)
    cron.schedule('0 * * * *', () => this.collectOnce(true));
    console.log('⏰ Collector scheduled: every 1 hour (update mode)');
  }
}

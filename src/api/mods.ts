import { Request, Response } from 'express';
import { prisma } from '../lib/db.js';

export async function getPopularMods(req: Request, res: Response) {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 1000, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'overall';

    const where: any = {
      serverCount: { gt: 0 }
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { modId: { contains: search } }
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'servers') orderBy.serverCount = 'desc';
    else if (sortBy === 'name') orderBy.name = 'asc';
    else if (sortBy === 'players') orderBy.totalPlayers = 'desc';
    else {
      // 'overall' - primary by overallRank ASC, secondary by totalPlayers DESC (tiebreaker)
      orderBy.overallRank = 'asc';
      orderBy.totalPlayers = 'desc';
    }

    const mods = await prisma.mod.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    });

    // Get total servers for market share calculation
    const totalServers = await prisma.server.count();

    const total = await prisma.mod.count({ where });

    // We already have the rank correctly calculated and stored
    const modsWithRank = mods.map((m) => {
      return {
        id: m.modId,
        name: m.name,
        author: m.author,
        thumbnail: m.thumbnail,
        serverCount: m.serverCount,
        totalPlayers: m.totalPlayers,
        overallRank: m.overallRank || 9999,
        marketShare: totalServers > 0 ? ((m.serverCount / totalServers) * 100) : 0
      };
    });

    res.json({
      data: modsWithRank,
      meta: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching popular mods:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getModDetails(req: Request, res: Response) {
  try {
    const { modId } = req.params;

    const mod = await prisma.mod.findUnique({
      where: { modId },
      include: {
        servers: {
          include: {
            server: true,
          },
          orderBy: {
            server: {
              players: 'desc'
            }
          }
        },
      },
    });

    if (!mod) {
      return res.status(404).json({ error: 'Mod not found' });
    }

    // Calculate current stats
    const averagePlayers = mod.serverCount > 0 ? (mod.totalPlayers / mod.serverCount).toFixed(1) : 0;

    // Total active mods count is fine periodically
    const totalActiveMods = await prisma.mod.count({
      where: {
        serverCount: { gt: 0 }
      }
    });

    // Calculate individual ranks
    const allModsByPlayers = await prisma.mod.findMany({
      where: { serverCount: { gt: 0 } },
      select: { id: true, totalPlayers: true },
      orderBy: { totalPlayers: 'desc' }
    });
    const playerRank = allModsByPlayers.findIndex(m => m.id === mod.id) + 1;

    const allModsByServers = await prisma.mod.findMany({
      where: { serverCount: { gt: 0 } },
      select: { id: true, serverCount: true },
      orderBy: { serverCount: 'desc' }
    });
    const serverRank = allModsByServers.findIndex(m => m.id === mod.id) + 1;

    res.json({
      data: {
        modId: mod.modId,
        name: mod.name,
        author: mod.author,
        description: mod.description,
        thumbnail: mod.thumbnail,
        stats: {
          serverCount: mod.serverCount,
          totalPlayers: mod.totalPlayers,
          averagePlayers: parseFloat(averagePlayers as string),
          overallRank: mod.overallRank || 9999,
          playerRank: playerRank || 9999,
          serverRank: serverRank || 9999,
          totalMods: totalActiveMods,
          marketShare: totalActiveMods > 0 ? ((mod.serverCount / totalActiveMods) * 100) : 0
        },
        servers: mod.servers.map(sm => ({
          id: sm.server.id,
          name: sm.server.name,
          ip: sm.server.ip,
          port: sm.server.port,
          players: sm.server.players,
          maxPlayers: sm.server.maxPlayers,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching mod details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

import { Request, Response } from 'express';
import { prisma } from '../lib/db.js';

export async function getPopularMods(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
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
    else orderBy.overallRank = 'asc'; // 'overall' is default

    const mods = await prisma.mod.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    });

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
        overallRank: m.overallRank || 9999
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
          totalMods: totalActiveMods
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

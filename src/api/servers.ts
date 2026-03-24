import { Request, Response } from 'express';
import { prisma } from '../lib/db.js';

export async function getServers(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    const where = search
      ? {
          name: {
            contains: search,
          },
        }
      : undefined;

    const [servers, total] = await Promise.all([
      prisma.server.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: {
          players: 'desc',
        },
        include: {
          mods: {
            include: {
              mod: true,
            },
          },
        },
      }),
      prisma.server.count({ where }),
    ]);

    res.json({
      data: servers.map(s => ({
        id: s.id,
        name: s.name,
        ip: s.ip,
        port: s.port,
        players: s.players,
        maxPlayers: s.maxPlayers,
        modCount: s.mods.length,
        mods: s.mods.slice(0, 5).map(sm => sm.mod),
      })),
      meta: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getServerDetails(req: Request, res: Response) {
  try {
    const { serverId } = req.params;

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: {
        mods: {
          include: {
            mod: true,
          },
          orderBy: {
            mod: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Get all mods with stats - use stored values for speed
    const mods = server.mods.map((sm) => {
      const m = sm.mod;
      return {
        modId: m.modId,
        name: m.name,
        author: m.author,
        thumbnail: m.thumbnail,
        total_players: m.totalPlayers,
        server_count: m.serverCount,
        rank: m.overallRank || 9999
      };
    });

    res.json({
      data: {
        id: server.id,
        name: server.name,
        ip: server.ip,
        port: server.port,
        players: server.players,
        maxPlayers: server.maxPlayers,
        modCount: server.mods.length,
        mods: mods.sort((a, b) => b.total_players - a.total_players),
      },
    });
  } catch (error) {
    console.error('Error fetching server details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

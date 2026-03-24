import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getGlobalStats(req: Request, res: Response) {
  try {
    // Unique servers count
    const totalServers = await prisma.server.count();

    // Sum of all players across all unique servers
    const totalPlayersResult: any = await prisma.$queryRaw`
      SELECT SUM(players) as total FROM Server
    `;
    const totalPlayers = Number(totalPlayersResult[0].total) || 0;

    // Total mods with at least one server
    const totalMods = await prisma.mod.count({
      where: {
        serverCount: { gt: 0 }
      }
    });

    res.json({
      totalServers,
      totalPlayers,
      totalMods
    });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

import axios from 'axios';
import type { Mod, Server, ApiResponse, TrendingResponse } from '../types';

export type GameType = 'reforger' | 'arma3';

// Produkcijoje – tiesiogiai į Worker (Pages Functions neveikia patikimai)
// Lokaliai – Vite proxy peradresuoja /api į Worker
const IS_PROD = import.meta.env.PROD;
const API_BASE = IS_PROD
  ? 'https://armamods-leaderboard.pauliusmed.workers.dev/api'
  : '/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // Increased timeout for proxy
});

export const modsApi = {
  getPopular: async (limit = 50, offset = 0, search?: string, sortBy?: string, game: GameType = 'reforger') => {
    const response = await api.get<ApiResponse<Mod>>('mods', {
      params: { limit, offset, search, sortBy, game },
    });
    return response.data;
  },

  getById: async (modId: string, game: GameType = 'reforger') => {
    const response = await api.get<{ data: Mod & { stats: Mod & { totalMods: number }; servers: Server[] } }>(`mods/${modId}`, {
      params: { game }
    });
    return response.data;
  },

  getHistory: async (modId: string, days = 30, game: GameType = 'reforger') => {
    const response = await api.get<{ data: import('../types').ModHistory[] }>(`mods/${modId}/history`, {
      params: { days, game }
    });
    return response.data;
  },

  getGlobalStats: async (game: GameType = 'reforger') => {
    const response = await api.get<{ totalServers: number; totalPlayers: number; totalMods: number }>('stats', {
      params: { game }
    });
    return response.data;
  }
};

export const serversApi = {
  getList: async (limit = 100, offset = 0, search?: string, game: GameType = 'reforger') => {
    const response = await api.get<ApiResponse<Server>>('servers', {
      params: { limit, offset, search, game },
    });
    return response.data;
  },

  getById: async (serverId: string, game: GameType = 'reforger') => {
    const response = await api.get<{ data: Server }>(`servers/${serverId}`, {
      params: { game }
    });
    return response.data;
  },
};

export const trendingApi = {
  getTrending: async (period: import('../types').TrendPeriod = '24h', game: GameType = 'reforger') => {
    const response = await api.get<TrendingResponse>('trending', {
      params: { period, game }
    });
    return response.data;
  },
};

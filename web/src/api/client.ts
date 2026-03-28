import axios from 'axios';
import type { Mod, Server, ApiResponse, TrendingResponse } from '../types';

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
  getPopular: async (limit = 50, offset = 0, search?: string, sortBy?: string) => {
    const response = await api.get<ApiResponse<Mod>>('mods', {
      params: { limit, offset, search, sortBy },
    });
    return response.data;
  },

  getById: async (modId: string) => {
    const response = await api.get<{ data: Mod & { stats: { totalPlayers: number; serverCount: number; playerRank: number; serverRank: number }; servers: Server[] } }>(`mods/${modId}`);
    return response.data;
  },

  getHistory: async (modId: string) => {
    const response = await api.get<{ data: import('../types').ModHistory[] }>(`mods/${modId}/history`);
    return response.data;
  },

  getGlobalStats: async () => {
    const response = await api.get<{ totalServers: number; totalPlayers: number; totalMods: number }>('stats');
    return response.data;
  }
};

export const serversApi = {
  getList: async (limit = 100, offset = 0, search?: string) => {
    const response = await api.get<ApiResponse<Server>>('servers', {
      params: { limit, offset, search },
    });
    return response.data;
  },

  getById: async (serverId: string) => {
    const response = await api.get<{ data: Server }>(`servers/${serverId}`);
    return response.data;
  },
};

export const trendingApi = {
  getTrending: async () => {
    const response = await api.get<TrendingResponse>('trending');
    return response.data;
  },
};

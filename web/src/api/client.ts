import axios from 'axios';
import type { Mod, Server, ApiResponse, TrendingResponse } from '../types';

// Use relative path - API requests will be proxied via Cloudflare Pages Functions
const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // Increased timeout for proxy
});

export const modsApi = {
  getPopular: async (limit = 50, offset = 0, search?: string, sortBy?: string) => {
    const response = await api.get<ApiResponse<Mod>>('/mods', {
      params: { limit, offset, search, sortBy },
    });
    return response.data;
  },

  getById: async (modId: string) => {
    const response = await api.get<{ data: Mod & { stats: any; servers: Server[] } }>(`/mods/${modId}`);
    return response.data;
  },

  getGlobalStats: async () => {
    const response = await api.get<{ totalServers: number; totalPlayers: number; totalMods: number }>('/stats');
    return response.data;
  }
};

export const serversApi = {
  getList: async (limit = 100, offset = 0, search?: string) => {
    const response = await api.get<ApiResponse<Server>>('/servers', {
      params: { limit, offset, search },
    });
    return response.data;
  },

  getById: async (serverId: string) => {
    const response = await api.get<{ data: Server }>(`/servers/${serverId}`);
    return response.data;
  },
};

export const trendingApi = {
  getTrending: async () => {
    const response = await api.get<TrendingResponse>('/trending');
    return response.data;
  },
};

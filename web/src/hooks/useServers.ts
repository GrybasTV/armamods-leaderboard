import { useEffect, useState, useMemo, useCallback } from 'react';
import { serversApi, modsApi, type GameType } from '../api/client';
import type { Server } from '../types';

export type ServerSortBy = 'rank' | 'players' | 'name' | 'mods';

interface UseServersOptions {
  game?: GameType;
}

export function useServers(options: UseServersOptions = {}) {
  const { game = 'reforger' } = options;
  const [servers, setServers] = useState<Server[]>([]);
  const [totalServers, setTotalServers] = useState(0);
  const [globalStats, setGlobalStats] = useState({ totalPlayers: 0, fullServers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ServerSortBy>('rank');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const loadServers = useCallback(async () => {
    try {
      setLoading(true);
      const [serversData, statsData] = await Promise.all([
        serversApi.getList(1000, 0, searchQuery, game),
        modsApi.getGlobalStats(game)
      ]);
      const fetchedServers = serversData?.data || [];
      setServers(fetchedServers);
      setTotalServers(serversData?.meta?.total || 0);

      // Calculate full servers from loaded sample
      const fullCount = fetchedServers.length > 0
        ? fetchedServers.filter((s: Server) => s.maxPlayers > 0 && (s.players / s.maxPlayers) >= 0.8).length
        : 0;
      
      const fullRatio = fetchedServers.length > 0 ? fullCount / fetchedServers.length : 0;
      const estimatedFull = Math.round((serversData?.meta?.total || 0) * fullRatio);

      setGlobalStats({
        totalPlayers: statsData?.totalPlayers || 0,
        fullServers: estimatedFull || 0
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  }, [game, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadServers();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [loadServers]);

  const filteredServers = useMemo(() => {
    if (!Array.isArray(servers)) return [];

    return servers.filter(server => {
      if (searchQuery && !server.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'rank') {
        const rankA = a.sqeRank || 99999;
        const rankB = b.sqeRank || 99999;
        return rankA - rankB;
      }
      if (sortBy === 'players') return b.players - a.players;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'mods') return (b.mods?.length ?? 0) - (a.mods?.length ?? 0);
      return 0;
    });
  }, [servers, searchQuery, sortBy]);

  const paginatedServers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServers.slice(start, start + itemsPerPage);
  }, [filteredServers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredServers.length / itemsPerPage);

  const stats = useMemo(() => ({
    totalServers: totalServers,
    totalPlayers: globalStats.totalPlayers,
    fullServers: globalStats.fullServers,
    totalPages
  }), [totalServers, globalStats, totalPages]);

  const resetFilters = () => {
    setSearchQuery('');
    setSortBy('players');
    setCurrentPage(1);
  };

  return {
    servers,
    filteredServers: paginatedServers,
    totalItems: filteredServers.length,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    totalPages,
    resetFilters,
    stats,
    refresh: loadServers
  };
}

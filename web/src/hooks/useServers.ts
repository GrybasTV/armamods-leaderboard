import { useEffect, useState, useMemo } from 'react';
import { serversApi, modsApi } from '../api/client';
import type { Server } from '../types';

export type StatusFilter = 'all' | 'full' | 'active' | 'available' | 'low';
export type ServerSortBy = 'players' | 'name' | 'mods';

export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [totalServers, setTotalServers] = useState(0);
  const [globalStats, setGlobalStats] = useState({ totalPlayers: 0, fullServers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<ServerSortBy>('players');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const loadServers = async () => {
    try {
      setLoading(true);
      const [serversData, statsData] = await Promise.all([
        serversApi.getList(1000),
        modsApi.getGlobalStats()
      ]);
      setServers(serversData.data);
      setTotalServers(serversData.meta.total);

      // Calculate full servers from loaded sample (more accurate)
      const fullCount = serversData.data.filter((s: Server) => (s.players / s.maxPlayers) >= 0.8).length;
      const fullRatio = fullCount / serversData.data.length;
      const estimatedFull = Math.round(serversData.meta.total * fullRatio);

      setGlobalStats({
        totalPlayers: statsData.totalPlayers || 0,
        fullServers: estimatedFull
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const filteredServers = useMemo(() => {
    return servers.filter(server => {
      // Search
      if (searchQuery && !server.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const fillPercent = (server.players / server.maxPlayers) * 100;
        if (statusFilter === 'full' && fillPercent < 80) return false;
        if (statusFilter === 'active' && (fillPercent < 50 || fillPercent >= 80)) return false;
        if (statusFilter === 'available' && (fillPercent < 30 || fillPercent >= 80)) return false;
        if (statusFilter === 'low' && fillPercent >= 30) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'players') return b.players - a.players;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'mods') return b.modCount - a.modCount;
      return 0;
    });
  }, [servers, searchQuery, statusFilter, sortBy]);

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
    setStatusFilter('all');
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
    statusFilter,
    setStatusFilter,
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

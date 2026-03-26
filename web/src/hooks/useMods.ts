import { useEffect, useState, useMemo, useCallback } from 'react';
import { modsApi } from '../api/client';
import type { Mod } from '../types';

export type PlayerFilter = 'all' | 'high' | 'medium' | 'low';
export type ModSortBy = 'players' | 'servers' | 'name';

export function useMods() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [totalMods, setTotalMods] = useState(0);
  const [globalStats, setGlobalStats] = useState({ totalPlayers: 0, totalServers: 0, totalMods: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>('all');
  const [sortBy, setSortBy] = useState<ModSortBy>('players');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;

  const loadMods = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;

      // Fetch both list and global stats
      const [listData, statsData] = await Promise.all([
        modsApi.getPopular(itemsPerPage, offset, searchQuery, sortBy),
        modsApi.getGlobalStats()
      ]);

      setMods(listData?.data || []);
      setTotalMods(listData?.meta?.total || 0);
      setGlobalStats(statsData || { totalPlayers: 0, totalServers: 0, totalMods: 0 });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, playerFilter, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMods();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, searchQuery, sortBy, loadMods]);

  const filteredMods = useMemo(() => {
    if (!Array.isArray(mods)) return [];
    
    let filtered = [...mods];

    if (playerFilter !== 'all') {
      filtered = filtered.filter(mod => {
        const players = mod.totalPlayers || 0;
        if (playerFilter === 'high') return players >= 500;
        if (playerFilter === 'medium') return players >= 100 && players < 500;
        if (playerFilter === 'low') return players < 100;
        return true;
      });
    }

    return filtered;
  }, [mods, playerFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setPlayerFilter('all');
    setSortBy('players');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalMods / itemsPerPage);

  const stats = useMemo(() => ({
    totalMods: globalStats?.totalMods || 0,
    totalPlayers: globalStats?.totalPlayers || 0,
    totalServers: globalStats?.totalServers || 0,
    totalPages
  }), [globalStats, totalPages]);

  return {
    mods,
    filteredMods,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    playerFilter,
    setPlayerFilter,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    totalPages,
    resetFilters,
    stats,
    refresh: loadMods
  };
}

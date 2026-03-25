import { useServers } from '../hooks/useServers';
import { ServerCard } from './ServerCard';
import { StatsHero } from './ui/StatsHero';
import { Pagination } from './ui/Pagination';
import { StatusState } from './ui/StatusState';

export function ServerList() {
  const {
    filteredServers,
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
    refresh
  } = useServers();

  if (loading) return <StatusState type="loading" />;
  if (error) return <StatusState type="error" details={error} onAction={refresh} actionText="Try Again" />;
  if (stats.totalServers === 0) return <StatusState type="empty" message="No servers active" details="Check your filters or wait for the system to scan more servers." onAction={resetFilters} actionText="Reset Filters" />;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <StatsHero
        title="Active Server Network"
        subtitle="Real-time monitoring of all community and official servers using mods."
        stats={[
          { label: 'Active Servers', value: stats.totalServers },
          { label: 'Total Players', value: stats.totalPlayers },
          { label: 'Capacity (80%+)', value: stats.fullServers },
          { label: 'Network Spans', value: stats.totalPages }
        ]}
      />

      <div className="bg-zinc-900/50 p-10 border border-white/5 backdrop-blur-sm shadow-2xl sticky top-28 z-40 transition-all hover:bg-zinc-900/80">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
          <div className="md:col-span-2 group">
            <label className="block text-[8px] font-black uppercase tracking-[0.4em] text-gray-600 mb-4 group-hover:text-purple-600 transition-colors italic">// SCAN_REMOTE_SERVERS</label>
            <input
              type="text"
              placeholder="Broadcasting search pulse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-8 py-5 bg-black/60 border border-white/10 focus:border-purple-500 focus:bg-black transition-all font-black text-white placeholder-gray-700 uppercase tracking-widest text-[11px] rounded-none outline-none"
            />
          </div>

          <div>
            <label className="block text-[8px] font-black uppercase tracking-[0.4em] text-gray-600 mb-4 italic">// NETWORK_LOAD</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-8 py-5 bg-black/60 border border-white/10 focus:border-purple-500 focus:bg-black transition-all font-black text-white appearance-none cursor-pointer uppercase tracking-widest text-[11px] rounded-none outline-none"
            >
              <option value="all">FULL NETWORK</option>
              <option value="full">CRITICAL (80%+)</option>
              <option value="active">HIGH LOAD (50-80%)</option>
              <option value="available">STABLE (30-50%)</option>
              <option value="low">IDLE (0-30%)</option>
            </select>
          </div>

          <div>
            <label className="block text-[8px] font-black uppercase tracking-[0.4em] text-gray-600 mb-4 italic">// DATA_METRIC</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-8 py-5 bg-black/60 border border-white/10 focus:border-purple-500 focus:bg-black transition-all font-black text-white appearance-none cursor-pointer uppercase tracking-widest text-[11px] rounded-none outline-none"
            >
              <option value="players">PERSONNEL_IDX</option>
              <option value="mods">MODULE_IDX</option>
              <option value="name">IDENTIFIER_IDX</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredServers.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
        accentColor="from-purple-600 to-pink-600"
      />
    </div>
  );
}

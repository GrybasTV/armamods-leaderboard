import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { serversApi } from '../api/client';
import { StatusState } from './ui/StatusState';
import { Card, CardContent } from './ui/Card';
import { StatsHero } from './ui/StatsHero';
import type { Server, Mod } from '../types';

export function ServerDetail() {
  const { serverId } = useParams<{ serverId: string }>();
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local filtering/sorting for the mod stack
  const [modSearch, setModSearch] = useState('');
  const [modSort, setModSort] = useState<'rank' | 'name' | 'players'>('players');
  const [personnelFilter, setPersonnelFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [rankFilter, setRankFilter] = useState<'all' | 'top100' | 'top500' | 'top1000'>('all');

  const loadServer = useCallback(async () => {
    if (!serverId) return;
    try {
      setLoading(true);
      const data = await serversApi.getById(serverId);
      setServer(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load server');
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    loadServer();
  }, [serverId, loadServer]);

  const sortedAndFilteredMods = useMemo(() => {
    if (!server?.mods || !Array.isArray(server.mods)) return [];

    const filtered = (server?.mods || []).filter((m: any) =>
      (m.name.toLowerCase().includes(modSearch.toLowerCase()) ||
       m.id.toLowerCase().includes(modSearch.toLowerCase())) &&
       // ...
      (
        personnelFilter === 'all' ||
        (personnelFilter === 'high' && m.totalPlayers >= 500) ||
        (personnelFilter === 'medium' && m.totalPlayers >= 100 && m.totalPlayers < 500) ||
        (personnelFilter === 'low' && m.totalPlayers < 100)
      ) &&
      (
        rankFilter === 'all' ||
        (rankFilter === 'top100' && m.playerRank <= 100) ||
        (rankFilter === 'top500' && m.playerRank <= 500) ||
        (rankFilter === 'top1000' && m.playerRank <= 1000)
      )
    );

    return [...filtered].sort((a: any, b: any) => {
      if (modSort === 'name') return a.name.localeCompare(b.name);
      if (modSort === 'rank') return a.playerRank - b.playerRank;
      return (b.totalPlayers || 0) - (a.totalPlayers || 0);
    });
  }, [server?.mods, modSearch, modSort, personnelFilter, rankFilter]);

  if (loading) return <StatusState type="loading" />;
  if (error || !server) return (
    <div className="space-y-8">
      <StatusState 
        type="error" 
        message={error || 'Server connection lost'} 
        onAction={loadServer} 
        actionText="Re-establish Connection" 
      />
      <Link to="/servers" className="block text-center text-tactical-orange font-black uppercase tracking-[0.4em] text-[10px] hover:underline">
        ← Return to Network Map
      </Link>
    </div>
  );

  const fillPercent = (server.players / server.maxPlayers) * 100;
  
  const getStatus = () => {
    if (fillPercent >= 80) return { label: 'CRITICAL_LOAD', color: 'text-red-500' };
    if (fillPercent >= 50) return { label: 'HIGH_ACTIVITY', color: 'text-tactical-orange' };
    if (fillPercent >= 1) return { label: 'OPERATIONAL', color: 'text-green-500' };
    return { label: 'STANDBY', color: 'text-gray-600' };
  };

  const status = getStatus();

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-6">
        <Link to="/servers" className="inline-flex items-center gap-4 text-gray-500 hover:text-tactical-orange font-black uppercase tracking-[0.3em] text-[10px] transition-all hover:-translate-x-2">
          ← [ Back to Network ]
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div className="space-y-4">
            <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.5em]">// SERVER_NODE: {server.id}</span>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">
              {server.name}
            </h1>
            <p className="text-xl font-mono text-gray-500 font-bold uppercase tracking-widest">
              {server.ip}:{server.port}
            </p>
          </div>
          <div className="px-10 py-6 bg-zinc-900 border border-white/10 text-center">
             <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1 italic">Engagement Status</p>
             <p className={`text-3xl font-black uppercase tracking-tighter ${status.color}`}>{status.label}</p>
          </div>
        </div>
      </header>

      <StatsHero
        stats={[
          { label: 'Personnel Present', value: `${server.players || 0} / ${server.maxPlayers || 0}` },
          { label: 'Module Count', value: server?.mods?.length || 0 },
          { label: 'Capacity Used', value: `${Math.round(fillPercent || 0)}%` },
          { label: 'Encryption', value: 'AES-256' }
        ]}
        title="Field Intelligence Report"
        subtitle="Detailed analysis of deployed assets and personnel distribution"
      />

      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter whitespace-nowrap">
            📦 Installed Mod Stack
          </h2>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Filter modules..."
              value={modSearch}
              onChange={(e) => setModSearch(e.target.value)}
              className="px-4 py-3 bg-black/40 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-tactical-orange transition-all w-full"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select
                value={personnelFilter}
                onChange={(e) => setPersonnelFilter(e.target.value as any)}
                className="px-2 py-3 bg-zinc-900 border border-white/10 text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest cursor-pointer outline-none focus:border-tactical-orange transition-all"
              >
                <option value="all" className="bg-zinc-900 text-white">Personnel: All</option>
                <option value="high" className="bg-zinc-900 text-white">High (500+)</option>
                <option value="medium" className="bg-zinc-900 text-white">Med (100+)</option>
                <option value="low" className="bg-zinc-900 text-white">New/Low</option>
              </select>
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value as any)}
                className="px-2 py-3 bg-zinc-900 border border-white/10 text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest cursor-pointer outline-none focus:border-tactical-orange transition-all"
              >
                <option value="all" className="bg-zinc-900 text-white">Rank: All</option>
                <option value="top100" className="bg-zinc-900 text-white">Top 100</option>
                <option value="top500" className="bg-zinc-900 text-white">Top 500</option>
                <option value="top1000" className="bg-zinc-900 text-white">Top 1000</option>
              </select>
              <select
                value={modSort}
                onChange={(e) => setModSort(e.target.value as any)}
                className="px-2 py-3 bg-zinc-900 border border-white/10 text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest cursor-pointer outline-none focus:border-tactical-orange transition-all col-span-2 sm:col-span-1"
              >
                <option value="players" className="bg-zinc-900 text-white">Best Played</option>
                <option value="rank" className="bg-zinc-900 text-white">Global Rank</option>
                <option value="name" className="bg-zinc-900 text-white">Name</option>
              </select>
              <button
                onClick={() => { setModSearch(''); setPersonnelFilter('all'); setRankFilter('all'); setModSort('players'); }}
                className="px-2 py-3 border border-white/10 text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-tactical-orange transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {sortedAndFilteredMods.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-white/5">
            <p className="text-xl font-black text-gray-700 uppercase tracking-widest">No modules matching scan parameters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sortedAndFilteredMods.map((mod: any) => {
              const marketshare = ((mod.serverCount || 0) / 7669) * 100;
              return (
              <Card key={mod.id} className="border-l-4 border-l-zinc-800 hover:border-l-tactical-orange transition-all group overflow-hidden">
                <CardContent className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 relative">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 sm:pb-3">
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Player Rank</p>
                        <p className="text-base sm:text-lg font-black text-white font-mono">#{mod.playerRank}</p>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1 text-right">
                        <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Server Rank</p>
                        <p className="text-base sm:text-lg font-black text-white font-mono">#{mod.serverRank}</p>
                      </div>
                    </div>

                    <Link to={`/mod/${mod.id}`}>
                      <h3 className="text-base sm:text-lg font-black text-white uppercase leading-tight group-hover:text-tactical-orange transition-colors line-clamp-2">
                        {mod.name}
                      </h3>
                    </Link>
                    <p className="text-[7px] sm:text-[9px] font-mono text-gray-600 uppercase tracking-widest truncate">{mod.id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4 border-t border-white/5 pt-3 sm:pt-4">
                     <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Personnel</p>
                        <p className="text-xs sm:text-xs font-black text-white font-mono">{(mod.totalPlayers || 0).toLocaleString()}</p>
                     </div>
                     <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Deployments</p>
                        <p className="text-xs sm:text-xs font-black text-white font-mono">{mod.serverCount || 0}</p>
                     </div>
                  </div>

                  <div className="border-t border-white/5 pt-2 sm:pt-3">
                    <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Marketshare</p>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1">
                      <div className="flex-1 h-1.5 sm:h-2 bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-tactical-orange transition-all duration-500"
                          style={{ width: `${Math.min(marketshare, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs font-black text-tactical-orange font-mono">{marketshare.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-2">
                    <Link
                      to={`/mod/${mod.id}`}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 text-[8px] sm:text-[9px] font-black text-gray-400 text-center uppercase tracking-widest hover:bg-tactical-orange hover:text-black transition-all"
                    >
                      Module Intel
                    </Link>
                    <a
                      href={`https://reforger.armaplatform.com/workshop/${mod.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-3 bg-white/5 border border-white/10 text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-white hover:text-black transition-all text-center"
                    >
                      Workshop ↗
                    </a>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
      </section>
    </div>
  );
}

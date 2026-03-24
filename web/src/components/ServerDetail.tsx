import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { serversApi } from '../api/client';
import { StatusState } from './ui/StatusState';
import { Card, CardContent } from './ui/Card';
import { StatsHero } from './ui/StatsHero';

export function ServerDetail() {
  const { serverId } = useParams<{ serverId: string }>();
  const [server, setServer] = useState<any>(null);
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
    if (!server?.mods) return [];

    let filtered = server.mods.filter((m: any) =>
      (m.name.toLowerCase().includes(modSearch.toLowerCase()) ||
       m.id.toLowerCase().includes(modSearch.toLowerCase())) &&
      (
        personnelFilter === 'all' ||
        (personnelFilter === 'high' && m.totalPlayers >= 500) ||
        (personnelFilter === 'medium' && m.totalPlayers >= 100 && m.totalPlayers < 500) ||
        (personnelFilter === 'low' && m.totalPlayers < 100)
      ) &&
      (
        rankFilter === 'all' ||
        (rankFilter === 'top100' && m.overallRank <= 100) ||
        (rankFilter === 'top500' && m.overallRank <= 500) ||
        (rankFilter === 'top1000' && m.overallRank <= 1000)
      )
    );

    return filtered.sort((a: any, b: any) => {
      if (modSort === 'name') return a.name.localeCompare(b.name);
      if (modSort === 'rank') return a.overallRank - b.overallRank;
      return b.totalPlayers - a.totalPlayers;
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
          { label: 'Personnel Present', value: `${server.players} / ${server.maxPlayers}` },
          { label: 'Module Count', value: server.mods.length },
          { label: 'Capacity Used', value: `${Math.round(fillPercent)}%` },
          { label: 'Encryption', value: 'AES-256' }
        ]}
        title="Field Intelligence Report"
        subtitle="Detailed analysis of deployed assets and personnel distribution"
      />

      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter whitespace-nowrap">
            📦 Installed Mod Stack
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <input 
              type="text"
              placeholder="Filter modules..."
              value={modSearch}
              onChange={(e) => setModSearch(e.target.value)}
              className="px-6 py-3 bg-black/40 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-tactical-orange transition-all min-w-[200px]"
            />
            <select 
              value={personnelFilter}
              onChange={(e) => setPersonnelFilter(e.target.value as any)}
              className="px-6 py-3 bg-zinc-900 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest cursor-pointer outline-none focus:border-tactical-orange transition-all"
            >
              <option value="all" className="bg-zinc-900 text-white">Personnel: All</option>
              <option value="high" className="bg-zinc-900 text-white">Personnel: High (500+)</option>
              <option value="medium" className="bg-zinc-900 text-white">Personnel: Med (100+)</option>
              <option value="low" className="bg-zinc-900 text-white">Personnel: New/Low</option>
            </select>
            <select 
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value as any)}
              className="px-6 py-3 bg-zinc-900 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest cursor-pointer outline-none focus:border-tactical-orange transition-all"
            >
              <option value="all" className="bg-zinc-900 text-white">Rank: All</option>
              <option value="top100" className="bg-zinc-900 text-white">Global Top 100</option>
              <option value="top500" className="bg-zinc-900 text-white">Global Top 500</option>
              <option value="top1000" className="bg-zinc-900 text-white">Global Top 1000</option>
            </select>
            <select 
              value={modSort}
              onChange={(e) => setModSort(e.target.value as any)}
              className="px-6 py-3 bg-zinc-900 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest cursor-pointer outline-none focus:border-tactical-orange transition-all"
            >
              <option value="players" className="bg-zinc-900 text-white">Best Played</option>
              <option value="rank" className="bg-zinc-900 text-white">Global Rank</option>
            </select>
          </div>
        </div>

        {sortedAndFilteredMods.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-white/5">
            <p className="text-xl font-black text-gray-700 uppercase tracking-widest">No modules matching scan parameters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedAndFilteredMods.map((mod: any) => (
              <Card key={mod.id} className="border-l-4 border-l-zinc-800 hover:border-l-tactical-orange transition-all group overflow-hidden">
                <CardContent className="p-8 space-y-6 relative">
                  <span className="absolute top-4 right-6 text-[40px] font-black text-white/5 italic">#{mod.overallRank}</span>

                  <div className="space-y-2">
                    <Link to={`/mod/${mod.id}`}>
                      <h3 className="text-lg font-black text-white uppercase leading-tight group-hover:text-tactical-orange transition-colors pr-12">
                        {mod.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-4 text-[9px] font-mono font-bold uppercase tracking-widest">
                       <span className="text-gray-600 truncate max-w-[120px]">{mod.id}</span>
                       <span className="text-tactical-orange">| Rank #{mod.overallRank}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                     <div className="space-y-1">
                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Personnel</p>
                        <p className="text-xs font-black text-white font-mono">{(mod.totalPlayers || 0).toLocaleString()}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Deployments</p>
                        <p className="text-xs font-black text-white font-mono">{mod.serverCount || 0}</p>
                     </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <Link
                      to={`/mod/${mod.id}`}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 text-center uppercase tracking-widest hover:bg-tactical-orange hover:text-black transition-all"
                    >
                      Module Intel
                    </Link>
                    <a
                      href={`https://reforger.armaplatform.com/workshop/${mod.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                    >
                      Workshop ↗
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

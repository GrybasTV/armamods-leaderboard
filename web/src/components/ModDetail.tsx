import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { modsApi } from '../api/client';
import { StatusState } from './ui/StatusState';
import { Card, CardContent } from './ui/Card';
import { StatsHero } from './ui/StatsHero';

export function ModDetail() {
  const { modId } = useParams<{ modId: string }>();
  const [mod, setMod] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMod = useCallback(async () => {
    if (!modId) return;
    try {
      setLoading(true);
      const data = await modsApi.getById(modId);
      setMod(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mission data');
    } finally {
      setLoading(false);
    }
  }, [modId]);

  useEffect(() => {
    loadMod();
  }, [modId]);

  if (loading) return <StatusState type="loading" />;
  if (error || !mod) return (
    <div className="space-y-8">
      <StatusState 
        type="error" 
        message={error || 'Module not found in registry'} 
        onAction={loadMod} 
        actionText="Re-scan" 
      />
      <Link to="/" className="block text-center text-tactical-orange font-black uppercase tracking-[0.4em] text-[10px] hover:underline">
        ← Return to Database
      </Link>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-6">
        <Link to="/" className="inline-flex items-center gap-4 text-gray-500 hover:text-tactical-orange font-black uppercase tracking-[0.3em] text-[10px] transition-all hover:-translate-x-2">
          ← [ Back to Registry ]
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div className="space-y-4">
            <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.5em]">// MODULE_IDENTIFIER: {mod.modId}</span>
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">
              {mod.name}
            </h1>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em]">
              Authorized by: <span className="text-gray-300">{mod.author || 'UNKNOWN_ORIGIN'}</span>
            </p>
          </div>
          <div className="flex gap-4">
             <div className="px-8 py-4 bg-zinc-900 border border-white/10 text-center">
                <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1">Total Rank</p>
                <p className="text-3xl font-black text-tactical-orange">#{mod.stats?.overallRank || mod.overallRank || '-'}</p>
             </div>
             <div className="px-8 py-4 bg-zinc-900 border border-white/10 text-center">
                <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1">Rank Players</p>
                <p className="text-3xl font-black text-white">#{mod.stats?.playerRank || '-'}</p>
             </div>
             <div className="px-8 py-4 bg-zinc-900 border border-white/10 text-center">
                <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mb-1">Rank Servers</p>
                <p className="text-3xl font-black text-white">#{mod.stats?.serverRank || '-'}</p>
             </div>
          </div>
        </div>
      </header>

      <StatsHero
        stats={[
          { label: 'Total Personnel', value: mod.stats?.totalPlayers || mod.totalPlayers || 0 },
          { label: 'Deployed Servers', value: mod.stats?.serverCount || mod.serverCount || 0 },
          { label: 'Players Rank', value: `#${mod.stats?.playerRank || '-'}` },
          { label: 'Servers Rank', value: `#${mod.stats?.serverRank || '-'}` }
        ]}
        title="Tactical Analytics"
        subtitle="Real-time module performance tracking across global network"
      />

      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
            📡 Active Deployed Servers
          </h2>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Displaying {mod.servers.length} Intel Nodes
          </span>
        </div>

        {mod.servers.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-white/5">
            <p className="text-xl font-black text-gray-700 uppercase tracking-widest">No active deployments detected</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mod.servers.map((server: any) => (
              <Card key={server.id} className="border-l-4 border-l-zinc-800 hover:border-l-tactical-orange transition-all">
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-white uppercase truncate">{server.name}</h3>
                    <p className="text-[9px] font-mono text-gray-600 font-bold uppercase tracking-widest">{server.ip}:{server.port}</p>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                       <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Loadout Status</p>
                       <p className="text-xl font-black text-white">{server.players} / {server.maxPlayers}</p>
                    </div>
                    <Link 
                      to={`/server/${server.id}`}
                      className="px-6 py-3 bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-tactical-orange hover:text-black transition-all"
                    >
                      Inspect →
                    </Link>
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

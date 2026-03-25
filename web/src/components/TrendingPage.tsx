import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { trendingApi } from '../api/client';
import { StatusState } from './ui/StatusState';
import { Card, CardContent } from './ui/Card';
import { StatsHero } from './ui/StatsHero';
import type { TrendingMod } from '../types';

type TrendCategory = 'rising' | 'falling' | 'new';

export function TrendingPage() {
  const [trending, setTrending] = useState<{
    rising: TrendingMod[];
    falling: TrendingMod[];
    new: TrendingMod[];
  }>({ rising: [], falling: [], new: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<TrendCategory>('rising');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadTrending = useCallback(async () => {
    try {
      setLoading(true);
      const data = await trendingApi.getTrending();
      setTrending(data.data);
      setLastUpdated(data.meta.lastUpdated);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrending();
  }, []);

  if (loading) return <StatusState type="loading" />;
  if (error) return (
    <div className="space-y-8">
      <StatusState
        type="error"
        message={error}
        onAction={loadTrending}
        actionText="Retry"
      />
      <Link to="/" className="block text-center text-tactical-orange font-black uppercase tracking-[0.4em] text-[10px] hover:underline">
        ← Return to Database
      </Link>
    </div>
  );

  const currentMods = trending[activeCategory];
  const hasNoData = currentMods.length === 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryLabel = (cat: TrendCategory) => {
    switch (cat) {
      case 'rising': return '📈 Rising Mods';
      case 'falling': return '📉 Falling Mods';
      case 'new': return '⭐ New Mods';
    }
  };

  const getCategoryDescription = (cat: TrendCategory) => {
    switch (cat) {
      case 'rising': return 'Modules gaining significant traction across the network';
      case 'falling': return 'Modules experiencing declining activity';
      case 'new': return 'Recently detected modules in the registry';
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
          <div className="space-y-4">
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">
              Trending Intelligence
            </h1>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em]">
              Daily performance analysis • Last updated: {formatDate(lastUpdated)}
            </p>
          </div>
        </div>
      </header>

      <StatsHero
        stats={[
          { label: 'Rising Mods', value: trending.rising.length },
          { label: 'Falling Mods', value: trending.falling.length },
          { label: 'New Mods', value: trending.new.length },
          { label: 'Analysis Period', value: '24 Hours' }
        ]}
        title="Network Movement Overview"
        subtitle="Daily snapshot of mod performance trends across all active servers"
      />

      <section className="space-y-8">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-4 border-b border-white/10 pb-6">
          {(['rising', 'falling', 'new'] as TrendCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-8 py-4 font-black uppercase tracking-widest text-sm transition-all border-2 ${
                activeCategory === category
                  ? 'bg-tactical-orange text-black border-tactical-orange'
                  : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30 hover:text-white'
              }`}
            >
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
              {getCategoryLabel(activeCategory)}
            </h2>
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-sm">
              {getCategoryDescription(activeCategory)}
            </p>
          </div>

          {hasNoData ? (
            <div className="p-20 text-center border-2 border-dashed border-white/5">
              <p className="text-xl font-black text-gray-700 uppercase tracking-widest">
                No data available for this category
              </p>
              <p className="text-gray-600 mt-2">Trending data will be available after the first daily snapshot</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentMods.map((mod) => (
                <Card key={mod.id} className="border-l-4 border-l-zinc-800 hover:border-l-tactical-orange transition-all group">
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                      <Link to={`/mod/${mod.id}`}>
                        <h3 className="text-lg font-black text-white uppercase leading-tight group-hover:text-tactical-orange transition-colors">
                          {mod.name}
                        </h3>
                      </Link>
                      <p className="text-[9px] font-mono text-gray-600 font-bold uppercase tracking-widest truncate">
                        {mod.id}
                      </p>
                    </div>

                    {/* Rank Badge */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <div className="space-y-1">
                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Global Rank</p>
                        <p className="text-2xl font-black text-tactical-orange">#{mod.overallRank}</p>
                      </div>
                      {activeCategory !== 'new' && mod.prevRank !== undefined && (
                        <div className="text-right">
                          <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Rank Change</p>
                          <p className={`text-sm font-black ${mod.currentRank! < mod.prevRank ? 'text-green-500' : 'text-red-500'}`}>
                            {mod.currentRank! < mod.prevRank ? '↑' : '↓'} {Math.abs(mod.currentRank! - mod.prevRank)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                      <div className="space-y-1">
                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Personnel</p>
                        <p className="text-sm font-black text-white font-mono">
                          {mod.totalPlayers.toLocaleString()}
                          {activeCategory !== 'new' && mod.changePlayers !== undefined && (
                            <span className={`ml-2 text-xs ${mod.changePlayers > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ({mod.changePlayers > 0 ? '+' : ''}{mod.changePlayers})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.2em]">Deployments</p>
                        <p className="text-sm font-black text-white font-mono">
                          {mod.serverCount}
                          {activeCategory !== 'new' && mod.changeServers !== undefined && (
                            <span className={`ml-2 text-xs ${mod.changeServers > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ({mod.changeServers > 0 ? '+' : ''}{mod.changeServers})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-2">
                      <Link
                        to={`/mod/${mod.id}`}
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 text-center uppercase tracking-widest hover:bg-tactical-orange hover:text-black transition-all"
                      >
                        Full Intel
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
        </div>
      </section>
    </div>
  );
}

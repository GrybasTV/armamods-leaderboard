import { Link } from 'react-router-dom';
import { Card, CardContent } from './ui/Card';
import type { Mod } from '../types';

interface ModCardProps {
  mod: Mod;
  rank?: number;
}

export function ModCard({ mod, rank }: ModCardProps) {
  const isTop3 = rank && rank <= 3;

  return (
    <Card className="group relative border-white/5 border-l-2 border-l-zinc-700 hover:border-l-tactical-orange transition-all overflow-hidden bg-black/40">
      <CardContent className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 relative z-10">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
               <div className={`w-1.5 h-1.5 rounded-full ${isTop3 ? 'bg-tactical-orange animate-pulse' : 'bg-gray-700'}`}></div>
               <div className="flex flex-col">
                 <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-[0.3em] text-tactical-orange/80">
                   OVERALL RANK
                 </span>
                 <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest">
                   # {rank}
                 </span>
               </div>
            </div>
          </div>

          <Link to={`/mod/${mod.id}`}>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-white leading-[1.1] uppercase tracking-tight group-hover:translate-x-1 transition-transform hover:text-tactical-orange line-clamp-2" title={mod.name}>
              {mod.name}
            </h3>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 border-y border-white/5 py-4 sm:py-6">
          <div className="space-y-1">
            <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.3em] font-mono italic">Personnel</p>
            <p className="text-lg sm:text-2xl font-black text-white group-hover:text-tactical-orange transition-colors">{(mod.totalPlayers || 0).toLocaleString()}</p>
          </div>
          <div className="space-y-1 border-l border-white/5 pl-2 sm:pl-4">
            <p className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-[0.3em] font-mono italic">Deployments</p>
            <p className="text-lg sm:text-2xl font-black text-white transition-colors">{mod.serverCount}</p>
          </div>
        </div>

        {/* Marketshare */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[6px] sm:text-[7px] text-gray-600 font-black uppercase tracking-[0.2em]">Marketshare</p>
            <p className="text-[7px] sm:text-[8px] font-black text-tactical-orange font-mono">
              {(mod.marketShare || 0).toFixed(1)}%
            </p>
          </div>
          <div className="h-1.5 bg-white/5 overflow-hidden">
            <div
              className="h-full bg-tactical-orange/50 group-hover:bg-tactical-orange transition-all duration-500"
              style={{ width: `${Math.min(mod.marketShare || 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-2">
           <Link
            to={`/mod/${mod.id}`}
            className="w-full sm:flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-zinc-900 border border-white/5 text-center text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-tactical-orange hover:text-black transition-all"
           >
             Full Intel →
           </Link>
           <a
            href={/^\d+$/.test(mod.id)
              ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.id}`
              : `https://reforger.armaplatform.com/workshop/${mod.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-4 bg-white/5 border border-white/5 text-[8px] sm:text-[9px] font-black text-gray-600 uppercase tracking-widest hover:bg-white hover:text-black transition-all"
          >
            Workshop ↗
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

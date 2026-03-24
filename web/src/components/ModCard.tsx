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
      {/* Background rank - more subtle and integrated */}
      <span className="absolute -top-4 -right-2 text-[90px] font-black text-white/[0.03] italic select-none pointer-events-none group-hover:text-tactical-orange/[0.06] transition-all duration-700 -rotate-12 z-0">
        #{rank}
      </span>
      
      <CardContent className="p-8 space-y-6 relative z-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className={`w-1 h-1 rounded-full ${isTop3 ? 'bg-tactical-orange animate-pulse' : 'bg-gray-700'}`}></div>
               <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-600 group-hover:text-tactical-orange transition-colors">
                 [ ASSET_{mod.id.slice(0, 4)} ]
               </span>
            </div>
            {isTop3 && (
              <span className="px-3 py-1 bg-tactical-orange/10 border border-tactical-orange/20 text-tactical-orange font-black text-[9px] uppercase tracking-widest italic">
                Elite Cluster
              </span>
            )}
          </div>

          <Link to={`/mod/${mod.id}`}>
            <h3 className="text-2xl font-black text-white leading-[1.1] uppercase tracking-tight group-hover:translate-x-1 transition-transform hover:text-tactical-orange" title={mod.name}>
              {mod.name}
            </h3>
          </Link>
        </div>

        {/* Improved Stats Grid */}
        <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-6">
          <div className="space-y-1">
            <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em] font-mono italic">Personnel</p>
            <p className="text-2xl font-black text-white group-hover:text-tactical-orange transition-colors">{(mod.totalPlayers || 0).toLocaleString()}</p>
          </div>
          <div className="space-y-1 border-l border-white/5 pl-4">
            <p className="text-[8px] text-gray-600 font-black uppercase tracking-[0.3em] font-mono italic">Deployments</p>
            <p className="text-2xl font-black text-white transition-colors">{mod.serverCount}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
           <Link 
            to={`/mod/${mod.id}`}
            className="flex-1 px-6 py-4 bg-zinc-900 border border-white/5 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-tactical-orange hover:text-black transition-all"
           >
             Full Intel →
           </Link>
           <a 
            href={`https://reforger.armaplatform.com/workshop/${mod.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-4 bg-white/5 border border-white/5 text-[9px] font-black text-gray-600 uppercase tracking-widest hover:bg-white hover:text-black transition-all"
           >
             Workshop ↗
           </a>
        </div>
      </CardContent>
    </Card>
  );
}

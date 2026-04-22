import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent } from './ui/Card';
import type { Server } from '../types';

interface ServerCardProps {
  server: Server;
}

export function ServerCard({ server }: ServerCardProps) {
  const fillPercent = (server.players / server.maxPlayers) * 100;

  const getStatus = () => {
    if (fillPercent >= 80) return { color: 'bg-red-900/30 border-red-900', text: 'text-red-500', icon: '⚡', label: 'CRITICAL LOAD' };
    if (fillPercent >= 50) return { color: 'bg-yellow-900/30 border-yellow-900', text: 'text-yellow-500', icon: '🔋', label: 'HIGH ACTIVITY' };
    if (fillPercent >= 30) return { color: 'bg-green-900/30 border-green-900', text: 'text-green-500', icon: '🟢', label: 'NOMINAL' };
    return { color: 'bg-zinc-800/50 border-zinc-900', text: 'text-zinc-600', icon: '🔘', label: 'STBY' };
  };

  const status = getStatus();

  return (
    <Card className="group overflow-hidden border-none border-l-4 border-l-zinc-800 hover:border-l-tactical-orange transition-all duration-300 bg-zinc-900/50 backdrop-blur-sm">
      <CardHeader className="bg-black/30 p-8 border-b border-white/5">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] text-tactical-orange font-black uppercase tracking-[0.4em]">OVERALL RANK</span>
            <span className="text-xl text-white font-black font-mono tracking-tighter italic"># {server.sqeRank || 'UNRANKED'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className={`px-4 py-2 ${status.color} border flex items-center gap-3 transition-colors shadow-lg`}>
              <span className="text-sm">{status.icon}</span>
              <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${status.text}`}>{status.label}</span>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <span className="text-[8px] text-gray-600 font-black uppercase tracking-[0.4em]">DEPLOYED-MODS</span>
              <span className="text-xl text-white font-black font-mono tracking-tighter">[{server.mods?.length ?? 0}]</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tight group-hover:translate-x-1 transition-transform truncate" title={server.name}>
              {server.name}
            </h3>
            {server.ip && (
              <p className="inline-block text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] font-mono bg-black/60 px-4 py-1.5 border border-white/5">
                {server.ip}:{server.port}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-600">Personnel Status</span>
            <span className="text-[10px] font-mono font-black text-white">{server.players} / {server.maxPlayers}</span>
          </div>
          <div className="relative h-6 bg-black p-[2px] border border-white/10 group-hover:border-white/20 transition-all shadow-inner overflow-hidden">
            <div 
              className={`absolute inset-y-[2px] left-[2px] transition-all duration-1000 ease-in-out bg-tactical-orange/20`}
              style={{ width: `${fillPercent}%` }}
            >
              <div className="absolute inset-x-0 h-[1px] top-0 bg-tactical-orange/30 animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/40 p-6 border border-white/5 group-hover:bg-black transition-all">
            <p className="text-4xl font-black text-white group-hover:text-tactical-orange transition-colors">{server.players}</p>
            <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.4em] mt-2 group-hover:text-gray-400">Deployed</p>
          </div>
          <div className="bg-black/40 p-6 border border-white/5 group-hover:bg-black transition-all">
            <p className="text-4xl font-black text-white group-hover:text-tactical-orange transition-colors">{server.maxPlayers}</p>
            <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.4em] mt-2 group-hover:text-gray-400">Total-Cap</p>
          </div>
        </div>

        <Link
          to={`/server/${server.id}`}
          className="flex items-center justify-center w-full px-10 py-6 bg-white/5 border border-white/10 text-gray-300 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-tactical-orange hover:text-black hover:border-tactical-orange transition-all shadow-lg active:scale-95"
        >
          // ACCESS SIGNAL_ID: {server.id.substring(0, 8)} →
        </Link>
      </CardContent>
    </Card>
  );
}

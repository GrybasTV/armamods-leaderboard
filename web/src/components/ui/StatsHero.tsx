interface StatItem {
  label: string;
  value: string | number;
}

interface StatsHeroProps {
  title: string;
  subtitle: string;
  stats: StatItem[];
}

export function StatsHero({ title, subtitle, stats }: StatsHeroProps) {
  return (
    <div className="relative mb-8 pt-12">
      {/* Decorative scanning line */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-tactical-orange/20 to-transparent"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10 overflow-hidden">
        <div className="space-y-4 max-w-2xl relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-[2px] bg-tactical-orange"></div>
             <span className="text-tactical-orange font-black text-[10px] uppercase tracking-[0.6em] animate-pulse">
               // LIVE_FEED_ACTIVE
             </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none italic">
            {title}
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs max-w-lg border-l-2 border-white/5 pl-6 py-2">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 md:flex gap-1 items-end relative z-10">
          {stats.map((stat, i) => (
            <div key={i} className="min-w-[120px] p-6 bg-zinc-900/40 border border-white/5 backdrop-blur-sm relative group hover:bg-zinc-900/60 transition-all">
              <div className="absolute top-0 right-0 p-1 group-hover:text-tactical-orange transition-colors">
                <div className="w-1 h-1 bg-current opacity-20"></div>
              </div>
              <p className="text-2xl font-black text-white tracking-tighter group-hover:scale-110 transition-transform origin-left">{stat.value}</p>
              <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.3em] mt-2 italic">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="h-px bg-white/5 w-full"></div>
    </div>
  );
}

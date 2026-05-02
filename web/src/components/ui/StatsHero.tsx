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
    <div className="relative mb-6 pt-6">
      {/* Decorative scanning line */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-tactical-orange/20 to-transparent"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 overflow-hidden">
        <div className="space-y-3 max-w-2xl relative z-10">
          <div className="flex items-center gap-3">
             <div className="w-8 h-[1px] bg-tactical-orange"></div>
             <span className="text-tactical-orange font-black text-[9px] uppercase tracking-[0.4em] animate-pulse">
               // LIVE_FEED_ACTIVE
             </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none italic">
            {title}
          </h1>
          <p className="text-gray-600 font-bold uppercase tracking-[0.15em] text-[10px] max-w-lg border-l border-white/10 pl-4 py-1">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 md:flex gap-1 items-stretch relative z-10">
          {stats.map((stat, i) => (
            <div key={i} className="min-w-[100px] p-3 sm:p-4 bg-zinc-900/30 border border-white/5 backdrop-blur-sm relative group hover:bg-zinc-900/50 transition-all">
              <div className="absolute top-0 right-0 p-1 group-hover:text-tactical-orange transition-colors">
                <div className="w-0.5 h-0.5 bg-current opacity-20"></div>
              </div>
              <p className="text-xl font-black text-white tracking-tighter transition-transform origin-left">{stat.value}</p>
              <p className="text-[7px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1 italic">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="h-px bg-white/5 w-full"></div>
    </div>
  );
}

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItemClass = (path: string) => `
    px-10 py-4 font-bold uppercase tracking-[0.2em] text-[10px] transition-all duration-300 relative group
    ${isActive(path)
      ? 'text-tactical-orange bg-white/5 border-l-2 border-r-2 border-tactical-orange'
      : 'text-gray-500 hover:text-white hover:bg-white/5'
    }
  `;

  return (
    <div className="min-h-screen bg-[#0a0c08] flex flex-col font-mono selection:bg-tactical-orange selection:text-black">
      {/* Top Bar - Tactical Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#0a0c08]/80">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="px-8 py-6 border-r border-white/5 flex items-center gap-6 group">
            <Link to="/" className="flex items-center gap-4">
              <div className="w-10 h-10 bg-tactical-orange flex items-center justify-center text-black font-black text-xl tracking-tighter shadow-[0_0_15px_rgba(255,107,0,0.3)] group-hover:scale-110 transition-transform">
                AR
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-black text-white tracking-[0.1em] uppercase leading-none">
                  Arma <span className="text-tactical-orange">Mods</span>
                </h1>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em]">
                  Mission Intelligence Center
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex items-center">
            <Link to="/" className={navItemClass('/')}>
              [ 📦 Mods Database ]
            </Link>
            <Link to="/servers" className={navItemClass('/servers')}>
              [ 🖥️ Active Servers ]
            </Link>
            <Link to="/trending" className={navItemClass('/trending')}>
              [ 📈 Trending Intel ]
            </Link>
          </nav>

          <div className="hidden lg:flex px-8 border-l border-white/5 items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-tactical-orange animate-pulse"></span>
              <span className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">System Uplink: Encrypted</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

      {/* Content Spacer */}
      <div className="h-[84px]"></div>

      <main className="flex-1 max-w-screen-2xl mx-auto px-8 w-full py-12 relative">
        <div className="animate-in fade-in duration-1000">
          {children}
        </div>
      </main>

      {/* Industrial Footer */}
      <footer className="border-t border-white/5 bg-[#0a0c08] relative overflow-hidden">
        <div className="max-w-screen-2xl mx-auto px-10 py-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
            <div className="md:col-span-2 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-2 h-10 bg-tactical-orange"></div>
                <h3 className="text-2xl font-black text-white tracking-widest uppercase">
                  Operation: <span className="text-tactical-orange">Mods Analysis</span>
                </h3>
              </div>
              <p className="text-gray-500 text-sm font-medium leading-[2] max-w-lg uppercase tracking-wider">
                This platform provides strategic overview of the Arma Reforger ecosystem. We track
                server telemetry and player deployment across various custom modules.
                Data synchronized every 1 hour via external collector.
              </p>
              <a
                href="https://www.paypal.com/paypalme/sachta2023"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-tactical-orange/10 border border-tactical-orange/20 text-tactical-orange hover:bg-tactical-orange hover:text-black text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Support Development (€500 goal)
              </a>
            </div>
            
            <div className="space-y-6">
              <h3 className="font-black text-white uppercase tracking-[0.3em] text-[10px] border-b border-white/10 pb-4">Telecommunication</h3>
              <div className="space-y-4">
                <a href="https://github.com/GrybasTV/armamods-leaderboard" target="_blank" rel="noopener noreferrer" className="block text-gray-500 hover:text-tactical-orange font-bold text-xs uppercase tracking-widest transition-colors tracking-[0.2em]">// External GitHub</a>
                <a href="https://www.paypal.com/paypalme/sachta2023" target="_blank" rel="noopener noreferrer" className="block text-gray-500 hover:text-tactical-orange font-bold text-xs uppercase tracking-widest transition-colors tracking-[0.2em]">// Support Project</a>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-black text-white uppercase tracking-[0.3em] text-[10px] border-b border-white/10 pb-4">Infrastructure</h3>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-loose">
                DataSource: <span className="text-gray-300">BattleMetrics</span><br/>
                Compute: <span className="text-gray-300">Edge Workers</span><br/>
                Storage: <span className="text-gray-300">Distributed D1</span>
              </p>
            </div>
          </div>
          
          <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-gray-600 font-bold text-[9px] uppercase tracking-[0.4em]">
              © 2026 COMMUNITY INTELLIGENCE PROJECT. NOT PART OF BOHEMIA INTERACTIVE.
            </p>
            <p className="text-gray-600 font-bold text-[9px] uppercase tracking-[0.4em]">
              EST: ALPHA-0.2
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

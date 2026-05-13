import { SEO } from './ui/SEO';
import { Card, CardContent } from './ui/Card';
import { Shield, Zap, Cpu, Globe, Check, X, AlertTriangle } from 'lucide-react';

export function HostingComparison() {
  const providers = [
    {
      name: "Our Official Partner",
      price: "$9.99",
      slots: "Unlimited",
      ram: "8GB Baseline",
      cpu: "Ryzen / Intel i9",
      locations: "Global (EU/US/AS)",
      bestFor: "Max Performance & Value",
      isWinner: true,
      affLink: "https://empowerservers.com/games/arma-reforger/?aff=294"
    },
    {
      name: "Nitrado",
      price: "~$45.00",
      slots: "64 (Limited)",
      ram: "4GB Baseline",
      cpu: "Shared Xeon",
      locations: "Global",
      bestFor: "Casual Console Play",
      isWinner: false,
      affLink: "#" // USER will provide later
    },
    {
      name: "GTXGaming",
      price: "~$38.00",
      slots: "64 (Limited)",
      ram: "5GB Baseline",
      cpu: "i9 / Ryzen",
      locations: "Global",
      bestFor: "Experienced Owners",
      isWinner: false,
      affLink: "#" // USER will provide later
    },
    {
      name: "PingPerfect",
      price: "~$35.00",
      slots: "64 (Limited)",
      ram: "6GB Baseline",
      cpu: "Standard Xeon",
      locations: "Global",
      bestFor: "Trial Users",
      isWinner: false,
      affLink: "#" // USER will provide later
    }
  ];

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <SEO 
        title="Best Arma 3 & Reforger Hosting 2026 - Top 5 Comparison"
        description="Looking for the best Arma server hosting? We compared Nitrado, GTXGaming, and our official partner based on price, RAM, and CPU performance."
        keywords="best arma hosting, arma 3 server rental, nitrado vs gtxgaming, cheap arma reforger server"
      />

      {/* Header */}
      <section className="text-center space-y-4 pt-12">
        <h1 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter leading-tight">
          Best <span className="text-tactical-orange font-italic italic">Arma Hosting</span><br/>
          Providers 2026
        </h1>
        <p className="text-gray-500 font-bold uppercase tracking-[0.2em] max-w-2xl mx-auto text-sm sm:text-base px-4">
          Independent technical comparison based on hardware specs, per-slot pricing, and network stability.
        </p>
      </section>

      {/* Main Comparison Table */}
      <section className="max-w-7xl mx-auto px-4 overflow-x-auto">
        <table className="w-full border-collapse bg-zinc-950 border border-white/5 min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Provider</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Pricing (64 slots)</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">RAM / Memory</th>
              <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Hardware</th>
              <th className="p-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p, i) => (
              <tr key={i} className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${p.isWinner ? 'bg-tactical-orange/[0.03]' : ''}`}>
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    {p.isWinner && <Zap className="w-5 h-5 text-tactical-orange animate-pulse" />}
                    <div>
                      <div className="text-white font-black uppercase tracking-widest text-sm">{p.name}</div>
                      <div className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">{p.bestFor}</div>
                      {p.isWinner && (
                        <div className="mt-1 inline-block bg-tactical-orange/20 border border-tactical-orange/30 px-2 py-0.5 text-[9px] text-tactical-orange font-black uppercase tracking-tighter">
                          Use Code: 10OFF
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <div className={`text-xl font-black italic ${p.isWinner ? 'text-tactical-orange' : 'text-white'}`}>{p.price}<span className="text-[10px] not-italic text-gray-500">/mo</span></div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{p.slots} Slots</div>
                </td>
                <td className="p-6 text-center">
                  <div className="text-white font-black uppercase tracking-widest text-xs">{p.ram}</div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic">Fast DDR4/DDR5</div>
                </td>
                <td className="p-6 text-center">
                  <div className="text-white font-black uppercase tracking-widest text-xs">{p.cpu}</div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">NVMe SSD Standard</div>
                </td>
                <td className="p-6 text-right">
                  <a 
                    href={p.affLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-block px-6 py-3 font-black uppercase tracking-widest text-[10px] transition-all ${
                      p.isWinner 
                      ? 'bg-tactical-orange text-black hover:bg-white shadow-[0_0_20px_rgba(249,115,22,0.2)]' 
                      : 'border border-white/20 text-white hover:border-white'
                    }`}
                  >
                    {p.isWinner ? 'Deploy Now →' : 'View Plans'}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Why Data Matters Section */}
      <section className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 pt-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-tactical-orange">
            <Cpu className="w-6 h-6" />
            <h3 className="font-black uppercase tracking-widest text-sm">CPU Performance</h3>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-loose italic">
            Arma 3 and Reforger are heavily CPU dependent. Many budget hosts use shared Xeon cores which lead to low server FPS (TPS) when modded. Our winner uses high-frequency Ryzen/i9 nodes.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-tactical-orange">
            <Check className="w-6 h-6" />
            <h3 className="font-black uppercase tracking-widest text-sm">The Slot Trap</h3>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-loose italic">
            Most providers charge $0.50 - $1.00 per slot. This means a 64-player server can cost over $50. We recommend partners who offer flat rates with unlimited players.
          </p>
        </div>
      </section>

      {/* Final Verdict */}
      <section className="max-w-5xl mx-auto px-4 pt-10">
        <Card className="bg-zinc-900 border-tactical-orange/20 overflow-hidden">
          <CardContent className="p-10 text-center space-y-6">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest">Our 2026 Verdict</h2>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest leading-relaxed">
              Based on the technical specs and pricing analysis, our <span className="text-tactical-orange underline decoration-2 underline-offset-4">Official Partner</span> remains the undisputed winner. They offer double the RAM of Nitrado for 1/4 of the price. 
            </p>
            <div className="pt-4">
              <a 
                href="https://empowerservers.com/games/arma-reforger/?aff=294"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-12 py-5 bg-tactical-orange text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-white transition-all shadow-[0_0_40px_rgba(249,115,22,0.3)]"
              >
                Go With Our Top Pick →
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

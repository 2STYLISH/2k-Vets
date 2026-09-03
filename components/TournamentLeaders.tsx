import Link from 'next/link';
import Image from 'next/image';

export default function LeaderboardCard({ title, leaders, dataKey }: { title: string; leaders: any[]; dataKey: string }) {
  if (!leaders || leaders.length === 0) {
    return (
      <div className="card p-4 overflow-hidden">
        <h3 className="text-sm font-display text-white tracking-widest uppercase mb-4">{title}</h3>
        <p className="text-[10px] text-white/30 font-mono uppercase text-center py-4">No data yet</p>
      </div>
    );
  }

  const topLeader = leaders[0];
  const rest = leaders.slice(1, 5);

  return (
    <div className="card overflow-hidden border border-white/[0.06] bg-navy-900/50">
      <div className="bg-white/[0.03] px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-sm font-display text-white tracking-widest uppercase">{title}</h3>
      </div>
      
      {/* Top Leader (Large) */}
      <Link href={`/${topLeader.player.slug || topLeader.player.gamertag.toLowerCase()}`} className="block group relative p-4 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-flag-gold/[0.05] rounded-full blur-xl group-hover:bg-flag-gold/[0.1] transition-colors" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-flag-gold/30 bg-navy-800 shadow-md">
            {topLeader.player.photo_path ? (
              <img src={topLeader.player.photo_path} alt={topLeader.player.gamertag} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-3 opacity-50"><img src="/logo.png" alt="Logo" className="w-full h-full object-contain" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-display text-white truncate tracking-wider uppercase group-hover:text-flag-gold transition-colors">{topLeader.player.gamertag}</h4>
            <p className="text-[10px] font-mono text-white/50 tracking-widest uppercase truncate">{topLeader.teamName}</p>
          </div>
          <div className="text-2xl font-mono font-bold text-flag-gold">
            {Number(topLeader.avg[dataKey]).toFixed(1)}
          </div>
        </div>
      </Link>

      {/* Ranks 2-5 */}
      <div className="divide-y divide-white/[0.03]">
        {rest.map((item, idx) => (
          <Link key={item.player.id} href={`/${item.player.slug || item.player.gamertag.toLowerCase()}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors group">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[10px] font-mono text-white/30 w-3 text-center">{idx + 2}</span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-xs font-display text-white/90 truncate tracking-wider uppercase group-hover:text-flag-gold transition-colors">{item.player.gamertag}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{item.teamName.substring(0, 3)}</span>
              <span className="text-sm font-mono font-bold text-white w-8 text-right group-hover:text-flag-gold transition-colors">{Number(item.avg[dataKey]).toFixed(1)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

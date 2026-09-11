import Link from 'next/link';
import Image from 'next/image';
import { slugify } from '@/lib/format';

export default function LeaderboardCard({ title, leaders, dataKey }: { title: string; leaders: any[]; dataKey: string }) {
  if (!leaders || leaders.length === 0) {
    return (
      <div className="surface-elevated rounded-xl p-4 overflow-hidden">
        <h3 className="text-sm font-display text-white tracking-widest uppercase mb-4">{title}</h3>
        <p className="text-[10px] text-white/30 font-mono uppercase text-center py-4">No data yet</p>
      </div>
    );
  }

  const topLeader = leaders[0];
  const rest = leaders.slice(1, 5);

  return (
    <div className="surface-elevated rounded-xl overflow-hidden">
      <div className="bg-[#111827] px-5 py-3 border-b border-white/10">
        <h3 className="text-sm font-display text-white tracking-widest uppercase">{title}</h3>
      </div>
      
      {/* Top Leader (Large) */}
      <Link href={`/${topLeader.player.slug || slugify(topLeader.player.gamertag)}`} className="block group relative p-5 border-b border-white/10 hover:bg-white/5 transition-colors overflow-hidden">
        <div className="flex items-center gap-5 relative z-10">
          <div className="relative w-16 h-16 bg-[#1f2937] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {topLeader.player.photo_path ? (
              <img src={topLeader.player.photo_path} alt={topLeader.player.gamertag} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-mono text-white/20">TBD</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono text-white/50 tracking-[0.2em] uppercase mb-1">#1</p>
            <div className="flex items-baseline gap-2">
              <h4 className="text-xl font-display text-white truncate tracking-wider uppercase group-hover:text-flag-gold transition-colors leading-none">{topLeader.player.gamertag}</h4>
              {topLeader.player.position && (
                <span className="text-[10px] font-mono text-white/30 uppercase">{topLeader.player.position}</span>
              )}
            </div>
            <p className="text-[10px] font-mono text-white/40 tracking-widest uppercase truncate mt-1">{topLeader.teamName}</p>
          </div>
          <div className="text-3xl font-display text-flag-gold tracking-wider">
            {Number.isInteger(topLeader.avg[dataKey]) ? topLeader.avg[dataKey] : Number(topLeader.avg[dataKey]).toFixed(1)}
            {dataKey.includes('Pct') ? <span className="text-lg">%</span> : ''}
          </div>
        </div>
      </Link>

      {/* Ranks 2-5 */}
      <div className="divide-y divide-white/5 bg-[#1f2937]">
        {rest.map((item, idx) => (
          <Link key={item.player.id} href={`/${item.player.slug || slugify(item.player.gamertag)}`} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-[10px] font-mono text-white/30 w-4 text-center">#{idx + 2}</span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm font-display text-white/90 truncate tracking-wider uppercase group-hover:text-white transition-colors">{item.player.gamertag}</span>
                {item.player.position && (
                  <span className="text-[9px] font-mono text-white/30 uppercase">{item.player.position}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{item.teamName.substring(0, 3)}</span>
              <span className="text-base font-mono font-bold text-white w-12 text-right group-hover:text-flag-gold transition-colors">
                {Number.isInteger(item.avg[dataKey]) ? item.avg[dataKey] : Number(item.avg[dataKey]).toFixed(1)}
                {dataKey.includes('Pct') ? '%' : ''}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

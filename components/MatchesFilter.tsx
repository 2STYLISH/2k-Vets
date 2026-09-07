'use client';

import { useState } from 'react';
import Link from '@/components/HiddenLink';
import { formatDate, formatGameUrl } from '@/lib/format';

export default function MatchesFilter({ rounds, isUpcoming = false }: { rounds: { roundName: string; games: any[] }[], isUpcoming?: boolean }) {
  if (rounds.length === 0) {
      <div className="surface-elevated rounded-xl border border-white/10 p-6">
        <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest font-bold">{isUpcoming ? 'Nothing scheduled.' : 'No results yet.'}</p>
      </div>
  }

  // Sort rounds logically
  const getRoundWeight = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes('ROUND 1') || n.includes('PLAY-IN')) return 1;
    if (n.includes('ROUND 2')) return 2;
    if (n.includes('ROUND 3')) return 3;
    if (n.includes('ROUND 4')) return 4;
    if (n.includes('ROUND 5')) return 5;
    if (n.includes('QUARTER')) return 6;
    if (n.includes('SEMI')) return 7;
    if (n.includes('FINAL')) return 8;
    return 99; // OTHER
  };

  const sortedRounds = [...rounds].sort((a, b) => {
    const weightA = getRoundWeight(a.roundName);
    const weightB = getRoundWeight(b.roundName);
    if (weightA !== weightB) return weightA - weightB;
    // Fallback to alphabetical if same weight (e.g. FINALS GAME 1 vs FINALS GAME 2)
    return a.roundName.localeCompare(b.roundName);
  });

  const [activeRound, setActiveRound] = useState(sortedRounds[0]?.roundName);

  const activeGames = sortedRounds.find(r => r.roundName === activeRound)?.games || [];

  return (
    <div className="surface-elevated rounded-xl border border-white/10 p-6">
      <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-white/10">
        {sortedRounds.map(r => (
          <button
            key={r.roundName}
            onClick={() => setActiveRound(r.roundName)}
            className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest rounded transition-colors ${
              activeRound === r.roundName 
                ? 'bg-flag-red text-white font-bold' 
                : 'bg-[#111827] text-white/50 hover:text-white hover:bg-white/5 border border-white/10'
            }`}
          >
            {r.roundName}
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {activeGames.length === 0 && (
          <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest font-bold">No games found.</p>
        )}
        {activeGames.map((g: any) => {
          const gameId = g.games?.[0]?.id;
          const shortId = g.games?.[0]?.short_id;
          
          if (isUpcoming) {
            return (
              <div key={g.id} className="bg-[#111827] border border-white/10 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:border-white/20 transition-colors">
                <p className="text-sm font-display text-white tracking-widest uppercase truncate">
                  {g.home?.name} <span className="text-white/30 font-mono mx-3">VS</span> {g.away?.name}
                </p>
                {g.scheduled_date && (
                  <p className="text-[10px] font-mono text-flag-gold uppercase tracking-widest shrink-0 font-bold bg-flag-gold/10 px-2.5 py-1 rounded-full border border-flag-gold/20">
                    {formatDate(g.scheduled_date)}
                  </p>
                )}
              </div>
            );
          }

          return gameId ? (
            <Link key={g.id} href={formatGameUrl(gameId, shortId, g.home?.name, g.away?.name)} className="block bg-[#111827] border border-white/10 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:border-white/30 transition-colors">
              <p className="text-sm font-display text-white/80 group-hover:text-white tracking-widest uppercase truncate transition-colors">
                {g.home?.name} <span className="text-white/30 font-mono mx-3">VS</span> {g.away?.name}
              </p>
              <span className="text-[10px] font-mono text-white/30 group-hover:text-flag-red uppercase tracking-widest shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">View Box Score →</span>
            </Link>
          ) : (
            <div key={g.id} className="bg-[#111827] border border-white/10 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 opacity-50">
              <p className="text-sm font-display text-white tracking-widest uppercase truncate">
                {g.home?.name} <span className="text-white/30 font-mono mx-3">VS</span> {g.away?.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

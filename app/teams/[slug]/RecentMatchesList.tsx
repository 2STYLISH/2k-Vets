'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatGameUrl, formatDate } from '@/lib/format';

export default function RecentMatchesList({ games, teamIds }: { games: any[], teamIds: string[] }) {
  const [visibleCount, setVisibleCount] = useState(5);

  const displayedGames = games.slice(0, visibleCount);
  const hasMore = visibleCount < games.length;

  if (games.length === 0) return null;

  return (
    <section className="card p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display text-white tracking-widest">RECENT MATCHES</h2>
      </div>
      <div className="space-y-2">
        {displayedGames.map((g: any) => {
          const home = Array.isArray(g.home) ? g.home[0] : g.home;
          const away = Array.isArray(g.away) ? g.away[0] : g.away;
          const sched = Array.isArray(g.schedule) ? g.schedule[0] : g.schedule;
          const tourney = sched?.tournament ? (Array.isArray(sched.tournament) ? sched.tournament[0] : sched.tournament) : null;
          const isHome = teamIds.includes(g.home_team_id);
          const myScore = isHome ? g.home_score : g.away_score;
          const oppScore = isHome ? g.away_score : g.home_score;
          const won = myScore != null && oppScore != null && myScore > oppScore;
          const opponent = isHome ? away : home;
          const oppSlug = opponent?.slug;

          return (
            <Link href={formatGameUrl(g.id, g.short_id, isHome ? home?.name : away?.name, isHome ? away?.name : home?.name)} key={g.id} className={`flex items-center justify-between p-3 rounded-lg border group hover:shadow-md transition-all ${won ? 'border-emerald-500/20 bg-emerald-950/10 hover:border-emerald-500/50' : 'border-red-500/20 bg-red-950/10 hover:border-red-500/50'}`}>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {won ? 'W' : 'L'}
                </span>
                <div>
                  <p className="text-white text-sm group-hover:text-flag-gold transition-colors">
                    vs {opponent?.name || 'Unknown'}
                  </p>
                  {tourney && <p className="text-[10px] text-white/30 font-mono uppercase">{tourney.name} · {sched?.round_label || ''}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-mono font-bold text-white">
                  {myScore ?? '?'}<span className="text-white/30 mx-1">-</span>{oppScore ?? '?'}
                </p>
                {sched?.scheduled_date && (
                  <p className="text-[10px] text-white/30 font-mono">{formatDate(sched.scheduled_date)}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-4">
        {hasMore && (
          <button 
            onClick={() => setVisibleCount(prev => prev + 5)}
            className="text-[10px] font-mono px-4 py-2 bg-navy-800 border border-white/10 rounded-lg text-flag-gold hover:text-white hover:border-flag-gold/50 uppercase tracking-widest transition-all"
          >
            Show More
          </button>
        )}
        {visibleCount > 5 && (
          <button 
            onClick={() => setVisibleCount(5)}
            className="text-[10px] font-mono px-4 py-2 bg-navy-800/50 border border-white/5 rounded-lg text-white/40 hover:text-white hover:border-white/20 uppercase tracking-widest transition-all"
          >
            Show Less
          </button>
        )}
      </div>
    </section>
  );
}

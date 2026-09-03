'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatGameUrl, formatDate } from '@/lib/format';

export default function RecentMatchesListPlayer({ games, playerTeamId }: { games: any[], playerTeamId: string | null }) {
  const [visibleCount, setVisibleCount] = useState(5);

  const displayedGames = games.slice(0, visibleCount);
  const hasMore = visibleCount < games.length;

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.2em] font-bold">
          MATCH HISTORY / {games.length} RECENT
        </p>
      </div>
      <h2 className="text-2xl font-display text-white uppercase tracking-[0.1em] mb-6">RECENT GAMES</h2>

      <div className="space-y-2">
        {games.length === 0 && <p className="text-white/40 text-sm font-mono">No games found.</p>}
        {displayedGames.map((row, idx) => {
          const game = Array.isArray(row.game) ? row.game[0] : row.game;
          if (!game) return null;
          const schedule = Array.isArray(game.schedule) ? game.schedule[0] : game.schedule;
          const tournament = Array.isArray(schedule?.tournament) ? schedule.tournament[0] : schedule?.tournament;

          const homeTeam = Array.isArray(game.home) ? game.home[0] : game.home;
          const awayTeam = Array.isArray(game.away) ? game.away[0] : game.away;

          const isHome = game.home_team_id === row.team_id;
          const myScore = isHome ? game.home_score : game.away_score;
          const oppScore = isHome ? game.away_score : game.home_score;
          const oppName = isHome ? awayTeam?.name : homeTeam?.name;
          const didWin = myScore > oppScore;

          return (
            <Link href={formatGameUrl(game.id, game.short_id, isHome ? homeTeam?.name : awayTeam?.name, isHome ? awayTeam?.name : homeTeam?.name)} key={game.id + idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-white/[0.06] bg-navy-900/60 hover:bg-white/[0.03] transition-colors rounded-xl group">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 flex items-center justify-center rounded-lg font-mono text-[10px] font-bold ${didWin ? 'bg-green-600 text-white' : 'bg-flag-red text-white'}`}>
                  {didWin ? 'W' : 'L'}
                </div>
                <div>
                  <p className="text-sm font-display tracking-[0.1em] text-white group-hover:text-flag-gold transition-colors uppercase">{oppName || 'TBD'}</p>
                  <p className="text-[9px] font-mono text-white/40 uppercase">{tournament?.name} / {formatDate(schedule?.scheduled_date)}</p>
                </div>
              </div>
              <div className="mt-2 sm:mt-0 flex items-center gap-4">
                <p className="font-mono text-lg text-white">
                  <span className={didWin ? 'text-navy' : 'text-white/40'}>{myScore}</span>
                  <span className="text-white/20 mx-1">-</span>
                  <span className={didWin ? 'text-white/40' : 'text-navy'}>{oppScore}</span>
                </p>
                <p className="text-[9px] font-mono text-white/40 max-w-[120px] text-right">
                  {row.pts} PTS / {row.reb} REB / {row.ast} AST / {row.stl} STL
                </p>
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
    </div>
  );
}

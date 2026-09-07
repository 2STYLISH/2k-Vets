'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatGameUrl, formatDate } from '@/lib/format';

export default function RecentMatchesListPlayer({ games, playerTeamId }: { games: any[], playerTeamId: string | null }) {
  const [visibleCount, setVisibleCount] = useState(5);

  const displayedGames = games.slice(0, visibleCount);
  const hasMore = visibleCount < games.length;

  return (
    <div className="surface-elevated rounded-xl p-6 md:p-8">
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
          const myTeam = isHome ? homeTeam : awayTeam;
          const didWin = myScore > oppScore;

          return (
            <Link href={formatGameUrl(game.id, game.short_id, isHome ? homeTeam?.name : awayTeam?.name, isHome ? awayTeam?.name : homeTeam?.name)} key={game.id + idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-white/10 bg-[#111827] group hover:border-white/30 transition-all rounded-xl">
              <div className="flex items-center gap-4">
                <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border shrink-0 flex items-center justify-center ${didWin ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {didWin ? 'W' : 'L'}
                </span>
                <div>
                  <p className="text-white text-base font-display tracking-[0.1em] uppercase group-hover:text-flag-gold transition-colors">
                    {myTeam?.name || 'Unknown'} <span className="text-white/30 mx-2 text-xs font-mono font-bold">VS</span> {oppName || 'Unknown'}
                  </p>
                  <p className="text-[10px] font-mono text-white/30 uppercase mt-1">{tournament?.name} / {formatDate(schedule?.scheduled_date)}</p>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-white/10 pt-4 sm:pt-0">
                <p className="text-[9px] font-mono text-white/40 max-w-[120px] text-left sm:text-right">
                  {row.pts} PTS / {row.reb} REB / {row.ast} AST / {row.stl} STL
                </p>
                <p className="font-mono text-lg font-bold text-white group-hover:text-flag-gold transition-colors text-right">
                  {myScore ?? '?'}<span className="text-white/30 mx-1">-</span>{oppScore ?? '?'}
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
            className="text-[10px] font-mono px-4 py-2 bg-[#111827] border border-white/10 rounded-lg text-flag-gold hover:text-white hover:border-flag-gold/50 uppercase tracking-widest transition-all"
          >
            Show More
          </button>
        )}
        {visibleCount > 5 && (
          <button 
            onClick={() => setVisibleCount(5)}
            className="text-[10px] font-mono px-4 py-2 bg-[#111827] border border-white/5 rounded-lg text-white/40 hover:text-white hover:border-white/20 uppercase tracking-widest transition-all"
          >
            Show Less
          </button>
        )}
      </div>
    </div>
  );
}

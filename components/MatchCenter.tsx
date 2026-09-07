'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatGameUrl } from '@/lib/format';

function formatDateHuman(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'TODAY';
  if (days === 1) return '1D AGO';
  return `${days}D AGO`;
}

export default function MatchCenter({ games = [] }: { games: any[] }) {
  const [page, setPage] = useState(0);
  const router = useRouter();

  // 4 games per page (1 featured + 3 list)
  const itemsPerPage = 4;
  const totalPages = Math.ceil(games.length / itemsPerPage);

  // First page is always full; the remainder (if any) goes on the last page.
  const startIndex = page * itemsPerPage;
  const currentGames = games.slice(startIndex, startIndex + itemsPerPage);

  if (currentGames.length === 0) {
    return (
      <div className="card p-6">
        <p className="text-white/40 font-mono text-sm uppercase tracking-widest">No matches found.</p>
      </div>
    );
  }

  const featured = currentGames[0];
  const gridGames = currentGames.slice(1, 4);

  const fHome = featured.home?.name || 'TBD';
  const fAway = featured.away?.name || 'TBD';
  const fHomeLogo = featured.home?.logo_url || featured.home?.logo_path;
  const fAwayLogo = featured.away?.logo_url || featured.away?.logo_path;
  const fHomeScore = featured.home_score ?? 0;
  const fAwayScore = featured.away_score ?? 0;
  const fHomeWin = fHomeScore > fAwayScore;
  const fAwayWin = fAwayScore > fHomeScore;
  const fTournament = featured.schedule?.tournament?.name || 'PRO-AM LEAGUE';

  return (
    <div className="w-full surface-elevated rounded-xl overflow-hidden">
      {/* Header with accent stripe */}
      <div className="accent-stripe" />
      <div className="flex items-center justify-between p-4 md:px-6 border-b border-white/10 bg-[#1f2937]">
        <div>
          <h2 className="text-2xl font-display text-white uppercase tracking-[0.12em]">MATCH CENTER</h2>
          <p className="text-[9px] text-white/50 font-mono uppercase tracking-[0.2em] mt-0.5 font-bold">RECENT RESULTS</p>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/50 font-mono bg-[#111827] px-3 py-1 rounded border border-white/10">
            {page + 1}/{totalPages || 1}
          </span>
          <div className="flex">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-white/50 border border-white/10 rounded-l hover:bg-white/5 hover:text-white transition-all disabled:opacity-25"
            >
              ◀
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-white/50 border border-white/10 border-l-0 rounded-r hover:bg-white/5 hover:text-white transition-all disabled:opacity-25"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row bg-[#1f2937]">
        {/* Featured Game */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center gap-8 min-h-[300px] relative border-b lg:border-b-0 lg:border-r border-white/10 group/featured overflow-hidden">

          <div className="flex justify-between items-start relative z-10">
            <span className="pin-badge">FINAL</span>
            <div className="text-right">
              <span className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.15em] block font-bold">{fTournament}</span>
              <span className="text-[10px] text-white/50 font-mono uppercase tracking-[0.15em] block mt-1">{formatDateHuman(featured.schedule?.scheduled_date)}</span>
            </div>
          </div>

          {/* Score block */}
          <div className="flex items-center justify-center flex-col sm:flex-row gap-6 relative z-10 w-full mt-4">

            {/* Home Team */}
            <div className="flex flex-col items-center gap-4 flex-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-[#111827] border border-white/10 flex items-center justify-center p-2 rounded-lg shadow-lg">
                {fHomeLogo ? (
                  <img src={fHomeLogo} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-white/20 font-mono text-xs">TBD</span>
                )}
              </div>
              <span className="text-xl sm:text-2xl font-display text-white tracking-[0.1em] text-center">{fHome}</span>
            </div>

            {/* Scores */}
            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              <span className={`text-5xl sm:text-6xl lg:text-7xl font-display tracking-wider ${fHomeWin ? 'text-white' : 'text-white/40'}`}>
                {fHomeScore}
              </span>
              <span className="text-xs text-white/20 font-mono uppercase tracking-widest font-bold pt-4">-</span>
              <span className={`text-5xl sm:text-6xl lg:text-7xl font-display tracking-wider ${fAwayWin ? 'text-white' : 'text-white/40'}`}>
                {fAwayScore}
              </span>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-4 flex-1">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-[#111827] border border-white/10 flex items-center justify-center p-2 rounded-lg shadow-lg">
                {fAwayLogo ? (
                  <img src={fAwayLogo} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-white/20 font-mono text-xs">TBD</span>
                )}
              </div>
              <span className="text-xl sm:text-2xl font-display text-white tracking-[0.1em] text-center">{fAway}</span>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-white/10 pt-6 mt-auto relative z-10">
            <span className="text-xs font-mono text-white/40 uppercase tracking-[0.15em]">
              {fHomeWin ? <span className="text-white"><span className="text-flag-gold"></span> {fHome} WINS</span> : fAwayWin ? <span className="text-white"><span className="text-flag-gold"></span> {fAway} WINS</span> : 'TIE'}
            </span>
            <button
              onClick={() => router.push(formatGameUrl(featured.id, featured.short_id, featured.home?.name, featured.away?.name))}
              className="btn-secondary py-2 text-xs"
            >
              BOX SCORE
            </button>
          </div>
        </div>

        {/* Right: Recent Matches List */}
        <div className="w-full lg:w-[360px] xl:w-[400px] flex flex-col divide-y divide-white/10 bg-[#1f2937] shrink-0">
          {gridGames.map(g => <GridMatch key={g.id} game={g} />)}
        </div>
      </div>
    </div>
  );
}

function GridMatch({ game }: { game: any }) {
  const router = useRouter();

  const hName = game.home?.name || 'TBD';
  const aName = game.away?.name || 'TBD';
  const hLogo = game.home?.logo_url || game.home?.logo_path;
  const aLogo = game.away?.logo_url || game.away?.logo_path;
  const hScore = game.home_score ?? 0;
  const aScore = game.away_score ?? 0;
  const hWin = hScore > aScore;
  const aWin = aScore > hScore;

  return (
    <div onClick={() => router.push(formatGameUrl(game.id, game.short_id, hName, aName))} className="cursor-pointer flex-1 p-5 hover:bg-white/5 transition-all duration-200 flex flex-col justify-center relative group">

      <div className="flex justify-between items-center mb-4">
        <span className="text-[9px] font-mono text-white/40 uppercase tracking-[0.15em] font-bold">
          FINAL <span className="text-white/20 mx-1">/</span> {formatDateHuman(game.schedule?.scheduled_date)}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 bg-[#111827] border border-white/10 rounded flex items-center justify-center p-1 shrink-0">
              {hLogo ? <img src={hLogo} className="w-full h-full object-contain" /> : <span className="text-[8px] text-white/20 font-mono">TBD</span>}
            </div>
            <span className={`text-base font-display tracking-[0.1em] truncate ${hWin ? 'text-white' : 'text-white/50'}`}>{hName}</span>
          </div>
          <span className={`text-xl font-display tracking-wide shrink-0 ${hWin ? 'text-white' : 'text-white/40'}`}>{hScore}</span>
        </div>

        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 bg-[#111827] border border-white/10 rounded flex items-center justify-center p-1 shrink-0">
              {aLogo ? <img src={aLogo} className="w-full h-full object-contain" /> : <span className="text-[8px] text-white/20 font-mono">TBD</span>}
            </div>
            <span className={`text-base font-display tracking-[0.1em] truncate ${aWin ? 'text-white' : 'text-white/50'}`}>{aName}</span>
          </div>
          <span className={`text-xl font-display tracking-wide shrink-0 ${aWin ? 'text-white' : 'text-white/40'}`}>{aScore}</span>
        </div>
      </div>
    </div>
  );
}

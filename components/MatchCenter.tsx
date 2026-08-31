'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  // Fill from the end: the last page should be full first, meaning any remainder goes to the first page.
  const remainder = games.length % itemsPerPage;
  const firstPageCount = remainder === 0 || games.length === 0 ? itemsPerPage : remainder;

  const startIndex = page === 0 ? 0 : firstPageCount + (page - 1) * itemsPerPage;
  const currentCount = page === 0 ? firstPageCount : itemsPerPage;

  const currentGames = games.slice(startIndex, startIndex + currentCount);

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
  const fHomeLogo = featured.home?.logo_url;
  const fAwayLogo = featured.away?.logo_url;
  const fHomeScore = featured.home_score ?? 0;
  const fAwayScore = featured.away_score ?? 0;
  const fHomeWin = fHomeScore > fAwayScore;
  const fAwayWin = fAwayScore > fHomeScore;
  const fTournament = featured.schedule?.tournament?.name || 'PRO-AM LEAGUE';

  return (
    <div className="w-full card overflow-hidden">
      {/* Header with accent stripe */}
      <div className="accent-stripe" />
      <div className="flex items-center justify-between p-4 md:px-6 border-b border-white/[0.06]">
        <div>
          <h2 className="text-2xl font-display text-white uppercase tracking-[0.12em]">MATCH CENTER</h2>
          <p className="text-[9px] text-white/40 font-mono uppercase tracking-[0.2em] mt-0.5">RECENT RESULTS</p>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/50 font-mono bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
            {page + 1}/{totalPages || 1}
          </span>
          <div className="flex">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-white/50 border border-white/[0.08] rounded-l-lg hover:bg-white/[0.04] hover:text-white transition-all disabled:opacity-25"
            >
              ◀
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-white/50 border border-white/[0.08] border-l-0 rounded-r-lg hover:bg-white/[0.04] hover:text-white transition-all disabled:opacity-25"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Featured Game */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center gap-6 min-h-[260px] relative border-b lg:border-b-0 lg:border-r border-white/[0.06] group/featured overflow-hidden">
          {/* Subtle radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-white/[0.02] rounded-full blur-[80px] pointer-events-none group-hover/featured:bg-white/[0.04] transition-colors duration-500" />

          <div className="flex justify-between items-start relative z-10">
            <span className="text-[10px] bg-flag-red/10 text-flag-red px-3 py-1.5 rounded-lg border border-flag-red/15 font-mono uppercase tracking-[0.15em] font-bold">FINAL</span>
            <div className="text-right">
              <span className="text-[10px] text-white font-mono uppercase tracking-[0.15em] block font-semibold">{fTournament}</span>
              <span className="text-[9px] text-white/40 font-mono uppercase tracking-[0.15em] block mt-0.5">{formatDateHuman(featured.schedule?.scheduled_date)}</span>
            </div>
          </div>

          {/* Score block */}
          <div className="flex items-center justify-between flex-col sm:flex-row gap-4 relative z-10 w-full">
            <div className="flex flex-row sm:flex-col items-center gap-3 sm:gap-4 flex-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
              {fHomeLogo ? (
                <img src={fHomeLogo} className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-cover rounded-xl border-2 border-white/[0.06] bg-navy-900 shadow-md shrink-0" />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl bg-white/[0.06] border-2 border-white/[0.06] shadow-md shrink-0" />
              )}
              <span className="text-lg sm:text-xl lg:text-2xl font-display text-white tracking-[0.1em] leading-tight truncate min-w-0">{fHome}</span>
            </div>

            <div className="flex items-center gap-3 sm:gap-5 px-2 sm:px-4 shrink-0">
              <div className={`text-3xl lg:text-5xl font-mono px-3 py-2 sm:px-4 lg:px-5 lg:py-3 rounded-xl border-2 shadow-md transition-colors ${fHomeWin ? 'bg-flag-red text-white border-flag-red' : 'bg-navy-900 text-white/70 border-white/[0.08]'}`}>
                {fHomeScore}
              </div>
              <span className="text-xs text-white/30 font-mono uppercase tracking-widest font-bold">VS</span>
              <div className={`text-3xl lg:text-5xl font-mono px-3 py-2 sm:px-4 lg:px-5 lg:py-3 rounded-xl border-2 shadow-md transition-colors ${fAwayWin ? 'bg-flag-red text-white border-flag-red' : 'bg-navy-900 text-white/70 border-white/[0.08]'}`}>
                {fAwayScore}
              </div>
            </div>

            <div className="flex flex-row-reverse sm:flex-col items-center gap-3 sm:gap-4 flex-1 justify-start sm:justify-end text-center sm:text-right min-w-0 w-full sm:w-auto">
              <span className="text-lg sm:text-xl lg:text-2xl font-display text-white tracking-[0.1em] leading-tight truncate min-w-0">{fAway}</span>
              {fAwayLogo ? (
                <img src={fAwayLogo} className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-cover rounded-xl border-2 border-white/[0.06] bg-navy-900 shadow-md shrink-0" />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl bg-white/[0.06] border-2 border-white/[0.06] shadow-md shrink-0" />
              )}
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-white/[0.06] pt-4 mt-auto relative z-10">
            <span className="text-[11px] font-mono text-flag-gold uppercase tracking-[0.15em] font-bold">
              {fHomeWin ? `${fHome} WINS` : fAwayWin ? `${fAway} WINS` : 'TIE'}
            </span>
            <div
              onClick={() => router.push(`/games/${featured.id}`)}
              className="cursor-pointer text-[10px] font-mono text-white/70 bg-navy-900 hover:bg-flag-red hover:text-white border border-white/10 px-4 py-2 rounded-xl uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-2 shadow-sm"
            >
              BOX SCORE <span className="transition-colors">→</span>
            </div>
          </div>
        </div>

        {/* Right: Recent Matches List */}
        <div className="w-full lg:w-[360px] xl:w-[400px] flex flex-col divide-y divide-navy-100/30 bg-navy-900/30 shrink-0">
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
  const hLogo = game.home?.logo_url;
  const aLogo = game.away?.logo_url;
  const hScore = game.home_score ?? 0;
  const aScore = game.away_score ?? 0;
  const hWin = hScore > aScore;
  const aWin = aScore > hScore;

  return (
    <div onClick={() => router.push(`/games/${game.id}`)} className="cursor-pointer flex-1 p-4 bg-transparent hover:bg-white/[0.03] transition-all duration-300 flex flex-col justify-center min-h-[110px] relative group">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-navy rounded-r scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />

      <div className="flex justify-between items-center mb-3">
        <span className="text-[9px] font-mono text-flag-red uppercase tracking-[0.15em] font-bold">
          FINAL <span className="text-white/30 font-normal tracking-widest ml-1">· {formatDateHuman(game.schedule?.scheduled_date)}</span>
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {hLogo ? (
              <img src={hLogo} className="w-6 h-6 rounded-lg border border-white/[0.06] bg-navy-900 object-cover shrink-0 shadow-sm" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.06] shrink-0 shadow-sm" />
            )}
            <span className={`text-sm font-display tracking-[0.1em] truncate ${hWin ? 'text-white font-bold' : 'text-white/50'}`}>{hName}</span>
          </div>
          <span className={`text-sm font-mono px-2.5 py-1 rounded-lg shadow-sm shrink-0 ${hWin ? 'bg-flag-red text-white font-bold' : 'bg-navy-900 text-white/40 border border-white/[0.06]'}`}>{hScore}</span>
        </div>

        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {aLogo ? (
              <img src={aLogo} className="w-6 h-6 rounded-lg border border-white/[0.06] bg-navy-900 object-cover shrink-0 shadow-sm" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.06] shrink-0 shadow-sm" />
            )}
            <span className={`text-sm font-display tracking-[0.1em] truncate ${aWin ? 'text-white font-bold' : 'text-white/50'}`}>{aName}</span>
          </div>
          <span className={`text-sm font-mono px-2.5 py-1 rounded-lg shadow-sm shrink-0 ${aWin ? 'bg-flag-red text-white font-bold' : 'bg-navy-900 text-white/40 border border-white/[0.06]'}`}>{aScore}</span>
        </div>
      </div>
    </div>
  );
}

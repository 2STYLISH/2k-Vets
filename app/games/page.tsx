import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import Link from '@/components/HiddenLink';

export default async function GameBoxScorePage({ searchParams }: { searchParams: { id: string } }) {
  const supabase = createClient();
  const gameId = searchParams.id;
  
  if (!gameId) notFound();

  const { data: game } = await supabase
    .from('games')
    .select(`
      id,
      schedule_id,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url),
      schedules!inner(tournament_id, round_label, status, scheduled_date)
    `)
    .eq('short_id', gameId)
    .maybeSingle();

  if (!game) notFound();

  // Fetch Quarter Scores
  const { data: quarterScores } = await supabase
    .from('quarter_scores')
    .select('quarter, home_score, away_score')
    .eq('game_id', game.id)
    .order('quarter', { ascending: true });

  // Fetch Player Stats
  const { data: stats } = await supabase
    .from('player_game_stats')
    .select(`
      *,
      player:players(id, gamertag, position, slug)
    `)
    .eq('game_id', game.id)
    .order('pts', { ascending: false });

  const POS_ORDER: Record<string, number> = { PG: 1, SG: 2, SF: 3, PF: 4, C: 5 };
  
  function sortStats(statsArr: any[]) {
    return statsArr.sort((a, b) => {
      const posA = a.position ? POS_ORDER[a.position] || 99 : 99;
      const posB = b.position ? POS_ORDER[b.position] || 99 : 99;
      if (posA !== posB) return posA - posB;
      return b.pts - a.pts; // Fallback to points descending
    });
  }

  const homeStats = sortStats(stats?.filter(s => s.team_id === (game.home_team as any)?.id && !s.did_not_play) || []);
  const awayStats = sortStats(stats?.filter(s => s.team_id === (game.away_team as any)?.id && !s.did_not_play) || []);

  // Determine POTG
  let potg: any = null;
  let highestRating = -Infinity;
  const isHomeWinner = (game.home_score || 0) > (game.away_score || 0);
  const winningStats = isHomeWinner ? homeStats : awayStats;

  winningStats.forEach(s => {
    // Basic impact rating: PTS + REB + AST + STL + BLK - TO - (FGA - FGM)
    const rating = s.pts + s.reb + s.ast + s.stl + s.blk - s.turnovers - (s.fga - s.fgm);
    if (rating > highestRating) {
      highestRating = rating;
      potg = { ...s, impactRating: rating };
    }
  });


  function renderStatTable(teamName: string, teamStats: any[], isWinner: boolean) {
    return (
      <div className="relative card overflow-hidden transition-colors">
        {isWinner && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-navy via-flag-red to-flag-gold" />
        )}
        <div className="px-6 py-5 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.03]">
          <div className="flex items-center gap-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm ${isWinner ? 'bg-flag-red/10 text-white border-flag-red/20' : 'bg-white/[0.06] text-white/40 border-white/[0.06]'}`}>
              <span className="text-[10px] font-mono font-bold tracking-wider">{teamName.slice(0, 3).toUpperCase()}</span>
            </div>
            <h2 className="text-xl text-white font-display tracking-[0.1em] uppercase">{teamName}</h2>
          </div>
          {isWinner && (
            <span className="text-[10px] uppercase font-mono tracking-[0.15em] text-white border border-flag-red/20 bg-flag-red/10 px-3 py-1 rounded-lg font-bold">Winner</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs stat-mono">
            <thead>
              <tr className="bg-navy text-[9px] text-white/80 uppercase tracking-widest">
                <th className="text-left px-6 py-4 font-mono font-medium">Player</th>
                <th className="px-4 py-4 text-right font-medium">PTS</th>
                <th className="px-4 py-4 text-right font-medium">REB</th>
                <th className="px-4 py-4 text-right font-medium">AST</th>
                <th className="px-4 py-4 text-right font-medium">STL</th>
                <th className="px-4 py-4 text-right font-medium">BLK</th>
                <th className="px-4 py-4 text-right font-medium">TO</th>
                <th className="px-4 py-4 text-right font-medium">FG</th>
                <th className="px-4 py-4 text-right font-medium">3PT</th>
                <th className="px-4 py-4 text-right font-medium">FT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100/20">
              {teamStats.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-white/40 text-center font-mono uppercase tracking-widest text-[10px]">
                    No stats recorded for this team.
                  </td>
                </tr>
              )}
              {teamStats.map(s => {
                const p = s.player;
                const isPotg = potg?.id === s.id;
                return (
                  <tr key={s.id} className={`group/row transition-all hover:bg-white/[0.03] ${isPotg ? 'bg-flag-gold/[0.04]' : ''}`}>
                    <td className="px-6 py-3.5 flex items-center gap-3">
                      {s.position && (
                        <span className="w-7 text-center text-[9px] bg-white/[0.06] text-white/50 border border-white/[0.06] rounded-md px-1 py-1 uppercase tracking-widest font-bold group-hover/row:border-white/20 transition-colors">
                          {s.position.slice(0, 2)}
                        </span>
                      )}
                      <div className="flex items-center">
                        <Link href={`/${p?.slug || p?.gamertag?.toLowerCase()}`} className={`font-body transition-colors font-medium ${isPotg ? 'text-flag-gold' : 'text-white/90 group-hover/row:text-flag-gold'}`}>
                          {p?.gamertag}
                        </Link>

                        {isPotg && (
                          <span className="ml-3 text-[12px]" title="Player of the Game">🏆</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-white font-bold text-sm">{s.pts}</td>
                    <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{s.reb}</td>
                    <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{s.ast}</td>
                    <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{s.stl}</td>
                    <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{s.blk}</td>
                    <td className="px-4 py-3.5 text-right text-white/40 group-hover/row:text-white/70 transition-colors">{s.turnovers}</td>
                    <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{s.fgm}/{s.fga}</td>
                    <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{s.tpm}/{s.tpa}</td>
                    <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{s.ftm}/{s.fta}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="pt-2">
        <BackButton />
      </div>
      
      {/* Top Scoreboard (Hero) */}
      <div className="relative rounded-3xl overflow-hidden card border-white/[0.08]">
        {/* Subtle radial gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.04),transparent_70%)]" />
        <div className="relative z-10 px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-12 md:gap-24">

            {/* Home Team */}
            <div className="flex-1 text-center md:text-right flex flex-col items-center md:items-end w-full">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-navy-900 border-2 border-white/[0.06] mb-4 md:mb-6 flex items-center justify-center overflow-hidden shadow-lg p-4">
                {(game.home_team as any)?.logo_url ? (
                  <img src={(game.home_team as any).logo_url} alt={(game.home_team as any).name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl text-white/30 font-display tracking-widest">{(game.home_team as any)?.name?.slice(0, 3).toUpperCase()}</span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-display tracking-[0.1em] text-white uppercase">{(game.home_team as any)?.name}</h1>
              <div className="relative mt-2 sm:mt-4">
                <p className="text-5xl sm:text-6xl md:text-8xl font-display text-white tracking-tighter">{game.home_score ?? '-'}</p>
                {isHomeWinner && <div className="absolute -left-4 sm:-left-8 top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-flag-red shadow-[0_0_12px_rgba(206,17,38,0.6)]" title="Winner" />}
              </div>
            </div>

            {/* Divider */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-px bg-gradient-to-b from-transparent via-navy-200 to-transparent hidden md:block" />
              <span className="text-sm font-mono text-white/40 uppercase tracking-[0.3em] px-4 py-2 rounded-xl border border-white/[0.06] bg-navy-900/60 backdrop-blur-sm">Final</span>
              <div className="h-16 w-px bg-gradient-to-t from-transparent via-navy-200 to-transparent hidden md:block" />
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start w-full">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-navy-900 border-2 border-white/[0.06] mb-4 md:mb-6 flex items-center justify-center overflow-hidden shadow-lg p-4">
                {(game.away_team as any)?.logo_url ? (
                  <img src={(game.away_team as any).logo_url} alt={(game.away_team as any).name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl text-white/30 font-display tracking-widest">{(game.away_team as any)?.name?.slice(0, 3).toUpperCase()}</span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-display tracking-[0.1em] text-white uppercase">{(game.away_team as any)?.name}</h1>
              <div className="relative mt-2 sm:mt-4">
                <p className="text-5xl sm:text-6xl md:text-8xl font-display text-white tracking-tighter">{game.away_score ?? '-'}</p>
                {!isHomeWinner && (game.away_score || 0) > (game.home_score || 0) && <div className="absolute -right-4 sm:-right-8 top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-flag-red shadow-[0_0_12px_rgba(206,17,38,0.6)]" title="Winner" />}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* POTG Banner */}
      {potg && (
        <div className="relative overflow-hidden card border-flag-gold/20 group transition-all hover:border-flag-gold/40 hover:shadow-[0_8px_32px_rgba(212,160,23,0.10)]">
          {/* Gold accent top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-flag-gold/60 via-flag-gold to-flag-gold/60" />
          <div className="absolute -right-20 -top-20 text-[15rem] text-flag-gold/[0.04] rotate-12 pointer-events-none select-none font-display transition-transform group-hover:scale-110 duration-700">🏆</div>
          
          <div className="relative z-10 p-8 flex flex-col lg:flex-row items-center lg:items-center justify-between gap-10">
            <div className="flex items-center gap-8 w-full lg:w-auto">
              <div className="w-20 h-20 rounded-2xl bg-flag-gold/10 border border-flag-gold/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-4xl">🏆</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-mono text-flag-gold uppercase tracking-[0.3em] mb-2 font-bold">Player of the Game</p>
                <Link href={`/${potg.player?.slug || potg.player?.gamertag?.toLowerCase()}`} className="text-3xl md:text-4xl font-display tracking-[0.1em] text-white uppercase hover:text-flag-gold transition-colors">
                  {potg.player?.gamertag}
                </Link>
                <div className="flex flex-wrap gap-2 mt-4">
                  {(() => {
                    const statsArr = [potg.pts, potg.reb, potg.ast, potg.stl, potg.blk];
                    const doubleDigits = statsArr.filter(s => s >= 10).length;
                    if (doubleDigits >= 3) {
                      return <span className="px-3 py-1 rounded-lg border border-purple-400/40 bg-purple-50 text-[10px] font-mono text-purple-600 uppercase tracking-[0.1em] font-bold">Triple-Double</span>;
                    }
                    if (doubleDigits >= 2) {
                      return <span className="px-3 py-1 rounded-lg border border-white/[0.08] bg-white/[0.06] text-[10px] font-mono text-white uppercase tracking-[0.1em] font-bold">Double-Double</span>;
                    }
                    return null;
                  })()}
                  <span className="px-3 py-1 rounded-lg border border-white/[0.06] bg-navy-900 text-[10px] font-mono text-white/50 uppercase tracking-[0.1em]">
                    {potg.fgm}/{potg.fga} FG
                  </span>
                  {potg.tpm >= 4 && (
                    <span className="px-3 py-1 rounded-lg border border-white/[0.06] bg-navy-900 text-[10px] font-mono text-white/50 uppercase tracking-[0.1em]">
                      {potg.tpm} 3PT
                    </span>
                  )}
                  {potg.stl >= 3 && (
                    <span className="px-3 py-1 rounded-lg border border-white/[0.06] bg-navy-900 text-[10px] font-mono text-white/50 uppercase tracking-[0.1em]">
                      {potg.stl} STL
                    </span>
                  )}
                  {potg.blk >= 3 && (
                    <span className="px-3 py-1 rounded-lg border border-white/[0.06] bg-navy-900 text-[10px] font-mono text-white/50 uppercase tracking-[0.1em]">
                      {potg.blk} BLK
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center w-full lg:w-auto gap-8 lg:gap-12 p-6 lg:p-0 rounded-xl bg-white/[0.03] lg:bg-transparent border lg:border-none border-white/[0.06]">
              <div className="text-center">
                <p className="text-[11px] font-mono text-flag-gold/80 uppercase tracking-widest mb-2 font-medium">PTS</p>
                <p className="text-4xl font-display text-white tracking-tight">{potg.pts}</p>
              </div>
              <div className="w-px bg-gradient-to-b from-transparent via-navy-200 to-transparent" />
              <div className="text-center">
                <p className="text-[11px] font-mono text-flag-gold/80 uppercase tracking-widest mb-2 font-medium">REB</p>
                <p className="text-4xl font-display text-white tracking-tight">{potg.reb}</p>
              </div>
              <div className="w-px bg-gradient-to-b from-transparent via-navy-200 to-transparent" />
              <div className="text-center">
                <p className="text-[11px] font-mono text-flag-gold/80 uppercase tracking-widest mb-2 font-medium">AST</p>
                <p className="text-4xl font-display text-white tracking-tight">{potg.ast}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Box Scores Grid */}
      <div className="space-y-10 pt-4">
        {game.home_team && renderStatTable((game.home_team as any).name, homeStats, isHomeWinner)}
        {game.away_team && renderStatTable((game.away_team as any).name, awayStats, !isHomeWinner && (game.away_score || 0) > (game.home_score || 0))}
      </div>

    </div>
  );
}

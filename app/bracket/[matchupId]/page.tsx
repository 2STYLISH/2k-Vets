import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from '@/components/HiddenLink';
import BackButton from '@/components/BackButton';
import { formatGameUrl } from '@/lib/format';
import Image from 'next/image';

export default async function MatchupDetailPage({ params }: { params: { matchupId: string } }) {
  const supabase = createClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.matchupId);

  let query = supabase
    .from('bracket_matchups')
    .select(
      'id, short_id, round, slot, status, winner_id, tournament_id, team_a:teams!bracket_matchups_team_a_id_fkey(id,name,logo_url), team_b:teams!bracket_matchups_team_b_id_fkey(id,name,logo_url), tournament:tournaments(name)'
    );

  if (isUuid) {
    query = query.eq('id', params.matchupId);
  } else {
    query = query.eq('short_id', params.matchupId);
  }

  const { data: matchup } = await query.maybeSingle();

  if (!matchup) notFound();

  const { data: series } = await supabase
    .from('series')
    .select('id, match_format, team_a_id, team_b_id, team_a_wins, team_b_wins, status, winner_id')
    .eq('bracket_matchup_id', matchup.id)
    .maybeSingle();

  const { data: schedules } = series
    ? await supabase
        .from('schedules')
        .select(`
          id, 
          round_label, 
          status, 
          scheduled_date,
          scheduled_time,
          home_team_id,
          away_team_id,
          games (
            id,
            short_id,
            home_score,
            away_score,
            status
          )
        `)
        .eq('series_id', series.id)
        .order('created_at', { ascending: true })
    : { data: [] };

  const teamA = matchup.team_a as any;
  const teamB = matchup.team_b as any;

  let scoreA = series?.team_a_wins;
  let scoreB = series?.team_b_wins;
  if (series && teamA) {
    if (series.team_b_id === teamA.id) {
      scoreA = series.team_b_wins;
      scoreB = series.team_a_wins;
    }
  }

  return (
    <div className="space-y-8">
      <BackButton />

      {/* Hero Section */}
      <div className="relative card overflow-hidden border-0 bg-gradient-to-b from-navy-800 to-navy-900 shadow-2xl">
        {/* Animated Glow Elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-flag-red/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-flag-gold/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-flag-red via-flag-gold to-navy-500" />
        
        <div className="relative p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-xs font-mono text-white/50 uppercase tracking-[0.2em] mb-2">{(matchup.tournament as any)?.name}</p>
            <div className="inline-flex items-center gap-3 bg-navy-950/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
              <span className={`w-2 h-2 rounded-full ${matchup.status === 'COMPLETED' ? 'bg-flag-gold' : matchup.status === 'IN_PROGRESS' ? 'bg-flag-red animate-pulse' : 'bg-white/20'}`} />
              <p className="text-xs font-mono text-white/70 uppercase tracking-wider">{matchup.status.replace(/_/g, ' ')}</p>
              {series?.match_format && (
                <>
                  <span className="text-white/20">•</span>
                  <p className="text-xs font-mono text-white/70 uppercase tracking-wider">{series.match_format}</p>
                </>
              )}
            </div>
          </div>

          {/* Matchup Scoreboard */}
          {!teamA || !teamB ? (
            <div className="text-center py-12">
              <p className="text-white/40 text-sm tracking-wider uppercase">TBD vs TBD</p>
              <p className="text-white/30 text-xs mt-2">Waiting on earlier rounds</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 relative z-10">
              
              {/* Team A */}
              <div className="flex flex-col items-center gap-6 w-48">
                <div className="relative group">
                  <div className={`absolute inset-[-4px] rounded-full blur-md transition-opacity duration-500 opacity-0 ${series?.winner_id === teamA.id ? 'bg-flag-gold/50 opacity-100' : 'group-hover:opacity-30 bg-white'}`} />
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-navy-950 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-xl">
                    {teamA.logo_url ? (
                      <Image src={teamA.logo_url} alt={teamA.name} fill className="object-contain p-4 drop-shadow-2xl" />
                    ) : (
                      <span className="text-4xl opacity-20">🛡️</span>
                    )}
                  </div>
                </div>
                <h2 className="text-xl md:text-2xl text-white font-display text-center leading-tight">{teamA.name}</h2>
              </div>

              {/* Score Center */}
              {series ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-6 md:gap-8">
                    <span className={`text-6xl md:text-8xl font-display ${scoreA! > scoreB! ? 'text-flag-gold drop-shadow-[0_0_15px_rgba(212,160,23,0.5)]' : 'text-white/80'}`}>
                      {scoreA}
                    </span>
                    <span className="text-white/20 text-4xl font-light">—</span>
                    <span className={`text-6xl md:text-8xl font-display ${scoreB! > scoreA! ? 'text-flag-gold drop-shadow-[0_0_15px_rgba(212,160,23,0.5)]' : 'text-white/80'}`}>
                      {scoreB}
                    </span>
                  </div>
                  {series.status === 'COMPLETED' && (
                    <div className="mt-6 bg-flag-gold/10 border border-flag-gold/30 px-6 py-2 rounded-full">
                      <p className="text-xs text-flag-gold uppercase font-mono tracking-widest font-bold">
                        Winner: {series.winner_id === teamA.id ? teamA.name : teamB.name}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24">
                  <p className="text-white/30 text-lg font-mono uppercase tracking-[0.3em]">VS</p>
                </div>
              )}

              {/* Team B */}
              <div className="flex flex-col items-center gap-6 w-48">
                <div className="relative group">
                  <div className={`absolute inset-[-4px] rounded-full blur-md transition-opacity duration-500 opacity-0 ${series?.winner_id === teamB.id ? 'bg-flag-gold/50 opacity-100' : 'group-hover:opacity-30 bg-white'}`} />
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-navy-950 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-xl">
                    {teamB.logo_url ? (
                      <Image src={teamB.logo_url} alt={teamB.name} fill className="object-contain p-4 drop-shadow-2xl" />
                    ) : (
                      <span className="text-4xl opacity-20">🛡️</span>
                    )}
                  </div>
                </div>
                <h2 className="text-xl md:text-2xl text-white font-display text-center leading-tight">{teamB.name}</h2>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Games List */}
      {teamA && teamB && series && (
        <div className="mt-12">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl text-white/90 font-display tracking-widest">SERIES GAMES</h2>
            <div className="h-[1px] flex-grow bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          
          {(schedules ?? []).length === 0 ? (
            <div className="card p-12 text-center border-dashed border-white/10 bg-white/[0.01]">
              <p className="text-white/40 text-sm font-mono tracking-widest uppercase">No games scheduled yet</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {(schedules ?? []).map((s, i) => {
                const game = Array.isArray(s.games) ? s.games[0] : s.games;
                const isCompleted = game && (game.status === 'VERIFIED' || game.status === 'COMPLETED');
                const label = s.round_label || `GAME ${i + 1}`;
                
                // Map home/away scores to team A/B based on IDs
                let teamAScore = 0;
                let teamBScore = 0;
                if (game) {
                   if (s.home_team_id === teamA.id) {
                     teamAScore = game.home_score;
                     teamBScore = game.away_score;
                   } else {
                     teamAScore = game.away_score;
                     teamBScore = game.home_score;
                   }
                }
                
                const inner = (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6">
                    {/* Left: Meta */}
                    <div className="flex items-center gap-4 min-w-[200px]">
                      <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-flag-gold' : 'bg-white/20'}`} />
                      <div>
                        <p className={`text-sm font-bold tracking-widest uppercase transition-colors ${isCompleted ? 'text-flag-gold' : 'text-white/50'}`}>
                          {label}
                        </p>
                        <p className="text-xs font-mono text-white/40 uppercase mt-1">
                          {s.scheduled_date ? new Date(s.scheduled_date).toLocaleDateString() : 'TBA'}
                        </p>
                      </div>
                    </div>

                    {/* Center: Scores (if completed) */}
                    <div className="flex-grow flex justify-center">
                      {isCompleted ? (
                        <div className="flex items-center gap-6 md:gap-12 w-full max-w-md bg-navy-950/50 rounded-lg px-6 py-3 border border-white/5">
                          <div className={`flex-1 text-right truncate ${teamAScore > teamBScore ? 'text-white' : 'text-white/50'}`}>
                            <span className="text-sm font-display tracking-wider hidden md:inline">{teamA.name}</span>
                            <span className="text-xs font-mono md:hidden uppercase">{teamA.name.substring(0,3)}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0 font-mono text-xl">
                            <span className={teamAScore > teamBScore ? 'text-flag-gold font-bold' : 'text-white/50'}>{teamAScore}</span>
                            <span className="text-white/20 text-sm">-</span>
                            <span className={teamBScore > teamAScore ? 'text-flag-gold font-bold' : 'text-white/50'}>{teamBScore}</span>
                          </div>

                          <div className={`flex-1 text-left truncate ${teamBScore > teamAScore ? 'text-white' : 'text-white/50'}`}>
                            <span className="text-sm font-display tracking-wider hidden md:inline">{teamB.name}</span>
                            <span className="text-xs font-mono md:hidden uppercase">{teamB.name.substring(0,3)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-1 rounded-full border border-white/10 bg-white/5">
                          <p className="text-xs font-mono text-white/50 uppercase tracking-widest">{s.status.replace(/_/g, ' ')}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Right: Actions */}
                    <div className="min-w-[100px] text-right hidden md:block">
                      {isCompleted && (
                        <span className="text-xs font-mono text-white/30 group-hover:text-flag-gold transition-colors tracking-widest uppercase flex items-center justify-end gap-2">
                          View Stats <span className="text-lg">→</span>
                        </span>
                      )}
                    </div>
                  </div>
                );

                const className = `card overflow-hidden transition-all duration-300 border border-white/[0.05] bg-navy-800/50 backdrop-blur-sm ${
                  isCompleted ? 'hover:border-flag-gold/30 hover:bg-navy-800 hover:shadow-[0_0_30px_rgba(212,160,23,0.1)] hover:-translate-y-1 cursor-pointer group' : 'opacity-80'
                }`;

                return isCompleted ? (
                  <Link href={formatGameUrl(game.id, game.short_id, teamA.name, teamB.name)} key={s.id} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <div key={s.id} className={className}>
                    {inner}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from '@/components/HiddenLink';
import BackButton from '@/components/BackButton';
import { averageStats } from '@/lib/stats';
import type { PlayerGameStats } from '@/lib/types';
import RecentMatchesList from './RecentMatchesList';

export default async function TeamProfilePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const slug = params.slug.toLowerCase();

  // 1. Find all teams with this slug (same name across tournaments)
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name, logo_url, logo_path, tournament_id, tournament:tournaments(id, name, format, status, start_date, end_date, match_format)')
    .eq('slug', slug)
    .order('created_at', { ascending: false });

  if (!teams || teams.length === 0) notFound();

  const teamName = teams[0].name;
  const teamLogo = teams[0].logo_url || teams[0].logo_path;
  const shortName = teams[0].short_name;
  const teamIds = teams.map(t => t.id);

  // 2. Get seeds/standings for each tournament
  const { data: seeds } = await supabase
    .from('tournament_seeds')
    .select('team_id, tournament_id, seed, manual_wins, manual_losses, point_differential')
    .in('team_id', teamIds);

  // 3. Get championships
  const tournamentIds = teams.map(t => t.tournament_id).filter(Boolean) as string[];
  const { data: championships } = tournamentIds.length > 0
    ? await supabase
        .from('championships')
        .select('tournament_id, champion_team_id, runner_up_team_id, tournament:tournaments(name)')
        .in('tournament_id', tournamentIds)
    : { data: [] };

  // 4. Get roster players
  const { data: rosters } = await supabase
    .from('tournament_rosters')
    .select('team_id, tournament_id, player_id, player:players(id, gamertag, slug, position, photo_path)')
    .in('team_id', teamIds);

  // 5. Get recent games
  const { data: recentGames } = await supabase
    .from('games')
    .select('id, short_id, home_team_id, away_team_id, home_score, away_score, status, played_at, home:teams!games_home_team_id_fkey(id, name, slug), away:teams!games_away_team_id_fkey(id, name, slug), schedule:schedules(scheduled_date, scheduled_time, round_label, tournament_id, tournament:tournaments(name))')
    .or(teamIds.map(id => `home_team_id.eq.${id},away_team_id.eq.${id}`).join(','))
    .in('status', ['VERIFIED', 'COMPLETED'])
    .order('played_at', { ascending: false })
    .limit(50);

  // 6. Get player stats for this team (gets all stats, even for traded players)
  const { data: playerStats } = await supabase
    .from('player_game_stats')
    .select('player_id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, team_id, player:players(id, gamertag, slug, position, photo_path), game:games!player_game_stats_game_id_fkey(home_team_id, away_team_id, home_score, away_score, schedule:schedules(tournament_id))')
    .in('team_id', teamIds)
    .eq('is_verified', true);

  // Build tournament history
  const tournamentHistory = teams.map(team => {
    const t = Array.isArray(team.tournament) ? team.tournament[0] : team.tournament;
    const seed = (seeds ?? []).find(s => s.team_id === team.id);
    const champ = (championships ?? []).find((c: any) => c.tournament_id === team.tournament_id);

    let result = 'Participated';
    let resultColor = 'text-white/40';
    let resultIcon = '';
    if (champ && champ.champion_team_id === team.id) {
      result = 'Champion';
      resultColor = 'text-flag-gold';
      resultIcon = '🏆';
    } else if (champ && champ.runner_up_team_id === team.id) {
      result = 'Runner-Up';
      resultColor = 'text-silver-400';
      resultIcon = '🥈';
    }

    return {
      teamId: team.id,
      tournamentId: team.tournament_id,
      tournamentName: t?.name || 'Unknown',
      format: t?.format || '',
      status: t?.status || '',
      startDate: t?.start_date,
      seed: seed?.seed,
      wins: seed?.manual_wins ?? 0,
      losses: seed?.manual_losses ?? 0,
      pd: seed?.point_differential ?? 0,
      result,
      resultColor,
      resultIcon,
      isActive: t?.status === 'IN_PROGRESS' || t?.status === 'SEEDING',
    };
  });

  const activeTournaments = tournamentHistory.filter(t => t.isActive);
  const pastTournaments = tournamentHistory.filter(t => !t.isActive);
  const champCount = tournamentHistory.filter(t => t.result === 'Champion').length;

  // Build unique players map (from both current rosters and anyone who played a game for this team)
  const uniquePlayers = new Map<string, any>();
  
  // Add from current rosters
  for (const r of rosters ?? []) {
    const p = r.player as any;
    if (p && !uniquePlayers.has(p.id)) {
      uniquePlayers.set(p.id, { ...p });
    }
  }
  
  // Add from past stats (covers players who were traded away but played games)
  for (const s of playerStats ?? []) {
    const p = s.player as any;
    if (p && !uniquePlayers.has(p.id)) {
      uniquePlayers.set(p.id, { ...p, isPastPlayer: true });
    }
  }

  // Calculate stats for all unique players
  for (const [id, p] of uniquePlayers.entries()) {
    const pStats = (playerStats ?? []).filter((s: any) => s.player_id === p.id && !s.did_not_play);
    const avg = pStats.length > 0 ? averageStats(pStats as any, 0, pStats.length) : null;
    uniquePlayers.set(id, { ...p, stats: avg, gamesPlayed: pStats.length });
  }
  const rosterPlayers = Array.from(uniquePlayers.values()).sort((a, b) => (b.gamesPlayed || 0) - (a.gamesPlayed || 0));

  // Overall team W-L from recent games
  let totalWins = 0;
  let totalLosses = 0;
  for (const g of recentGames ?? []) {
    if (g.home_score == null || g.away_score == null) continue;
    const isHome = teamIds.includes(g.home_team_id);
    const myScore = isHome ? g.home_score : g.away_score;
    const oppScore = isHome ? g.away_score : g.home_score;
    if (myScore > oppScore) totalWins++;
    else totalLosses++;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <BackButton />

      {/* --- TEAM HEADER --- */}
      <div className="card p-6 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-navy via-flag-red to-flag-gold" />
        <div className="absolute inset-0 bg-grid-subtle opacity-20 pointer-events-none" />

        <div className="relative z-10">
          <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-4 font-bold">TEAM</p>

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
            {/* Team Logo */}
            <div className="w-24 h-24 md:w-36 md:h-36 border-2 border-white/[0.06] bg-navy-900 rounded-2xl shrink-0 relative overflow-hidden shadow-lg flex items-center justify-center">
              {teamLogo ? (
                <img src={teamLogo} alt={teamName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl md:text-5xl font-display text-white/20">{shortName || teamName.charAt(0)}</span>
              )}
            </div>

            {/* Team Name & Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-5xl text-white font-display tracking-widest title-glow">{teamName}</h1>
              {shortName && <p className="text-white/30 font-mono text-sm uppercase tracking-widest mt-1">{shortName}</p>}

              <div className="flex flex-wrap gap-6 mt-4">
                <div>
                  <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Record</p>
                  <p className="text-xl text-white font-display tracking-wider">
                    <span className="text-emerald-400">{totalWins}</span>
                    <span className="text-white/30 mx-1">-</span>
                    <span className="text-red-400">{totalLosses}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Tournaments</p>
                  <p className="text-xl text-white font-display tracking-wider">{tournamentHistory.length}</p>
                </div>
                {champCount > 0 && (
                  <div>
                    <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Championships</p>
                    <p className="text-xl text-flag-gold font-display tracking-wider">🏆 ×{champCount}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- ACTIVE TOURNAMENTS --- */}
      {activeTournaments.length > 0 && (
        <section className="card p-6 md:p-8">
          <h2 className="text-xl font-display text-flag-gold tracking-widest mb-4">CURRENT SEASON</h2>
          <div className="space-y-3">
            {activeTournaments.map(t => {
              const pct = t.wins + t.losses > 0 ? (t.wins / (t.wins + t.losses)).toFixed(3) : '.000';
              return (
                <Link key={t.teamId} href={`/tournaments/${t.tournamentId}`} className="block">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                    <div>
                      <p className="text-white font-medium">{t.tournamentName}</p>
                      <p className="text-xs font-mono text-white/40 uppercase mt-0.5">{t.format.replace(/_/g, ' ')} · {t.status}</p>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      {t.seed && (
                        <div>
                          <p className="text-[10px] text-white/30 font-mono uppercase">Seed</p>
                          <p className="text-lg text-white font-mono font-bold">#{t.seed}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-white/30 font-mono uppercase">Record</p>
                        <p className="text-lg font-mono">
                          <span className="text-emerald-400 font-bold">{t.wins}</span>
                          <span className="text-white/30">-</span>
                          <span className="text-red-400 font-bold">{t.losses}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 font-mono uppercase">PD</p>
                        <p className={`text-lg font-mono font-bold ${t.pd > 0 ? 'text-flag-gold' : t.pd < 0 ? 'text-red-400' : 'text-white/30'}`}>
                          {t.pd > 0 ? `+${t.pd}` : t.pd}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 font-mono uppercase">PCT</p>
                        <p className="text-lg text-white font-mono">{pct}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* --- ROSTER --- */}
      {rosterPlayers.length > 0 && (
        <section className="card p-6 md:p-8">
          <h2 className="text-xl font-display text-white tracking-widest mb-4">ROSTER</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-navy-800 border-b border-white/[0.06] text-white uppercase tracking-widest text-[10px]">
                  <th className="text-left px-5 py-4">Player</th>
                  <th className="px-3 py-3 text-center">POS</th>
                  <th className="px-3 py-3 text-right">GP</th>
                  <th className="px-3 py-3 text-right">PPG</th>
                  <th className="px-3 py-3 text-right">RPG</th>
                  <th className="px-3 py-3 text-right">APG</th>
                  <th className="px-3 py-3 text-right">FG%</th>
                  <th className="px-3 py-3 text-right">3P%</th>
                </tr>
              </thead>
              <tbody>
                {rosterPlayers.map(p => (
                  <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/${p.slug || p.gamertag.toLowerCase()}`} className="text-white hover:text-flag-gold transition-colors hover:underline font-medium">
                        {p.gamertag}
                      </Link>
                      {p.isPastPlayer && <span className="ml-2 text-[9px] text-white/30 font-mono uppercase bg-white/5 px-1.5 py-0.5 rounded">Traded</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-white/40 uppercase text-[10px]">{p.position || '—'}</td>
                    <td className="px-3 py-3 text-right text-white/30">{p.gamesPlayed}</td>
                    {p.stats ? (
                      <>
                        <td className="px-3 py-3 text-right text-white font-semibold">{p.stats.ppg}</td>
                        <td className="px-3 py-3 text-right text-white/50">{p.stats.rpg}</td>
                        <td className="px-3 py-3 text-right text-white/50">{p.stats.apg}</td>
                        <td className="px-3 py-3 text-right text-white/30">{p.stats.fgPct}%</td>
                        <td className="px-3 py-3 text-right text-white/40">{p.stats.tpPct}%</td>
                      </>
                    ) : (
                      <td colSpan={5} className="px-3 py-3 text-right text-white/20 italic">No stats</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* --- RECENT GAMES --- */}
      <RecentMatchesList games={recentGames ?? []} teamIds={teamIds} />

      {/* --- TOURNAMENT HISTORY --- */}
      {pastTournaments.length > 0 && (
        <section className="card p-6 md:p-8">
          <h2 className="text-xl font-display text-white tracking-widest mb-4">TOURNAMENT HISTORY</h2>
          <div className="space-y-2">
            {pastTournaments.map(t => (
              <Link key={t.teamId} href={`/tournaments/${t.tournamentId}`} className="block">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-center gap-3">
                    {t.resultIcon && <span className="text-xl">{t.resultIcon}</span>}
                    <div>
                      <p className="text-white font-medium">{t.tournamentName}</p>
                      <p className={`text-xs font-mono uppercase ${t.resultColor}`}>{t.result}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    {t.seed && <p className="text-sm text-white/40 font-mono">#{t.seed} Seed</p>}
                    <p className="text-sm font-mono">
                      <span className="text-emerald-400">{t.wins}</span>
                      <span className="text-white/30">-</span>
                      <span className="text-red-400">{t.losses}</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import { averageStats } from '@/lib/stats';
import type { PlayerGameStats } from '@/lib/types';

export const metadata = {
  title: 'Player Stats — 2K Veterans League',
  description: 'Player statistics for every tournament and overall in the 2K Veterans League Pro-Am league.',
};

function getTierBadge(tier: number | null) {
  if (!tier) return null;
  const colors: Record<number, string> = {
    1: 'bg-flag-red text-navy',
    2: 'bg-purple-600 text-navy',
    3: 'bg-flag-gold text-navy',
    4: 'bg-navy-200 text-white/90',
    5: 'bg-orange-600 text-navy',
    6: 'bg-navy-900 text-navy',
  };
  const color = colors[tier] || colors[6];
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-widest font-bold items-center justify-center shadow-sm ${color}`}>
      T{tier}
    </span>
  );
}

function TabHeader({ activeTab, activeTournamentId }: { activeTab: string; activeTournamentId: string }) {
  return (
    <div className="mb-6">
      <div className="section-header">
        <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">2K Veterans League Leaderboards</p>
        <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase title-glow">Player Stats</h1>
      </div>
      <div className="inline-flex flex-wrap gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06] mt-6">
        <Link
          href={`/playerstats?tab=tournaments${activeTournamentId ? `&t=${activeTournamentId}` : ''}`}
          className={`px-5 py-2.5 text-xs font-body font-medium uppercase tracking-[0.12em] rounded-lg transition-all duration-200 ${activeTab === 'tournaments' ? 'bg-flag-red text-white shadow-md' : 'text-white/50 hover:text-white hover:bg-navy-900/50'
            }`}
        >
          Tournaments
        </Link>
        <Link
          href={`/playerstats?tab=all`}
          className={`px-5 py-2.5 text-xs font-body font-medium uppercase tracking-[0.12em] rounded-lg transition-all duration-200 ${activeTab === 'all' ? 'bg-flag-red text-white shadow-md' : 'text-white/50 hover:text-white hover:bg-navy-900/50'
            }`}
        >
          Overall Stats
        </Link>
      </div>
    </div>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: { tab?: string; t?: string } }) {
  const supabase = createClient();
  const activeTab = searchParams.tab === 'all' ? 'all' : 'tournaments';

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, format')
    .order('created_at', { ascending: false });

  const activeTournamentId = searchParams.t || '';
  const activeTournament = tournaments?.find(t => t.id === activeTournamentId) ?? null;

  const { data: players } = await supabase
    .from('players')
    .select('id, gamertag, position, tier, slug');

  // ── ALL PLAYERS TAB ──────────────────────────────────────────────────────────
  if (activeTab === 'all') {
    const { data: allStats } = await supabase
      .from('player_game_stats')
      .select('player_id, team_id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, game:games!player_game_stats_game_id_fkey(home_team_id, away_team_id, home_score, away_score)')
      .eq('is_verified', true)
      .eq('did_not_play', false);

    const { data: allTeams } = await supabase.from('teams').select('id, name');

    const statsByPlayer = new Map<string, { rows: PlayerGameStats[]; wins: number; gamesPlayed: number; teamId?: string }>();
    for (const row of (allStats ?? []) as any[]) {
      if (!statsByPlayer.has(row.player_id)) {
        statsByPlayer.set(row.player_id, { rows: [], wins: 0, gamesPlayed: 0, teamId: row.team_id });
      }
      const entry = statsByPlayer.get(row.player_id)!;
      entry.rows.push(row as PlayerGameStats);
      entry.gamesPlayed++;
      const game = row.game;
      if (game && row.team_id) {
        const isHome = game.home_team_id === row.team_id;
        const myScore = isHome ? game.home_score : game.away_score;
        const oppScore = isHome ? game.away_score : game.home_score;
        if (myScore != null && oppScore != null && myScore > oppScore) entry.wins++;
      }
    }

    const rows = (players ?? [])
      .map(player => {
        const entry = statsByPlayer.get(player.id);
        if (!entry || entry.rows.length === 0) return null;
        const avg = averageStats(entry.rows, entry.wins, entry.gamesPlayed);
        const teamName = allTeams?.find(t => t.id === entry.teamId)?.name ?? '—';
        return { player, avg, teamName };
      })
      .filter(Boolean)
      .sort((a, b) => b!.avg.ppg - a!.avg.ppg) as { player: any; avg: any; teamName: string }[];

    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <TabHeader activeTab="all" activeTournamentId={activeTournamentId} />
        <section>
          <div className="relative card overflow-hidden">
            <div className="accent-stripe" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono stat-mono">
                <thead>
                  <tr className="bg-navy text-[9px] text-navy/80 uppercase tracking-widest">
                    <th className="text-left px-6 py-4 w-10 font-medium">#</th>
                    <th className="text-left px-4 py-4 font-medium">Player</th>
                    <th className="text-left px-4 py-4 font-medium">Team</th>
                    <th className="px-4 py-4 text-right font-medium">GP</th>
                    <th className="px-4 py-4 text-right font-medium">PPG</th>
                    <th className="px-4 py-4 text-right font-medium">RPG</th>
                    <th className="px-4 py-4 text-right font-medium">APG</th>
                    <th className="px-4 py-4 text-right font-medium">SPG</th>
                    <th className="px-4 py-4 text-right font-medium">BPG</th>
                    <th className="px-4 py-4 text-right font-medium">FG%</th>
                    <th className="px-4 py-4 text-right font-medium">3P%</th>
                    <th className="px-4 py-4 text-right font-medium">FT%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100/20">
                  {rows.length === 0 && (
                    <tr><td colSpan={12} className="px-6 py-10 text-white/40 text-center uppercase tracking-widest text-[10px]">No verified stats yet.</td></tr>
                  )}
                  {rows.map(({ player, avg, teamName }, idx) => (
                    <tr key={player.id} className="group/row transition-all hover:bg-white/[0.03]">
                      <td className="px-6 py-3.5 text-flag-gold text-[10px] font-bold">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Link href={`/${player.slug || player.gamertag.toLowerCase()}`} className="text-white/90 font-body group-hover/row:text-white transition-colors font-medium">
                            {player.gamertag}
                          </Link>
                          {getTierBadge(player.tier)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-white/40 font-mono text-[9px] uppercase tracking-widest group-hover/row:text-white/70 transition-colors">{teamName}</td>
                      <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.gamesPlayed}</td>
                      <td className="px-4 py-3.5 text-right text-white font-bold text-sm">{avg.ppg}</td>
                      <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.rpg}</td>
                      <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.apg}</td>
                      <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.spg}</td>
                      <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.bpg}</td>
                      <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.fgPct}%</td>
                      <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.tpPct}%</td>
                      <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.ftPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── TOURNAMENTS TAB ──────────────────────────────────────────────────────────
  // No tournament selected — show tournament picker
  if (!activeTournamentId) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <TabHeader activeTab="tournaments" activeTournamentId="" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {(tournaments ?? []).length === 0 && <p className="text-white/40 font-mono text-sm uppercase">No tournaments yet.</p>}
          {(tournaments ?? []).map(t => (
            <Link key={t.id} href={`/playerstats?tab=tournaments&t=${t.id}`}
              className="block card-hover p-6 group">
              <div className="flex justify-between items-start mb-4">
                <p className="text-lg font-display text-white tracking-[0.1em] uppercase group-hover:text-flag-red transition-colors truncate">{t.name}</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{t.format.replace(/_/g, ' ')}</p>
                <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg uppercase tracking-widest border ${t.status === 'IN_PROGRESS' ? 'bg-flag-gold/10 text-flag-gold border-flag-gold/20' :
                  t.status === 'COMPLETED' ? 'bg-white/[0.06] text-white/40 border-white/[0.06]' :
                    'bg-white/[0.06] text-white/40 border-white/[0.06]'
                  }`}>{t.status.replace(/_/g, ' ')}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Tournament selected — show its stats
  const { data: rosters } = await supabase
    .from('tournament_rosters')
    .select('team_id, player_id, team:teams(id, name)')
    .eq('tournament_id', activeTournamentId);

  const { data: tourneyStatsRaw } = await supabase
    .from('player_game_stats')
    .select('player_id, team_id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, game:games!player_game_stats_game_id_fkey(home_team_id, away_team_id, home_score, away_score, schedule:schedules(tournament_id))')
    .eq('is_verified', true)
    .eq('did_not_play', false);

  const filteredStats = (tourneyStatsRaw ?? []).filter((s: any) => s.game?.schedule?.tournament_id === activeTournamentId);

  const statsByPlayer = new Map<string, { rows: PlayerGameStats[]; wins: number; gamesPlayed: number }>();
  for (const row of filteredStats as any[]) {
    if (!statsByPlayer.has(row.player_id)) {
      statsByPlayer.set(row.player_id, { rows: [], wins: 0, gamesPlayed: 0 });
    }
    const entry = statsByPlayer.get(row.player_id)!;
    entry.rows.push(row as PlayerGameStats);
    entry.gamesPlayed++;
    const game = row.game;
    if (game && row.team_id) {
      const isHome = game.home_team_id === row.team_id;
      const myScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      if (myScore != null && oppScore != null && myScore > oppScore) entry.wins++;
    }
  }

  // Build team → players map
  const teamMap = new Map<string, { teamName: string; players: { player: any; avg: any }[] }>();
  for (const roster of (rosters ?? []) as any[]) {
    const teamName = roster.team?.name ?? 'Unknown';
    const teamId = roster.team_id;
    if (!teamMap.has(teamId)) teamMap.set(teamId, { teamName, players: [] });
    const player = (players ?? []).find(p => p.id === roster.player_id);
    if (!player) continue;
    const entry = statsByPlayer.get(player.id);
    const avg = entry && entry.rows.length > 0 ? averageStats(entry.rows, entry.wins, entry.gamesPlayed) : null;
    teamMap.get(teamId)!.players.push({ player, avg });
  }
  for (const team of teamMap.values()) {
    team.players.sort((a, b) => (b.avg?.ppg ?? -1) - (a.avg?.ppg ?? -1));
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <TabHeader activeTab="tournaments" activeTournamentId={activeTournamentId} />

      {/* Tournament pills */}
      <div className="flex flex-wrap gap-2">
        {(tournaments ?? []).map(t => (
          <Link key={t.id} href={`/playerstats?tab=tournaments&t=${t.id}`}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase border transition-all ${t.id === activeTournamentId
              ? 'border-flag-gold text-flag-gold bg-flag-gold/10 font-bold'
              : 'border-white/[0.06] text-white/50 hover:text-white hover:border-navy'
              }`}>{t.name}</Link>
        ))}
      </div>

      {activeTournament && (
        <div className="flex items-center gap-3">
          <h2 className="text-2xl text-white font-display tracking-[0.1em]">{activeTournament.name}</h2>
          <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg uppercase tracking-widest border ${activeTournament.status === 'IN_PROGRESS' ? 'bg-flag-gold/10 text-flag-gold border-flag-gold/20' :
            activeTournament.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-200' :
              'bg-white/[0.06] text-white/40 border-white/[0.06]'
            }`}>{activeTournament.status.replace(/_/g, ' ')}</span>
        </div>
      )}

      {teamMap.size === 0 && (
        <div className="card p-8 text-center">
          <p className="text-white/40 font-mono uppercase tracking-widest text-sm">No player stats yet for this tournament.</p>
        </div>
      )}

      <div className="space-y-10">
        {[...teamMap.entries()].map(([teamId, { teamName, players: teamPlayers }]) => (
          <section key={teamId}>
            <h3 className="text-lg text-flag-gold font-display tracking-[0.12em] mb-3 font-bold">{teamName}</h3>
            <div className="relative card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono stat-mono">
                  <thead>
                    <tr className="bg-navy text-[9px] text-navy/80 uppercase tracking-widest">
                      <th className="text-left px-6 py-4 font-medium">Player</th>
                      <th className="px-4 py-4 text-right font-medium">GP</th>
                      <th className="px-4 py-4 text-right font-medium">PPG</th>
                      <th className="px-4 py-4 text-right font-medium">RPG</th>
                      <th className="px-4 py-4 text-right font-medium">APG</th>
                      <th className="px-4 py-4 text-right font-medium">SPG</th>
                      <th className="px-4 py-4 text-right font-medium">BPG</th>
                      <th className="px-4 py-4 text-right font-medium">FG%</th>
                      <th className="px-4 py-4 text-right font-medium">3P%</th>
                      <th className="px-4 py-4 text-right font-medium">FT%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100/20">
                    {teamPlayers.length === 0 && (
                      <tr><td colSpan={10} className="px-6 py-10 text-white/40 text-center uppercase tracking-widest text-[10px]">No stats yet.</td></tr>
                    )}
                    {teamPlayers.map(({ player, avg }) => (
                      <tr key={player.id} className="group/row transition-all hover:bg-white/[0.03]">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {player.position && <span className="w-7 text-center text-[9px] bg-white/[0.06] text-white/50 border border-white/[0.06] rounded-md px-1 py-1 uppercase tracking-widest font-bold group-hover/row:border-white/20 transition-colors">{player.position.slice(0, 2)}</span>}
                            <Link href={`/${player.slug || player.gamertag.toLowerCase()}`} className="text-white/90 font-body group-hover/row:text-white transition-colors font-medium">
                              {player.gamertag}
                            </Link>
                            {getTierBadge(player.tier)}
                          </div>
                        </td>
                        {avg ? (
                          <>
                            <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.gamesPlayed}</td>
                            <td className="px-4 py-3.5 text-right text-white font-bold text-sm">{avg.ppg}</td>
                            <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.rpg}</td>
                            <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.apg}</td>
                            <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.spg}</td>
                            <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.bpg}</td>
                            <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.fgPct}%</td>
                            <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.tpPct}%</td>
                            <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.ftPct}%</td>
                          </>
                        ) : (
                          <td colSpan={9} className="px-4 py-3.5 text-right text-white/30 italic group-hover/row:text-white/40 transition-colors">No games played</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

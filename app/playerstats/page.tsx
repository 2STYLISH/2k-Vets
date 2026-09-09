import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import { averageStats } from '@/lib/stats';
import type { PlayerGameStats } from '@/lib/types';
import { slugify } from '@/lib/format';
import LeaderboardCard from '@/components/TournamentLeaders';
import PaginatedPlayerTable from '@/components/PaginatedPlayerTable';
import PlayerComparison from '@/components/PlayerComparison';

export const metadata = {
  title: 'Player Stats — 2K Veterans League',
  description: 'Player statistics for every tournament and overall in the 2K Veterans League Pro-Am league.',
};

function TabHeader({ activeTab, activeTournamentSlug }: { activeTab: string; activeTournamentSlug: string }) {
  return (
    <div className="mb-6">
      <div className="section-header">
        <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">2K Veterans League Leaderboards</p>
        <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase">Player Stats</h1>
      </div>
      <div className="inline-flex flex-wrap gap-1 bg-[#111827] rounded-xl p-1.5 border border-white/10 mt-6">
        <Link
          href={`/playerstats?tab=tournaments${activeTournamentSlug ? `&t=${activeTournamentSlug}` : ''}`}
          className={`px-5 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all duration-200 ${activeTab === 'tournaments' ? 'bg-flag-red text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
        >
          Tournaments
        </Link>
        <Link
          href={`/playerstats?tab=all`}
          className={`px-5 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all duration-200 ${activeTab === 'all' ? 'bg-flag-red text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
        >
          Overall Stats
        </Link>
        <Link
          href={`/playerstats?tab=compare`}
          className={`px-5 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all duration-200 ${activeTab === 'compare' ? 'bg-flag-red text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
        >
          Player Comparison
        </Link>
      </div>
    </div>
  );
}

function LeaderboardGrid({ rows }: { rows: { player: any; avg: any; teamName: string }[] }) {
  if (rows.length === 0) return null;

  const getTop = (key: string) => [...rows].sort((a, b) => b.avg[key] - a.avg[key]).slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
      <LeaderboardCard title="Points Per Game" leaders={getTop('ppg')} dataKey="ppg" />
      <LeaderboardCard title="Assists Per Game" leaders={getTop('apg')} dataKey="apg" />
      <LeaderboardCard title="Rebounds Per Game" leaders={getTop('rpg')} dataKey="rpg" />
      <LeaderboardCard title="Steals Per Game" leaders={getTop('spg')} dataKey="spg" />
      <LeaderboardCard title="Blocks Per Game" leaders={getTop('bpg')} dataKey="bpg" />
      <LeaderboardCard title="3PT Field Goals Pct" leaders={getTop('tpPct')} dataKey="tpPct" />
      <LeaderboardCard title="Field Goals Pct" leaders={getTop('fgPct')} dataKey="fgPct" />
      <LeaderboardCard title="Points" leaders={getTop('totalPts')} dataKey="totalPts" />
      <LeaderboardCard title="Assists" leaders={getTop('totalAst')} dataKey="totalAst" />
      <LeaderboardCard title="Rebounds" leaders={getTop('totalReb')} dataKey="totalReb" />
      <LeaderboardCard title="Steals" leaders={getTop('totalStl')} dataKey="totalStl" />
      <LeaderboardCard title="Blocks" leaders={getTop('totalBlk')} dataKey="totalBlk" />
      <LeaderboardCard title="3PT Attempted Per Game" leaders={getTop('tpaPerGame')} dataKey="tpaPerGame" />
      <LeaderboardCard title="Free Throws Attempted" leaders={getTop('totalFta')} dataKey="totalFta" />
      <LeaderboardCard title="Free Throws Made" leaders={getTop('totalFtm')} dataKey="totalFtm" />
    </div>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: { tab?: string; t?: string } }) {
  const supabase = createClient();
  const activeTab = searchParams.tab === 'all' ? 'all' : searchParams.tab === 'compare' ? 'compare' : 'tournaments';

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, format')
    .order('created_at', { ascending: false });

  const activeParam = searchParams.t || '';
  const activeTournament = tournaments?.find(t => t.id === activeParam || slugify(t.name) === activeParam) ?? null;
  const activeTournamentId = activeTournament?.id ?? '';
  const activeTournamentSlug = activeTournament ? slugify(activeTournament.name) : '';

  const { data: players } = await supabase
    .from('players')
    .select('id, gamertag, position, slug, photo_path');

  // ── ALL PLAYERS & COMPARE TABS ───────────────────────────────────────────────
  if (activeTab === 'all' || activeTab === 'compare') {
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

    if (activeTab === 'compare') {
      return (
        <div className="max-w-5xl mx-auto space-y-8">
          <TabHeader activeTab="compare" activeTournamentSlug={activeTournamentSlug} />
          <PlayerComparison players={rows} />
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <TabHeader activeTab="all" activeTournamentSlug={activeTournamentSlug} />
        <LeaderboardGrid rows={rows} />
        <PaginatedPlayerTable rows={rows} showTeamSearch={false} />
      </div>
    );
  }

  // ── TOURNAMENTS TAB ──────────────────────────────────────────────────────────
  // No tournament selected — show tournament picker
  if (!activeTournamentId) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <TabHeader activeTab="tournaments" activeTournamentSlug="" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {(tournaments ?? []).length === 0 && <p className="text-white/40 font-mono text-sm uppercase">No tournaments yet.</p>}
          {(tournaments ?? []).map(t => (
            <Link key={t.id} href={`/playerstats?tab=tournaments&t=${slugify(t.name)}`}
              className="block surface-elevated rounded-xl p-6 group hover:border-flag-red hover:-translate-y-1 transition-all border border-white/10">
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

  const tourneyRows: { player: any; avg: any; teamName: string }[] = [];
  for (const team of teamMap.values()) {
    for (const { player, avg } of team.players) {
      if (avg) tourneyRows.push({ player, avg, teamName: team.teamName });
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <TabHeader activeTab="tournaments" activeTournamentSlug={activeTournamentSlug} />

      {/* Tournament Selection Pills */}
      <div className="mt-6 mb-4">
        {(tournaments ?? []).length > 0 && (
          <div className="inline-flex flex-wrap gap-1 bg-[#1f2937] rounded-xl p-1 border border-white/10">
            {(tournaments ?? []).map((t) => {
              const slug = slugify(t.name);
              const isActive = activeTournamentSlug === slug;
              return (
                <a
                  key={t.id}
                  href={`/playerstats?tab=tournaments&t=${slug}`}
                  className={`px-5 py-2.5 rounded-lg text-[10px] font-mono font-medium uppercase tracking-widest transition-all duration-200 ${
                    isActive
                      ? 'bg-flag-red text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t.name}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {activeTournament && (
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl text-white font-display tracking-[0.1em]">{activeTournament.name}</h2>
          <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg uppercase tracking-widest border ${activeTournament.status === 'IN_PROGRESS' ? 'bg-flag-gold/10 text-flag-gold border-flag-gold/20' :
            activeTournament.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-200' :
              'bg-white/[0.06] text-white/40 border-white/[0.06]'
            }`}>{activeTournament.status.replace(/_/g, ' ')}</span>
        </div>
      )}

      {tourneyRows.length > 0 && <LeaderboardGrid rows={tourneyRows} />}

      {teamMap.size === 0 && (
        <div className="surface-elevated rounded-xl p-8 text-center border border-white/10">
          <p className="text-white/40 font-mono uppercase tracking-widest text-sm font-bold">No player stats yet for this tournament.</p>
        </div>
      )}

      <PaginatedPlayerTable rows={tourneyRows} showTeamSearch={true} />
    </div>
  );
}

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import RecentMatchesListPlayer from './RecentMatchesListPlayer';
import { averageStats } from '@/lib/stats';
import { formatDate, formatGameUrl } from '@/lib/format';
import type { PlayerGameStats } from '@/lib/types';

const AWARD_LABELS: Record<string, { label: string; icon: string }> = {
  MYTHICAL_TEAM: { label: 'Mythical Team', icon: '🏆' },
  FINALS_MVP: { label: 'Finals MVP', icon: '🏆' },
  OVERALL_MVP: { label: 'Overall MVP', icon: '🏆' },
  OVERALL_DPOY: { label: 'Overall DPOY', icon: '🏆' },
};

function pct(made: number, attempted: number) {
  if (attempted === 0) return 0;
  return ((made / attempted) * 100).toFixed(1);
}

export default async function PlayerPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: player } = await supabase
    .from('players')
    .select('id, gamertag, position, bio, created_at, photo_path, team_id')
    .eq('slug', params.slug.toLowerCase())
    .maybeSingle();

  if (!player) notFound();

  // 1. Current Teams / Roster Status
  const { data: currentRosters } = await supabase
    .from('tournament_rosters')
    .select('team_id, tournament_id, team:teams(name, logo_url), tournament:tournaments(name, status, start_date)')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false });

  const activeLeagues = (currentRosters ?? []).map(r => {
    const t = Array.isArray(r.tournament) ? r.tournament[0] : r.tournament;
    const team = Array.isArray(r.team) ? r.team[0] : r.team;
    return {
      tournament: t,
      teamName: team?.name ?? 'Unknown',
      teamLogo: team?.logo_url ?? null,
    };
  }).filter(x => x.tournament?.status === 'SEEDING' || x.tournament?.status === 'IN_PROGRESS');

  const pastLeagues = (currentRosters ?? []).map(r => {
    const t = Array.isArray(r.tournament) ? r.tournament[0] : r.tournament;
    const team = Array.isArray(r.team) ? r.team[0] : r.team;
    return {
      tournament: t,
      teamName: team?.name ?? 'Unknown',
      teamLogo: team?.logo_url ?? null,
    };
  }).filter(x => x.tournament?.status === 'COMPLETED');

  // 2. All verified stats for this player
  const { data: statsRaw } = await supabase
    .from('player_game_stats')
    .select(
      'id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, team_id, position, game:games!player_game_stats_game_id_fkey(id, short_id, home_team_id, away_team_id, home_score, away_score, played_at, home:teams!games_home_team_id_fkey(name, logo_url), away:teams!games_away_team_id_fkey(name, logo_url), schedule:schedules(scheduled_date, scheduled_time, tournament_id, tournament:tournaments(id, name)))'
    )
    .eq('player_id', player.id)
    .eq('is_verified', true);

  const stats = (statsRaw ?? [])
    .filter(r => !r.did_not_play)
    .sort((a: any, b: any) => {
      const gameA = Array.isArray(a.game) ? a.game[0] : a.game;
      const gameB = Array.isArray(b.game) ? b.game[0] : b.game;
      const schedA = Array.isArray(gameA?.schedule) ? gameA.schedule[0] : gameA?.schedule;
      const schedB = Array.isArray(gameB?.schedule) ? gameB.schedule[0] : gameB?.schedule;

      const dateA = schedA?.scheduled_date || '1970-01-01';
      const timeA = schedA?.scheduled_time || '00:00:00';
      const dateB = schedB?.scheduled_date || '1970-01-01';
      const timeB = schedB?.scheduled_time || '00:00:00';
      const dtA = new Date(`${dateA}T${timeA}`).getTime();
      const dtB = new Date(`${dateB}T${timeB}`).getTime();
      return dtB - dtA;
    }) as any[];

  let wins = 0;
  let losses = 0;
  let gamesPlayed = 0;
  let totalPts = 0;
  let totalReb = 0;
  let totalAst = 0;
  let totalStl = 0;
  let totalBlk = 0;
  let totalTov = 0;
  let totalFgm = 0;
  let totalFga = 0;
  let totalTpm = 0;
  let totalTpa = 0;
  let totalFtm = 0;
  let totalFta = 0;

  // Track career highs
  const highs = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, tpm: 0, ftm: 0 };
  const highGames = { pts: null as any, reb: null as any, ast: null as any, stl: null as any, blk: null as any, fgm: null as any, tpm: null as any, ftm: null as any };

  for (const row of stats) {
    gamesPlayed++;
    totalPts += row.pts || 0;
    totalReb += row.reb || 0;
    totalAst += row.ast || 0;
    totalStl += row.stl || 0;
    totalBlk += row.blk || 0;
    totalTov += row.turnovers || 0;
    totalFgm += row.fgm || 0;
    totalFga += row.fga || 0;
    totalTpm += row.tpm || 0;
    totalTpa += row.tpa || 0;
    totalFtm += row.ftm || 0;
    totalFta += row.fta || 0;

    const game = Array.isArray(row.game) ? row.game[0] : row.game;
    if (game && row.team_id) {
      const isHome = game.home_team_id === row.team_id;
      const myScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      if (myScore != null && oppScore != null) {
        if (myScore > oppScore) wins++;
        else losses++;
      }
    }

    if (row.pts > highs.pts) { highs.pts = row.pts; highGames.pts = row; }
    if (row.reb > highs.reb) { highs.reb = row.reb; highGames.reb = row; }
    if (row.ast > highs.ast) { highs.ast = row.ast; highGames.ast = row; }
    if (row.stl > highs.stl) { highs.stl = row.stl; highGames.stl = row; }
    if (row.blk > highs.blk) { highs.blk = row.blk; highGames.blk = row; }
    if (row.fgm > highs.fgm) { highs.fgm = row.fgm; highGames.fgm = row; }
    if (row.tpm > highs.tpm) { highs.tpm = row.tpm; highGames.tpm = row; }
    if (row.ftm > highs.ftm) { highs.ftm = row.ftm; highGames.ftm = row; }
  }

  const overallAvg = gamesPlayed > 0 ? averageStats(stats, wins, gamesPlayed) : null;
  const winPct = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : 0;

  const ppg = overallAvg?.ppg || 0;
  const rpg = overallAvg?.rpg || 0;
  const apg = overallAvg?.apg || 0;
  const spg = overallAvg?.spg || 0;
  const bpg = overallAvg?.bpg || 0;
  const fgPct = overallAvg?.fgPct || 0;
  const tpPct = overallAvg?.tpPct || 0;
  const ftPct = overallAvg?.ftPct || 0;
  const topg = gamesPlayed > 0 ? (totalTov / gamesPlayed).toFixed(1) : 0;

  // Calculate Roles (Main/Secondary based on frequency)
  const posCounts: Record<string, number> = {};
  for (const row of stats) {
    if (row.position) {
      posCounts[row.position] = (posCounts[row.position] || 0) + 1;
    }
  }
  const sortedPositions = Object.entries(posCounts).sort((a, b) => b[1] - a[1]);
  const mainRole = sortedPositions[0]?.[0];
  const secRole = sortedPositions[1]?.[0];
  let roleDisplay = '';
  if (mainRole && secRole) roleDisplay = `${mainRole}/${secRole}`;
  else if (mainRole) roleDisplay = mainRole;

  // 3. Achievements
  const tournamentIds = currentRosters?.map(r => r.tournament_id) || [];
  let champWins: any[] = [];
  let runnerUps: any[] = [];

  if (tournamentIds.length > 0) {
    const { data: championships } = await supabase
      .from('championships')
      .select('tournament_id, champion_team_id, runner_up_team_id, tournament:tournaments(name, championship_award_name)')
      .in('tournament_id', tournamentIds);

    if (championships) {
      for (const champ of championships) {
        const playerRoster = currentRosters?.find(r => r.tournament_id === champ.tournament_id);
        if (playerRoster) {
          if (champ.champion_team_id === playerRoster.team_id) {
            champWins.push(champ);
          } else if (champ.runner_up_team_id === playerRoster.team_id) {
            runnerUps.push(champ);
          }
        }
      }
    }
  }

  const { data: awards } = await supabase
    .from('awards')
    .select('award_type, custom_name, winner_player_ids, tournament_id, season_id, tournament:tournaments(name), season:seasons(name)')
    .or(`winner_player_id.eq.${player.id},winner_player_ids.cs.{${player.id}}`)
    .eq('status', 'PUBLISHED');

  // 4. Recent matches (Last 10)
  const recentGames = stats.slice(0, 10);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <BackButton />

      {/* --- MASTHEAD --- */}
      <div className="card p-6 md:p-10 relative overflow-hidden">
        {/* Accent stripe top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-navy via-flag-red to-flag-gold" />
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-grid-subtle opacity-20 pointer-events-none" />

        <div className="relative z-10">
          <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-4 font-bold">PLAYER</p>

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
            {/* Player Photo Box */}
            <div className="w-32 h-32 md:w-48 md:h-48 border-2 border-white/[0.06] bg-navy-900 rounded-2xl shrink-0 relative overflow-hidden shadow-lg">
              {player.photo_path ? (
                <img src={player.photo_path} alt={player.gamertag} className="w-full h-full object-cover" />
              ) : (
                <img src="/logo.png" alt={player.gamertag} className="w-full h-full object-cover opacity-60" />
              )}
            </div>

            {/* Gamertag & Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-end gap-4 mb-3">
                <h1 className="text-3xl sm:text-5xl md:text-7xl text-white font-display uppercase tracking-[0.1em] leading-none title-glow break-words">
                  {player.gamertag}
                </h1>
                {(roleDisplay || player.position) && (
                  <span className="mb-1 inline-block px-4 py-1.5 bg-white/[0.05] border border-white/[0.06] rounded-xl text-xl md:text-3xl font-display text-flag-gold uppercase tracking-widest">
                    {roleDisplay || player.position}
                  </span>
                )}
              </div>

            </div>
          </div>

          {/* Masthead Stats Ribbon */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            <div>
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">RECORD</p>
              <p className="text-xl sm:text-2xl font-mono text-flag-gold leading-none">{wins}-{losses}</p>
              <p className="text-[9px] font-mono text-white/30 uppercase mt-1">{winPct}% WIN</p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">GAMES</p>
              <p className="text-xl sm:text-2xl font-mono text-white leading-none">{gamesPlayed}</p>
              <p className="text-[9px] font-mono text-white/30 uppercase mt-1">TRACKED</p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">PPG</p>
              <p className="text-xl sm:text-2xl font-mono text-white leading-none">{ppg}</p>
              <p className="text-[9px] font-mono text-white/30 uppercase mt-1">CAREER</p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">APG</p>
              <p className="text-xl sm:text-2xl font-mono text-white leading-none">{apg}</p>
              <p className="text-[9px] font-mono text-white/30 uppercase mt-1">CAREER</p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">RPG</p>
              <p className="text-xl sm:text-2xl font-mono text-white leading-none">{rpg}</p>
              <p className="text-[9px] font-mono text-white/30 uppercase mt-1">CAREER</p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">3PM</p>
              <p className="text-xl sm:text-2xl font-mono text-flag-gold leading-none">{totalTpm}</p>
              <p className="text-[9px] font-mono text-white/30 uppercase mt-1">MADE</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (Stats & Highs) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Career Totals */}
          <div className="card p-6">
            <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.2em] mb-4 font-bold">CAREER STATS</p>
            <h2 className="text-2xl font-display text-white uppercase tracking-[0.1em] mb-6">FULL CAREER TOTALS</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-navy-100/30 border border-white/[0.06] rounded-xl overflow-hidden mb-6">
              <div className="bg-navy-900/70 p-4">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">GP</p>
                <p className="text-xl font-mono text-flag-gold">{gamesPlayed}</p>
                <p className="text-[9px] font-mono text-white/30 mt-1">{wins}-{losses}</p>
              </div>
              <div className="bg-navy-900/70 p-4">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">PPG</p>
                <p className="text-xl font-mono text-white">{ppg}</p>
                <p className="text-[9px] font-mono text-white/30 mt-1">POINTS</p>
              </div>
              <div className="bg-navy-900/70 p-4">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">RPG</p>
                <p className="text-xl font-mono text-white">{rpg}</p>
                <p className="text-[9px] font-mono text-white/30 mt-1">BOARDS</p>
              </div>
              <div className="bg-navy-900/70 p-4">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">APG</p>
                <p className="text-xl font-mono text-white">{apg}</p>
                <p className="text-[9px] font-mono text-white/30 mt-1">CREATION</p>
              </div>

              <div className="bg-navy-900/70 p-4">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">BPG</p>
                <p className="text-xl font-mono text-white">{bpg}</p>
                <p className="text-[9px] font-mono text-white/30 mt-1">BLOCKS</p>
              </div>
              <div className="bg-navy-900/70 p-4">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">TOV</p>
                <p className="text-xl font-mono text-white">{topg}</p>
                <p className="text-[9px] font-mono text-white/30 mt-1">PER GAME</p>
              </div>
              <div className="bg-navy-900/70 p-4">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">FG%</p>
                <p className="text-xl font-mono text-white">{fgPct}%</p>
                <p className="text-[9px] font-mono text-white/30 mt-1">{totalFgm}/{totalFga}</p>
              </div>
              <div className="bg-navy-900/70 p-4">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">3P%</p>
                <p className="text-xl font-mono text-white">{tpPct}%</p>
                <p className="text-[9px] font-mono text-white/30 mt-1">{totalTpm}/{totalTpa}</p>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 relative overflow-hidden">
              <p className="text-[9px] text-white/40 font-mono uppercase tracking-widest mb-4">BOX SCORE ROLLUP</p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                <div>
                  <p className="text-[9px] font-mono text-white/40 uppercase mb-1">PTS</p>
                  <p className="text-xl font-mono text-flag-gold">{totalPts}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-white/40 uppercase mb-1">REB</p>
                  <p className="text-xl font-mono text-flag-gold">{totalReb}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-white/40 uppercase mb-1">AST</p>
                  <p className="text-xl font-mono text-white">{totalAst}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-white/40 uppercase mb-1">STL</p>
                  <p className="text-xl font-mono text-white">{totalStl}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-white/40 uppercase mb-1">BLK</p>
                  <p className="text-xl font-mono text-white">{totalBlk}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-white/40 uppercase mb-1">TO</p>
                  <p className="text-xl font-mono text-white">{totalTov}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-white/40 uppercase mb-1">FOUL</p>
                  <p className="text-xl font-mono text-white">-</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] font-mono text-white/40 uppercase mb-1">FGM/FGA</p>
                  <p className="text-xl font-mono text-white">{totalFgm}/{totalFga}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-[9px] font-mono text-white/40 uppercase mb-1">3PM/3PA</p>
                  <p className="text-xl font-mono text-white">{totalTpm}/{totalTpa}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Peak Games */}
          <div className="card p-6">
            <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.2em] mb-4 font-bold">CAREER HIGHS</p>
            <h2 className="text-2xl font-display text-white uppercase tracking-[0.1em] mb-6">PEAK GAMES</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <HighCard label="HIGH PTS" val={highs.pts} row={highGames.pts} playerTeamId={player.team_id} />
              <HighCard label="HIGH REB" val={highs.reb} row={highGames.reb} playerTeamId={player.team_id} />
              <HighCard label="HIGH AST" val={highs.ast} row={highGames.ast} playerTeamId={player.team_id} />
              <HighCard label="HIGH STL" val={highs.stl} row={highGames.stl} playerTeamId={player.team_id} />
              <HighCard label="HIGH BLK" val={highs.blk} row={highGames.blk} playerTeamId={player.team_id} />
              <HighCard label="HIGH FGM" val={highs.fgm} row={highGames.fgm} playerTeamId={player.team_id} />
              <HighCard label="HIGH 3PM" val={highs.tpm} row={highGames.tpm} playerTeamId={player.team_id} />
              <HighCard label="HIGH FTM" val={highs.ftm} row={highGames.ftm} playerTeamId={player.team_id} />
            </div>
          </div>

          {/* Recent Games */}
          <RecentMatchesListPlayer games={recentGames} playerTeamId={player.team_id} />
        </div>

        {/* Right Column (Teams, Accolades) */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.2em] font-bold">ROSTER ACTIVITY</p>
              <span className="text-[10px] font-mono bg-white/[0.05] border border-white/[0.06] text-white/50 px-2 py-0.5 rounded-lg">{activeLeagues.length} ACTIVE</span>
            </div>
            <h2 className="text-2xl font-display text-white uppercase tracking-[0.1em] mb-6">CURRENT TEAMS</h2>

            <div className="space-y-3">
              {activeLeagues.length === 0 && (
                <div className="p-4 border border-white/[0.06] border-dashed bg-white/[0.03] rounded-xl text-center">
                  <p className="text-sm text-white/40 font-mono italic">No active rosters.</p>
                </div>
              )}
              {activeLeagues.map((x, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  {x.teamLogo ? (
                    <img src={x.teamLogo} className="w-10 h-10 object-cover rounded-lg bg-navy-900 border border-white/[0.06]" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center"><span className="text-[8px] font-mono text-white/40">TEAM</span></div>
                  )}
                  <div>
                    <p className="text-sm font-display text-white tracking-[0.1em] uppercase">{x.teamName}</p>
                    <p className="text-[9px] font-mono text-white/40 uppercase mt-0.5 max-w-[150px] truncate" title={x.tournament?.name}>MEMBER / {x.tournament?.name}</p>
                  </div>
                </div>
              ))}
            </div>

            {pastLeagues.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-display text-white/40 uppercase tracking-[0.1em] mb-4">PAST TEAMS</h2>
                <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                  {pastLeagues.map((x, idx) => (
                    <div key={'past' + idx} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                      {x.teamLogo ? (
                        <img src={x.teamLogo} className="w-10 h-10 object-cover rounded-lg bg-navy-900 border border-white/[0.06] grayscale" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center"><span className="text-[8px] font-mono text-white/30">TEAM</span></div>
                      )}
                      <div>
                        <p className="text-sm font-display text-white/70 tracking-[0.1em] uppercase">{x.teamName}</p>
                        <p className="text-[9px] font-mono text-white/30 uppercase mt-0.5 max-w-[150px] truncate" title={x.tournament?.name}>COMPLETED / {x.tournament?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Accolades & Milestones */}
          <div className="card p-6">
            <h2 className="text-2xl font-display text-white tracking-widest mb-4">TROPHY CASE</h2>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
              {champWins.length === 0 && runnerUps.length === 0 && (awards?.length ?? 0) === 0 ? (
                <p className="text-white/30 text-sm font-mono">No accolades yet.</p>
              ) : (
                <>
                  {champWins.map((cw, idx) => (
                    <div key={'cw' + idx} className="flex items-center gap-3 p-3 bg-flag-gold/10 border border-flag-gold/30 rounded-lg">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <p className="text-flag-gold font-bold font-mono uppercase text-sm tracking-widest">CHAMPION</p>
                        <p className="text-white/50 text-[10px] uppercase">{cw.tournament?.name} {cw.tournament?.championship_award_name || ''}</p>
                      </div>
                    </div>
                  ))}
                  
                  {runnerUps.map((ru, idx) => (
                    <div key={'ru' + idx} className="flex items-center gap-3 p-3 bg-silver-400/10 border border-silver-400/30 rounded-lg">
                      <span className="text-2xl opacity-70">🥈</span>
                      <div>
                        <p className="text-silver-300 font-bold font-mono uppercase text-sm tracking-widest">RUNNER UP</p>
                        <p className="text-white/50 text-[10px] uppercase">{ru.tournament?.name}</p>
                      </div>
                    </div>
                  ))}

                  {awards?.map((a, idx) => {
                    const isMythical = a.award_type === 'MYTHICAL_TEAM';
                    const label = isMythical ? (a.custom_name || 'Mythical Team') : (AWARD_LABELS[a.award_type]?.label || a.award_type.replace(/_/g, ' '));
                    const icon = AWARD_LABELS[a.award_type]?.icon || '🏅';
                    const tName = Array.isArray(a.tournament) ? (a.tournament[0] as any)?.name : (a.tournament as any)?.name;
                    return (
                      <div key={'aw' + idx} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-lg">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <p className="text-white font-bold font-mono uppercase text-sm tracking-widest">{label}</p>
                          <p className="text-white/50 text-[10px] uppercase">{tName}</p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function HighCard({ label, val, row, playerTeamId }: { label: string, val: number, row: any, playerTeamId: string | null }) {
  if (!row) return (
    <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl">
      <p className="text-[9px] font-mono text-white/40 uppercase mb-1">{label}</p>
      <p className="text-2xl font-mono text-white mb-2">-</p>
    </div>
  );

  const game = Array.isArray(row.game) ? row.game[0] : row.game;
  if (!game) return (
    <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl">
      <p className="text-[9px] font-mono text-white/40 uppercase mb-1">{label}</p>
      <p className="text-2xl font-mono text-white mb-2">{val}</p>
    </div>
  );

  const schedule = Array.isArray(game.schedule) ? game.schedule[0] : game.schedule;
  const tournament = Array.isArray(schedule?.tournament) ? schedule.tournament[0] : schedule?.tournament;
  const homeTeam = Array.isArray(game.home) ? game.home[0] : game.home;
  const awayTeam = Array.isArray(game.away) ? game.away[0] : game.away;

  const isHome = game.home_team_id === row.team_id;
  const myScore = isHome ? game.home_score : game.away_score;
  const oppScore = isHome ? game.away_score : game.home_score;
  const oppName = isHome ? awayTeam?.name : homeTeam?.name;

  return (
    <div className="bg-navy-900/60 border border-white/[0.06] p-4 rounded-xl group hover:border-white/15 hover:-translate-y-0.5 transition-all">
      <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-mono text-flag-gold mb-3">{val}</p>
      <p className="text-[10px] font-mono text-white uppercase truncate mb-1" title={oppName}>{oppName || 'TBD'} <span className="text-white/20">/</span> {myScore}-{oppScore}</p>
      <p className="text-[9px] font-mono text-white/40 uppercase truncate mb-3" title={tournament?.name}>
        {formatDate(schedule?.scheduled_date)} <span className="text-white/20">/</span> {tournament?.name}
      </p>
      <Link href={formatGameUrl(game.id, game.short_id, game.home_team?.name, game.away_team?.name)} className="inline-block bg-flag-red text-white hover:bg-navy-600 border border-flag-red px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-colors shadow-sm">
        VIEW MATCH
      </Link>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { generateLeaguePlayoffs, generateCrossGroupPlayoffs, togglePlayoffsVisibility } from '@/lib/actions/tournaments';
import { useNotification } from '@/components/providers/NotificationProvider';
import { parseError } from '@/lib/format';

type StandingRow = {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  pd: number;
  seed: number;
};

export default function LeaguePlayoffGenerator({
  tournamentId,
  teams,
  seeds,
  matchups,
  hasPlayoffs,
  playoffsVisible,
  currentPlayoffSize,
}: {
  tournamentId: string;
  teams: { id: string; name: string; group_name?: string | null }[];
  seeds: { team_id: string; seed: number; manual_wins?: number; manual_losses?: number; point_differential?: number }[];
  matchups: any[];
  hasPlayoffs: boolean;
  playoffsVisible: boolean;
  currentPlayoffSize?: 'TOP_10_PLAY_IN' | 'TOP_8' | 'TOP_6' | 'CROSS_GROUP_PLAYOFF';
}) {
  const { showConfirm, showToast } = useNotification();
  const [busy, setBusy] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [playoffSize, setPlayoffSize] = useState<'TOP_10_PLAY_IN' | 'TOP_8' | 'TOP_6' | 'CROSS_GROUP_PLAYOFF'>(currentPlayoffSize || 'TOP_8');
  const [crossGroupPlayIn, setCrossGroupPlayIn] = useState<0 | 2 | 4>(0);

  // Detect if groups exist
  const hasGroups = useMemo(() => teams.some(t => t.group_name), [teams]);

  // Compute standings from matchups (same logic as StandingsTable)
  const computeStandings = (filteredTeams: typeof teams) => filteredTeams.map(t => {
    const s = seeds.find(x => x.team_id === t.id);
    let wins = s?.manual_wins ?? 0;
    let losses = s?.manual_losses ?? 0;
    let pd = s?.point_differential ?? 0;

    if (s?.manual_wins == null && s?.manual_losses == null) {
      for (const m of matchups) {
        if (m.is_bye || m.status !== 'COMPLETED') continue;
        if (m.bracket_side !== 'ROUND_ROBIN') continue;

        if (m.team_a?.id === t.id) {
          if (m.winner_id === t.id) wins++;
          else losses++;
          if (m.schedule) {
            const scheds = Array.isArray(m.schedule) ? m.schedule : [m.schedule];
            for (const sched of scheds) {
              for (const g of sched.games || []) {
                if (g.home_score != null && g.away_score != null) {
                  if (sched.home_team_id === t.id) pd += (g.home_score - g.away_score);
                  else pd += (g.away_score - g.home_score);
                }
              }
            }
          }
        }
        if (m.team_b?.id === t.id) {
          if (m.winner_id === t.id) wins++;
          else losses++;
          if (m.schedule) {
            const scheds = Array.isArray(m.schedule) ? m.schedule : [m.schedule];
            for (const sched of scheds) {
              for (const g of sched.games || []) {
                if (g.home_score != null && g.away_score != null) {
                  if (sched.home_team_id === t.id) pd += (g.home_score - g.away_score);
                  else pd += (g.away_score - g.home_score);
                }
              }
            }
          }
        }
      }
    }

    return {
      teamId: t.id,
      teamName: t.name,
      groupName: t.group_name,
      wins,
      losses,
      pd,
      seed: s?.seed ?? 999,
    };
  });

  const sortStandings = (rows: ReturnType<typeof computeStandings>) => [...rows].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pd !== a.pd) return b.pd - a.pd;
    if (a.losses !== b.losses) return a.losses - b.losses;
    if (a.seed !== b.seed) return a.seed - b.seed;
    return a.teamId.localeCompare(b.teamId);
  });

  const standings = useMemo(() => sortStandings(computeStandings(teams)), [teams, seeds, matchups]);
  const totalTeams = standings.length;

  // Per-group standings for cross-group mode
  const groupATeams = useMemo(() => teams.filter(t => t.group_name === 'Group A'), [teams]);
  const groupBTeams = useMemo(() => teams.filter(t => t.group_name === 'Group B'), [teams]);
  const standingsA = useMemo(() => sortStandings(computeStandings(groupATeams)), [groupATeams, seeds, matchups]);
  const standingsB = useMemo(() => sortStandings(computeStandings(groupBTeams)), [groupBTeams, seeds, matchups]);

  const isCrossGroup = playoffSize === 'CROSS_GROUP_PLAYOFF';

  // ─── Playoff zone logic ───────────────────────────────────────────────────
  let hasPlayIn = false;
  let directSeeds = 0;
  let playInSeeds = 0;
  let descriptionText = '';

  if (playoffSize === 'TOP_10_PLAY_IN') {
    directSeeds = Math.min(6, totalTeams);
    playInSeeds = Math.min(4, Math.max(0, totalTeams - 6));
    descriptionText = `Play-In Format: Seeds 1-6 advance directly. Seeds 7-10 compete in a play-in for the final 2 spots.`;
  } else if (playoffSize === 'TOP_8') {
    directSeeds = Math.min(8, totalTeams);
    descriptionText = `Standard 8-Team Bracket format (1v8, 2v7, 3v6, 4v5).`;
  } else if (playoffSize === 'TOP_6') {
    directSeeds = Math.min(6, totalTeams);
    descriptionText = `Bye Round Bracket format. 1st & 2nd seed get byes. 3v6 and 4v5 play in round 1.`;
  } else if (playoffSize === 'CROSS_GROUP_PLAYOFF') {
    descriptionText = `Cross-Group Playoffs: Group A and B seeds cross over. A1 vs B8, B2 vs A7, A3 vs B6, B4 vs A5 (left side) · B1 vs A8, A2 vs B7, B3 vs A6, A4 vs B5 (right side). Winners meet in Grand Finals.`;
  }

  const getZoneColor = (rank: number) => {
    if (rank <= directSeeds) return 'border-l-emerald-500 bg-emerald-950/20';
    if (rank <= directSeeds + playInSeeds) return 'border-l-yellow-500 bg-yellow-950/20';
    return 'border-l-red-500 bg-red-950/20';
  };

  const getZoneLabel = (rank: number) => {
    if (rank <= directSeeds) return <span className="text-emerald-400 text-[9px] font-mono uppercase">Playoffs</span>;
    if (rank <= directSeeds + playInSeeds) return <span className="text-yellow-400 text-[9px] font-mono uppercase">Play-In</span>;
    return <span className="text-red-400 text-[9px] font-mono uppercase">Eliminated</span>;
  };

  const getCrossGroupZone = (rank: number, directPerGroup: number, totalPlayoffAndPlayInPerGroup: number) => {
    if (rank <= directPerGroup) return { color: 'border-l-emerald-500 bg-emerald-950/20', label: <span className="text-emerald-400 text-[9px] font-mono uppercase">Playoffs</span> };
    if (rank <= totalPlayoffAndPlayInPerGroup) return { color: 'border-l-yellow-500 bg-yellow-950/20', label: <span className="text-yellow-400 text-[9px] font-mono uppercase">Play-In</span> };
    return { color: 'border-l-red-500 bg-red-950/20', label: <span className="text-red-400 text-[9px] font-mono uppercase">Eliminated</span> };
  };

  const crossDirectPerGroup = crossGroupPlayIn === 0 ? 8 : 6;

  const handleGenerate = async () => {
    const confirmed = await showConfirm(
      'Generate Playoffs',
      `This will generate the playoff bracket from the current standings. ${hasPlayoffs ? 'Existing playoff matchups will be regenerated.' : ''} Continue?`
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      if (playoffSize === 'CROSS_GROUP_PLAYOFF') {
        await generateCrossGroupPlayoffs(tournamentId, { playInSeeds: crossGroupPlayIn });
      } else {
        await generateLeaguePlayoffs(tournamentId, { playoffSize });
      }
      showToast('Playoffs generated!', 'success');
    } catch (e: any) {
      showToast(parseError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleVisibility = async () => {
    const newVisible = !playoffsVisible;
    const confirmed = await showConfirm(
      newVisible ? 'Show Playoffs on Public Page' : 'Hide Playoffs from Public Page',
      newVisible
        ? 'The playoff bracket will become visible to everyone on the tournaments page. Continue?'
        : 'The playoff bracket will be hidden from the public tournaments page. Continue?'
    );
    if (!confirmed) return;

    setTogglingVisibility(true);
    try {
      await togglePlayoffsVisibility(tournamentId, newVisible);
      showToast(newVisible ? 'Playoffs are now public.' : 'Playoffs hidden from public page.', 'success');
    } catch (e: any) {
      showToast(parseError(e), 'error');
    } finally {
      setTogglingVisibility(false);
    }
  };

  // A playoff is considered started if any playoff matchup has completed or has scores
  const playoffStarted = matchups.some(m =>
    (m.bracket_side === 'WINNERS' || m.bracket_side === 'PLAY_IN' || m.bracket_side === 'LOSERS') &&
    (m.status === 'COMPLETED' || (m.schedule && Array.isArray(m.schedule) ? m.schedule.some((s: any) => s.games && s.games.some((g: any) => g.home_score != null || g.away_score != null)) : (m.schedule?.games && m.schedule.games.some((g: any) => g.home_score != null || g.away_score != null))))
  );

  return (
    <div className="card p-5 border-flag-gold/30 shadow-[0_0_15px_rgba(255,215,0,0.05)] mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-lg text-white uppercase tracking-widest font-display flex items-center gap-3">
            <span className="text-flag-gold">🏆</span> Playoff Picture
          </h2>
          <p className="text-sm text-white/70 mt-1">{descriptionText}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0 items-center">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest whitespace-nowrap">Format</span>
            <select
              value={playoffSize}
              onChange={(e) => setPlayoffSize(e.target.value as any)}
              className="bg-gray-900 border border-white/[0.15] text-white text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-flag-gold/50 cursor-pointer"
            >
              <option value="TOP_10_PLAY_IN" className="bg-gray-900 text-white">Play-In Bracket (Top 10)</option>
              <option value="TOP_8" className="bg-gray-900 text-white">Default Bracket (Top 8)</option>
              <option value="TOP_6" className="bg-gray-900 text-white">Bye Round Bracket (Top 6)</option>
              {hasGroups && (
                <option value="CROSS_GROUP_PLAYOFF" className="bg-gray-900 text-white">Cross-Group Playoffs</option>
              )}
            </select>
          </div>

          {/* Play-In seeds selector for cross-group mode */}
          {isCrossGroup && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest whitespace-nowrap">Play-In Seeds</span>
              <select
                value={crossGroupPlayIn}
                onChange={(e) => setCrossGroupPlayIn(Number(e.target.value) as 0 | 2 | 4)}
                className="bg-gray-900 border border-white/[0.15] text-white text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-flag-gold/50 cursor-pointer"
              >
                <option value={0} className="bg-gray-900 text-white">No Play-In (Top 8 direct)</option>
                <option value={2} className="bg-gray-900 text-white">Play-In Bottom 2 (7v8)</option>
                <option value={4} className="bg-gray-900 text-white">Play-In Top 10 (7-10 NBA Style)</option>
              </select>
            </div>
          )}

          {hasPlayoffs && (
            <button
              onClick={handleToggleVisibility}
              disabled={togglingVisibility}
              className={`py-2.5 px-5 text-xs font-mono uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap ${playoffsVisible
                  ? 'border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/60'
                  : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/60'
                }`}
            >
              {togglingVisibility
                ? '...'
                : playoffsVisible
                  ? '👁 Hide from Public'
                  : '👁 Show on Public Page'}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={busy || totalTeams < 4 || (hasPlayoffs && playoffStarted)}
            className={`py-2.5 px-6 whitespace-nowrap ${busy || totalTeams < 4 || (hasPlayoffs && playoffStarted) ? 'opacity-50 cursor-not-allowed bg-gray-700 text-white' : 'btn-primary'}`}
            title={hasPlayoffs && playoffStarted ? "Cannot regenerate because playoffs have already started" : ""}
          >
            {busy ? 'GENERATING...' : hasPlayoffs ? 'REGENERATE PLAYOFFS' : 'GENERATE PLAYOFFS'}
          </button>
        </div>
      </div>

      {/* Cross-Group standings preview — two tables side by side */}
      {isCrossGroup ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: 'Group A', rows: standingsA },
            { label: 'Group B', rows: standingsB },
          ].map(({ label, rows }) => (
            <div key={label} className="overflow-x-auto rounded-lg border border-white/10">
              <div className="bg-[#111827] px-4 py-2 border-b border-white/10 flex items-center justify-between">
                <span className="text-white font-display uppercase tracking-widest text-sm">{label}</span>
                <span className="text-[10px] font-mono text-white/40">{rows.length} teams</span>
              </div>
              <table className="w-full text-left text-sm text-white">
                <thead className="bg-arena-900 border-b border-arena-800 text-xs font-mono uppercase text-white">
                  <tr>
                    <th className="px-3 py-3 font-medium w-10">#</th>
                    <th className="px-3 py-3 font-medium">Team</th>
                    <th className="px-3 py-3 font-medium text-center">W</th>
                    <th className="px-3 py-3 font-medium text-center">L</th>
                    <th className="px-3 py-3 font-medium text-center">PD</th>
                    <th className="px-3 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-800">
                  {rows.map((row, i) => {
                    const rank = i + 1;
                    const zone = getCrossGroupZone(rank, crossDirectPerGroup, crossDirectPerGroup + crossGroupPlayIn);
                    return (
                      <tr key={row.teamId} className={`border-l-4 transition-colors hover:bg-white/[0.03] ${zone.color}`}>
                        <td className="px-3 py-3 text-white font-mono font-bold">{rank}</td>
                        <td className="px-3 py-3 text-white font-medium">{row.teamName}</td>
                        <td className="px-3 py-3 text-center text-emerald-400 font-mono font-bold">{row.wins}</td>
                        <td className="px-3 py-3 text-center text-red-400 font-mono font-bold">{row.losses}</td>
                        <td className={`px-3 py-3 text-center font-mono font-bold ${row.pd > 0 ? 'text-flag-gold' : row.pd < 0 ? 'text-red-400' : 'text-white/40'}`}>
                          {row.pd > 0 ? `+${row.pd}` : row.pd}
                        </td>
                        <td className="px-3 py-3 text-right">{zone.label}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-white/30 text-xs font-mono italic">No teams in this group</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        /* Default standings preview with zone coloring */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white">
            <thead className="bg-arena-900 border-b border-arena-800 text-xs font-mono uppercase text-white">
              <tr>
                <th className="px-4 py-3 font-medium w-12">#</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium text-center">W</th>
                <th className="px-4 py-3 font-medium text-center">L</th>
                <th className="px-4 py-3 font-medium text-center">PD</th>
                <th className="px-4 py-3 font-medium text-center">PCT</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena-800">
              {standings.map((row, i) => {
                const rank = i + 1;
                const pct = row.wins + row.losses > 0 ? (row.wins / (row.wins + row.losses)).toFixed(3) : '.000';
                return (
                  <tr
                    key={row.teamId}
                    className={`border-l-4 transition-colors hover:bg-white/[0.03] ${getZoneColor(rank)}`}
                  >
                    <td className="px-4 py-3 text-white font-mono font-bold">{rank}</td>
                    <td className="px-4 py-3 text-white font-medium">{row.teamName}</td>
                    <td className="px-4 py-3 text-center text-emerald-400 font-mono font-bold">{row.wins}</td>
                    <td className="px-4 py-3 text-center text-red-400 font-mono font-bold">{row.losses}</td>
                    <td className={`px-4 py-3 text-center font-mono font-bold ${row.pd > 0 ? 'text-flag-gold' : row.pd < 0 ? 'text-red-400' : 'text-white/40'}`}>
                      {row.pd > 0 ? `+${row.pd}` : row.pd}
                    </td>
                    <td className="px-4 py-3 text-center text-white font-mono">{pct}</td>
                    <td className="px-4 py-3 text-right">{getZoneLabel(rank)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-6 mt-4 text-[10px] font-mono uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
          <span className="text-emerald-400">Direct Playoff</span>
        </div>
        {(playInSeeds > 0 || (isCrossGroup && crossGroupPlayIn > 0)) && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-yellow-500/30 border border-yellow-500/50" />
            <span className="text-yellow-400">Play-In</span>
          </div>
        )}
        {(!isCrossGroup && totalTeams > directSeeds + playInSeeds) && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" />
            <span className="text-red-400">Eliminated</span>
          </div>
        )}
      </div>

      {/* Cross-group bracket preview */}
      {isCrossGroup && standingsA.length > 0 && standingsB.length > 0 && (
        <div className="mt-6 p-4 bg-white/[0.03] rounded-xl border border-white/10">
          
          {crossGroupPlayIn > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-3">Play-In Preview</p>
              <div className="grid md:grid-cols-2 gap-3 text-xs font-mono mb-4">
                <div className="space-y-1.5">
                  <p className="text-yellow-400 text-[10px] uppercase tracking-widest font-bold mb-2">Group A Play-In</p>
                  {crossGroupPlayIn === 4 ? (
                    <>
                      <div className="flex gap-2 items-center">
                        <span className="text-white/40 w-4">PA1</span>
                        <span className="text-blue-300">{standingsA[6]?.teamName ?? 'A 7th'}</span>
                        <span className="text-white/30 mx-1">vs</span>
                        <span className="text-blue-300">{standingsA[7]?.teamName ?? 'A 8th'}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-white/40 w-4">PA2</span>
                        <span className="text-blue-300">{standingsA[8]?.teamName ?? 'A 9th'}</span>
                        <span className="text-white/30 mx-1">vs</span>
                        <span className="text-blue-300">{standingsA[9]?.teamName ?? 'A 10th'}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-white/40 w-4">PA3</span>
                        <span className="text-white/60">Loser of PA1</span>
                        <span className="text-white/30 mx-1">vs</span>
                        <span className="text-white/60">Winner of PA2</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <span className="text-white/40 w-4">PA1</span>
                      <span className="text-blue-300">{standingsA[6]?.teamName ?? 'A 7th'}</span>
                      <span className="text-white/30 mx-1">vs</span>
                      <span className="text-blue-300">{standingsA[7]?.teamName ?? 'A 8th'}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-yellow-400 text-[10px] uppercase tracking-widest font-bold mb-2">Group B Play-In</p>
                  {crossGroupPlayIn === 4 ? (
                    <>
                      <div className="flex gap-2 items-center">
                        <span className="text-white/40 w-4">PB1</span>
                        <span className="text-red-300">{standingsB[6]?.teamName ?? 'B 7th'}</span>
                        <span className="text-white/30 mx-1">vs</span>
                        <span className="text-red-300">{standingsB[7]?.teamName ?? 'B 8th'}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-white/40 w-4">PB2</span>
                        <span className="text-red-300">{standingsB[8]?.teamName ?? 'B 9th'}</span>
                        <span className="text-white/30 mx-1">vs</span>
                        <span className="text-red-300">{standingsB[9]?.teamName ?? 'B 10th'}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-white/40 w-4">PB3</span>
                        <span className="text-white/60">Loser of PB1</span>
                        <span className="text-white/30 mx-1">vs</span>
                        <span className="text-white/60">Winner of PB2</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <span className="text-white/40 w-4">PB1</span>
                      <span className="text-red-300">{standingsB[6]?.teamName ?? 'B 7th'}</span>
                      <span className="text-white/30 mx-1">vs</span>
                      <span className="text-red-300">{standingsB[7]?.teamName ?? 'B 8th'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-3">1st Round Preview</p>
          <div className="grid md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="space-y-1.5">
              <p className="text-flag-gold text-[10px] uppercase tracking-widest font-bold mb-2">Left Side</p>
              <div className="flex gap-2 items-center">
                <span className="text-white/40 w-4">M1</span>
                <span className="text-blue-300">{standingsA[0]?.teamName ?? 'A 1st'}</span>
                <span className="text-white/30 mx-1">vs</span>
                <span className="text-red-300">{crossGroupPlayIn > 0 ? 'B 8th (Play-In)' : (standingsB[7]?.teamName ?? 'B 8th')}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-white/40 w-4">M2</span>
                <span className="text-red-300">{standingsB[3]?.teamName ?? 'B 4th'}</span>
                <span className="text-white/30 mx-1">vs</span>
                <span className="text-blue-300">{standingsA[4]?.teamName ?? 'A 5th'}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-white/40 w-4">M3</span>
                <span className="text-red-300">{standingsB[1]?.teamName ?? 'B 2nd'}</span>
                <span className="text-white/30 mx-1">vs</span>
                <span className="text-blue-300">{crossGroupPlayIn === 4 ? 'A 7th (Play-In)' : (standingsA[6]?.teamName ?? 'A 7th')}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-white/40 w-4">M4</span>
                <span className="text-blue-300">{standingsA[2]?.teamName ?? 'A 3rd'}</span>
                <span className="text-white/30 mx-1">vs</span>
                <span className="text-red-300">{standingsB[5]?.teamName ?? 'B 6th'}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-flag-gold text-[10px] uppercase tracking-widest font-bold mb-2">Right Side</p>
              <div className="flex gap-2 items-center">
                <span className="text-white/40 w-4">M5</span>
                <span className="text-red-300">{standingsB[0]?.teamName ?? 'B 1st'}</span>
                <span className="text-white/30 mx-1">vs</span>
                <span className="text-blue-300">{crossGroupPlayIn > 0 ? 'A 8th (Play-In)' : (standingsA[7]?.teamName ?? 'A 8th')}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-white/40 w-4">M6</span>
                <span className="text-blue-300">{standingsA[3]?.teamName ?? 'A 4th'}</span>
                <span className="text-white/30 mx-1">vs</span>
                <span className="text-red-300">{standingsB[4]?.teamName ?? 'B 5th'}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-white/40 w-4">M7</span>
                <span className="text-blue-300">{standingsA[1]?.teamName ?? 'A 2nd'}</span>
                <span className="text-white/30 mx-1">vs</span>
                <span className="text-red-300">{crossGroupPlayIn === 4 ? 'B 7th (Play-In)' : (standingsB[6]?.teamName ?? 'B 7th')}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-white/40 w-4">M8</span>
                <span className="text-red-300">{standingsB[2]?.teamName ?? 'B 3rd'}</span>
                <span className="text-white/30 mx-1">vs</span>
                <span className="text-blue-300">{standingsA[5]?.teamName ?? 'A 6th'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Group A</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Group B</span>
          </div>
        </div>
      )}

      {/* Visibility status badge */}
      {hasPlayoffs && (
        <div className={`mt-4 text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border ${playoffsVisible
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-white/[0.04] text-white/40 border-white/[0.08]'
          }`}>
          <span>{playoffsVisible ? '●' : '○'}</span>
          <span>{playoffsVisible ? 'Playoffs visible on public page' : 'Playoffs hidden from public page'}</span>
        </div>
      )}
    </div>
  );
}


'use client';

import { useState } from 'react';
import { generateLeaguePlayoffs } from '@/lib/actions/tournaments';
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
}: {
  tournamentId: string;
  teams: { id: string; name: string }[];
  seeds: { team_id: string; seed: number; manual_wins?: number; manual_losses?: number; point_differential?: number }[];
  matchups: any[];
  hasPlayoffs: boolean;
}) {
  const { showConfirm, showToast } = useNotification();
  const [busy, setBusy] = useState(false);

  // Compute standings from matchups (same logic as StandingsTable)
  const standings: StandingRow[] = teams.map(t => {
    const s = seeds.find(x => x.team_id === t.id);
    let wins = s?.manual_wins ?? 0;
    let losses = s?.manual_losses ?? 0;
    let pd = s?.point_differential ?? 0;

    // If no manual overrides, count from matchups
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
      wins,
      losses,
      pd,
      seed: s?.seed ?? 999,
    };
  });

  // Sort by wins desc → PD desc → losses asc
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pd !== a.pd) return b.pd - a.pd;
    return a.losses - b.losses;
  });

  const totalTeams = standings.length;

  // Determine playoff slots
  let directSeeds = 6;
  let playInSeeds = 4;
  if (totalTeams >= 10) {
    directSeeds = 6;
    playInSeeds = 4;
  } else if (totalTeams >= 8) {
    directSeeds = 4;
    playInSeeds = 4;
  } else if (totalTeams >= 6) {
    directSeeds = 2;
    playInSeeds = Math.min(4, totalTeams - 2);
  } else {
    directSeeds = totalTeams;
    playInSeeds = 0;
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

  const handleGenerate = async () => {
    const confirmed = await showConfirm(
      'Generate Playoffs',
      `This will generate the playoff bracket from the current standings. ${hasPlayoffs ? 'Existing playoff matchups will be regenerated.' : ''} Continue?`
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await generateLeaguePlayoffs(tournamentId);
      showToast('Playoffs generated!', 'success');
    } catch (e: any) {
      showToast(parseError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 border-flag-gold/30 shadow-[0_0_15px_rgba(255,215,0,0.05)] mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-lg text-white uppercase tracking-widest font-display flex items-center gap-3">
            <span className="text-flag-gold">🏆</span> Playoff Picture
          </h2>
          <p className="text-sm text-white/70 mt-1">
            {totalTeams >= 10
              ? 'Seeds 1–6 go directly to playoffs. Seeds 7–10 compete in the play-in. Seeds 11+ are eliminated.'
              : totalTeams >= 8
              ? 'Seeds 1–4 go directly to playoffs. Seeds 5–8 compete in the play-in.'
              : totalTeams >= 6
              ? `Seeds 1–${directSeeds} go directly to playoffs. Seeds ${directSeeds + 1}–${directSeeds + playInSeeds} compete in the play-in.`
              : 'All teams enter the playoff bracket directly.'}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={busy || totalTeams < 4}
          className="btn-primary py-2.5 px-6 whitespace-nowrap"
        >
          {busy ? 'GENERATING...' : hasPlayoffs ? 'REGENERATE PLAYOFFS' : 'GENERATE PLAYOFFS'}
        </button>
      </div>

      {/* Standings preview with zone coloring */}
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

      {/* Legend */}
      <div className="flex gap-6 mt-4 text-[10px] font-mono uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
          <span className="text-emerald-400">Direct Playoff</span>
        </div>
        {playInSeeds > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-yellow-500/30 border border-yellow-500/50" />
            <span className="text-yellow-400">Play-In</span>
          </div>
        )}
        {totalTeams > directSeeds + playInSeeds && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" />
            <span className="text-red-400">Eliminated</span>
          </div>
        )}
      </div>
    </div>
  );
}

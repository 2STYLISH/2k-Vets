'use client';

import { Matchup, Team } from './BracketTree';
import Link from 'next/link';

type StandingsRow = {
  team: NonNullable<Team>;
  played: number;
  wins: number;
  losses: number;
  winPct: string;
  pd: number;
};

export default function StandingsTable({ 
  matchups, 
  teams, 
  seeds 
}: { 
  matchups: Matchup[], 
  teams: Team[],
  seeds?: { team_id: string, manual_wins?: number, manual_losses?: number, point_differential?: number }[]
}) {
  const standings = new Map<string, StandingsRow>();

  // Initialize
  for (const t of teams) {
    if (!t) continue;
    
    // Check for manual overrides in seeds
    const s = seeds?.find(x => x.team_id === t.id);
    const manualWins = s?.manual_wins;
    const manualLosses = s?.manual_losses;
    const manualPd = s?.point_differential || 0;
    
    standings.set(t.id, {
      team: t,
      played: (manualWins ?? 0) + (manualLosses ?? 0),
      wins: manualWins ?? 0,
      losses: manualLosses ?? 0,
      winPct: '0.000',
      pd: manualPd,
    });
  }

  // Calculate dynamically if NO manual overrides
  for (const m of matchups) {
    if (m.is_bye) continue;
    
    if (m.team_a) {
      const row = standings.get(m.team_a.id);
      const s = seeds?.find(x => x.team_id === m.team_a?.id);
      if (row && m.status === 'COMPLETED' && s?.manual_wins == null && s?.manual_losses == null) {
        row.played++;
        if (m.winner_id === m.team_a.id) row.wins++;
        else row.losses++;

        // Calculate dynamic PD if not manually overridden
        if (!s?.point_differential && m.schedule) {
          let teamPd = 0;
          const scheds = Array.isArray(m.schedule) ? m.schedule : [m.schedule];
          for (const sched of scheds) {
            for (const g of sched.games || []) {
              if (g.home_score != null && g.away_score != null) {
                if (sched.home_team_id === m.team_a.id) teamPd += (g.home_score - g.away_score);
                else teamPd += (g.away_score - g.home_score);
              }
            }
          }
          row.pd += teamPd;
        }
      }
    }
    
    if (m.team_b) {
      const row = standings.get(m.team_b.id);
      const s = seeds?.find(x => x.team_id === m.team_b?.id);
      if (row && m.status === 'COMPLETED' && s?.manual_wins == null && s?.manual_losses == null) {
        row.played++;
        if (m.winner_id === m.team_b.id) row.wins++;
        else row.losses++;

        // Calculate dynamic PD if not manually overridden
        if (!s?.point_differential && m.schedule) {
          let teamPd = 0;
          const scheds = Array.isArray(m.schedule) ? m.schedule : [m.schedule];
          for (const sched of scheds) {
            for (const g of sched.games || []) {
              if (g.home_score != null && g.away_score != null) {
                if (sched.home_team_id === m.team_b.id) teamPd += (g.home_score - g.away_score);
                else teamPd += (g.away_score - g.home_score);
              }
            }
          }
          row.pd += teamPd;
        }
      }
    }
  }

  const rows = Array.from(standings.values());
  for (const r of rows) {
    if (r.played > 0) {
      r.winPct = (r.wins / r.played).toFixed(3);
    }
  }

  // Sort: wins desc → PD desc → losses asc → name asc (matches bracket generator exactly)
  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pd !== a.pd) return b.pd - a.pd;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return a.team.name.localeCompare(b.team.name);
  });

  const rowsByGroup = new Map<string, StandingsRow[]>();
  for (const r of rows) {
    const gName = r.team.group_name || 'Standings';
    if (!rowsByGroup.has(gName)) rowsByGroup.set(gName, []);
    rowsByGroup.get(gName)!.push(r);
  }

  const groupEntries = Array.from(rowsByGroup.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-6">
      {groupEntries.map(([groupName, groupRows]) => (
        <div key={groupName} className="surface-elevated rounded-xl overflow-hidden">
          {groupEntries.length > 1 && (
            <div className="bg-[#111827] px-5 py-3 border-b border-white/10">
              <h3 className="text-white font-display uppercase tracking-widest text-sm">{groupName}</h3>
            </div>
          )}
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-[#111827] text-white/50 text-[10px] font-mono uppercase tracking-widest border-b border-white/10">
              <tr>
                <th className="px-5 py-4 font-bold">Rank</th>
                <th className="px-5 py-4 font-bold">Team</th>
                <th className="px-5 py-4 font-bold text-center">W-L</th>
                <th className="px-5 py-4 font-bold text-center">PD</th>
                <th className="px-5 py-4 font-bold text-right">PCT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {groupRows.map((r, i) => (
                <tr key={r.team.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-5 py-4">
                    <span className="font-mono text-white/40 group-hover:text-white/60 transition-colors">{i + 1}</span>
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/teams/${r.team.slug || r.team.name.toLowerCase().replace(/ /g, '-')}`} className="font-bold text-white group-hover:text-flag-gold transition-colors">
                      {r.team.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 font-mono text-center text-base">
                    <span className="text-white font-bold">{r.wins}</span><span className="text-white/30 mx-1">-</span><span className="text-white/60">{r.losses}</span>
                  </td>
                  <td className={`px-5 py-4 font-mono text-center text-base ${r.pd > 0 ? 'text-green-400' : r.pd < 0 ? 'text-flag-red' : 'text-white/50'}`}>
                    {r.pd > 0 ? '+' : ''}{r.pd}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-white text-base font-bold">
                    {r.winPct}
                  </td>
                </tr>
              ))}
              {groupRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-white/40 italic">
                    No teams in this group yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      ))}
    </div>
  );
}

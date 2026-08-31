'use client';

import { Matchup, Team } from './BracketTree';

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
      }
    }
    
    if (m.team_b) {
      const row = standings.get(m.team_b.id);
      const s = seeds?.find(x => x.team_id === m.team_b?.id);
      if (row && m.status === 'COMPLETED' && s?.manual_wins == null && s?.manual_losses == null) {
        row.played++;
        if (m.winner_id === m.team_b.id) row.wins++;
        else row.losses++;
      }
    }
  }

  const rows = Array.from(standings.values());
  for (const r of rows) {
    if (r.played > 0) {
      r.winPct = (r.wins / r.played).toFixed(3);
    }
  }

  // Sort by wins, then fewest losses, then PD
  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return b.pd - a.pd;
  });

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-white/70">
          <thead className="bg-navy-800 text-white text-xs font-mono uppercase tracking-widest">
            <tr>
              <th className="px-3 sm:px-5 py-3.5 font-medium">Rank</th>
              <th className="px-3 sm:px-5 py-3.5 font-medium">Team</th>
              <th className="px-3 sm:px-5 py-3.5 font-medium text-center">W-L</th>
              <th className="px-3 sm:px-5 py-3.5 font-medium text-center">PD</th>
              <th className="px-3 sm:px-5 py-3.5 font-medium text-right">PCT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100/20">
            {rows.map((r, i) => (
              <tr key={r.team.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-3 sm:px-5 py-3.5 text-white font-mono font-bold">{i + 1}</td>
                <td className="px-3 sm:px-5 py-3.5 text-white/90 font-medium whitespace-nowrap">{r.team.name}</td>
                <td className="px-3 sm:px-5 py-3.5 text-center text-white/70">{r.wins} - {r.losses}</td>
                <td className="px-3 sm:px-5 py-3.5 text-center text-flag-gold font-bold">{r.pd > 0 ? `+${r.pd}` : r.pd}</td>
                <td className="px-3 sm:px-5 py-3.5 text-right font-mono font-bold text-white">{r.winPct}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

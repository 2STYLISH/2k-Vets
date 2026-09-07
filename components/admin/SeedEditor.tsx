'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSeedStats } from '@/lib/actions/tournaments';
import { useNotification } from '@/components/providers/NotificationProvider';
import { parseError } from '@/lib/format';

export default function SeedEditor({
  tournamentId,
  teams,
  seeds,
  matchups
}: {
  tournamentId: string;
  teams: { id: string, name: string }[];
  seeds: { team_id: string, seed: number, manual_wins?: number, manual_losses?: number, point_differential?: number }[];
  matchups?: any[];
}) {
  const { showConfirm, showToast } = useNotification();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const buildMap = () => {
    const map = new Map<string, any>();
    for (const t of teams) {
      const s = seeds.find(x => x.team_id === t.id);
      map.set(t.id, {
        seed: s?.seed || '',
        manual_wins: s?.manual_wins ?? '',
        manual_losses: s?.manual_losses ?? '',
        point_differential: s?.point_differential ?? ''
      });
    }
    return map;
  };

  const [localSeeds, setLocalSeeds] = useState(() => buildMap());

  // Compute dynamic stats from matchups
  const getDynamicStats = (teamId: string) => {
    let dWins = 0;
    let dLosses = 0;
    let dPd = 0;
    if (matchups) {
      for (const m of matchups) {
        if (m.status !== 'COMPLETED' || m.is_bye) continue;
        
        const isTeamA = m.team_a?.id === teamId;
        const isTeamB = m.team_b?.id === teamId;
        if (!isTeamA && !isTeamB) continue;

        if (m.winner_id === teamId) dWins++;
        else dLosses++;

        if (m.schedule) {
          let teamPd = 0;
          const scheds = Array.isArray(m.schedule) ? m.schedule : [m.schedule];
          for (const sched of scheds) {
            for (const g of sched.games || []) {
              if (g.home_score != null && g.away_score != null) {
                if (sched.home_team_id === teamId) teamPd += (g.home_score - g.away_score);
                else teamPd += (g.away_score - g.home_score);
              }
            }
          }
          dPd += teamPd;
        }
      }
    }
    return { dWins, dLosses, dPd };
  };

  const handleUpdate = (teamId: string, field: string, value: string) => {
    const map = new Map(localSeeds);
    const data = map.get(teamId);
    if (data) {
      data[field] = value;
      map.set(teamId, data);
      setLocalSeeds(map);
    }
  };

  const getEffectiveStats = (teamId: string, data: any) => {
    const dyn = getDynamicStats(teamId);
    const w = data?.manual_wins === '' ? dyn.dWins : parseInt(data?.manual_wins || '0') || 0;
    const l = data?.manual_losses === '' ? dyn.dLosses : parseInt(data?.manual_losses || '0') || 0;
    const pd = data?.point_differential === '' ? dyn.dPd : parseInt(data?.point_differential || '0') || 0;
    return { w, l, pd };
  };

  const handleSaveAll = async () => {
    setBusy(true);
    try {
      // Pass 1: Save stats and move all seeds out of the 1-N range to prevent unique constraint collisions
      let tempSeed = 10000;
      for (const [teamId, data] of Array.from(localSeeds.entries())) {
        await updateSeedStats({
          tournamentId,
          teamId,
          seed: tempSeed++, // temporarily shift everyone to 10000+
          manual_wins: data.manual_wins === '' ? null : parseInt(data.manual_wins),
          manual_losses: data.manual_losses === '' ? null : parseInt(data.manual_losses),
          point_differential: data.point_differential === '' ? null : parseInt(data.point_differential),
        });
      }
      // Pass 2: Now that the 1-N slots are completely empty, assign the final seeds safely
      const sorted = [...teams].sort((a, b) => {
        const dA = localSeeds.get(a.id);
        const dB = localSeeds.get(b.id);
        const sA = getEffectiveStats(a.id, dA);
        const sB = getEffectiveStats(b.id, dB);
        
        if (sB.w !== sA.w) return sB.w - sA.w;
        if (sB.pd !== sA.pd) return sB.pd - sA.pd;
        if (sA.l !== sB.l) return sA.l - sB.l;
        return a.name.localeCompare(b.name);
      });
      for (let i = 0; i < sorted.length; i++) {
        await updateSeedStats({ tournamentId, teamId: sorted[i].id, seed: i + 1 });
      }

      showToast('Saved successfully!', 'success');
      router.refresh();
    } catch (e: any) {
      showToast(parseError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Sort rows by wins desc → PD desc → losses asc → name (matches StandingsTable)
  const sortedTeams = [...teams].sort((a, b) => {
    const dA = localSeeds.get(a.id);
    const dB = localSeeds.get(b.id);
    const sA = getEffectiveStats(a.id, dA);
    const sB = getEffectiveStats(b.id, dB);

    if (sB.w !== sA.w) return sB.w - sA.w;
    if (sB.pd !== sA.pd) return sB.pd - sA.pd;
    if (sA.l !== sB.l) return sA.l - sB.l;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="card p-5 border-gold/40 shadow-[0_0_15px_rgba(255,215,0,0.05)] mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg text-white uppercase tracking-widest font-display">Standings & Seed Editor</h2>
          <p className="text-sm text-white/70 mt-1">
            Manually override wins, losses, and PD. Seeds are auto-assigned by rank on save.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={handleSaveAll} disabled={busy} className="btn-secondary py-2 px-6">
            {busy ? 'SAVING...' : 'SAVE STATS & SEEDS'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-white">
          <thead className="bg-arena-900 border-b border-arena-800 text-xs font-mono uppercase text-white">
            <tr>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium w-20 text-center">Rank</th>
              <th className="px-4 py-3 font-medium">Wins</th>
              <th className="px-4 py-3 font-medium">Losses</th>
              <th className="px-4 py-3 font-medium">Point Diff (PD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-800">
            {sortedTeams.map(t => {
              const data = localSeeds.get(t.id);
              return (
                <tr key={t.id} className="hover:bg-arena-800/50 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                  {/* Rank auto-computed from sort order */}
                  <td className="px-4 py-3 w-20">
                    <div className="w-10 h-8 flex items-center justify-center rounded-lg bg-flag-gold/10 border border-flag-gold/30 text-flag-gold font-mono text-sm font-bold mx-auto">
                      {sortedTeams.indexOf(t) + 1}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={data?.manual_wins} onChange={e => handleUpdate(t.id, 'manual_wins', e.target.value)} className="input-field w-20 text-center py-1" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={data?.manual_losses} onChange={e => handleUpdate(t.id, 'manual_losses', e.target.value)} className="input-field w-20 text-center py-1" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={data?.point_differential} onChange={e => handleUpdate(t.id, 'point_differential', e.target.value)} className="input-field w-24 text-center py-1" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

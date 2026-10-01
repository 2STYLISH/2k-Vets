'use client';

import { useState, useEffect } from 'react';
import { randomizeBracket, resetBracketSeeding } from '@/lib/actions/tournaments';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/components/providers/NotificationProvider';
import { parseError } from '@/lib/format';

interface Team {
  id: string;
  name: string;
}

export default function BracketSeeder({
  tournamentId,
  format,
  teams,
  rosterIds,
  seededIds,
  tournamentStatus,
  hasScheduledGames = false
}: {
  tournamentId: string;
  format?: string;
  teams: Team[];
  rosterIds: string[];
  seededIds: string[];
  tournamentStatus?: string;
  hasScheduledGames?: boolean;
}) {
  const { showConfirm, showToast } = useNotification();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Settings
  const [numGroups, setNumGroups] = useState(1);
  const [doubleRoundRobin, setDoubleRoundRobin] = useState(true);

  const isVeteransLeague = format === 'VETERANS_LEAGUE';
  const totalRostered = rosterIds.length;
  const maxGroups = Math.min(4, Math.floor(totalRostered / 3) || 1);
  const isLive = tournamentStatus === 'IN_PROGRESS';

  // Local state for seeds
  const [localSeeds, setLocalSeeds] = useState<{ teamId: string, seed: number }[]>([]);

  useEffect(() => {
    // Only set from DB initially, or when the props actually change
    const initial = seededIds.map((id, i) => ({ teamId: id, seed: i + 1 }));
    setLocalSeeds(initial);
  }, [seededIds.join(',')]);

  // Which teams are rostered but not in our localSeeds?
  const unseededIds = rosterIds.filter(rid => !localSeeds.find(s => s.teamId === rid));
  const unseededTeams = unseededIds.map(id => teams.find(t => t.id === id)!).filter(Boolean);

  function handleShuffleLocally() {
    // Combine currently seeded + unseeded
    const allIds = [...localSeeds.map(s => s.teamId), ...unseededIds];

    // Fisher-Yates
    for (let i = allIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
    }

    setLocalSeeds(allIds.map((id, i) => ({ teamId: id, seed: i + 1 })));
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const newSeeds = [...localSeeds];
    [newSeeds[index - 1], newSeeds[index]] = [newSeeds[index], newSeeds[index - 1]];
    // Reassign seed numbers 1..N
    newSeeds.forEach((s, i) => { s.seed = i + 1; });
    setLocalSeeds(newSeeds);
  }

  function handleMoveDown(index: number) {
    if (index === localSeeds.length - 1) return;
    const newSeeds = [...localSeeds];
    [newSeeds[index], newSeeds[index + 1]] = [newSeeds[index + 1], newSeeds[index]];
    // Reassign seed numbers 1..N
    newSeeds.forEach((s, i) => { s.seed = i + 1; });
    setLocalSeeds(newSeeds);
  }

  function handleRemoveLocal(teamId: string) {
    const newSeeds = localSeeds.filter(s => s.teamId !== teamId);
    newSeeds.forEach((s, i) => { s.seed = i + 1; });
    setLocalSeeds(newSeeds);
  }

  function handleAddLocal(teamId: string) {
    const newSeeds = [...localSeeds, { teamId, seed: localSeeds.length + 1 }];
    setLocalSeeds(newSeeds);
  }

  async function handleSaveToDB() {
    if (hasScheduledGames) return;
    const groupsText = isVeteransLeague && numGroups > 1 ? ` Teams will be split into ${numGroups} groups.` : '';
    const drrText = isVeteransLeague && doubleRoundRobin ? ' Double round-robin schedule will be generated.' : '';
    const confirmed = await showConfirm(
      'Generate & Save Bracket',
      `This will lock in the current ordering and generate the bracket in the database.${groupsText}${drrText} Are you sure?`
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await randomizeBracket(tournamentId, {
        doubleRoundRobin: isVeteransLeague ? doubleRoundRobin : false,
        numGroups: isVeteransLeague ? numGroups : 1,
        explicitSeeds: localSeeds, // We pass our explicit local state!
      });
      showToast('Bracket saved and generated successfully.', 'success');
    } catch (err: any) {
      showToast(parseError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  // Preview snake draft groups for Veterans League
  const previewGroups: Team[][] = Array.from({ length: numGroups }, () => []);
  if (isVeteransLeague && localSeeds.length > 0) {
    for (let i = 0; i < localSeeds.length; i++) {
      const round = Math.floor(i / numGroups);
      const isEvenRound = round % 2 === 0;
      const groupIdx = isEvenRound ? (i % numGroups) : (numGroups - 1 - (i % numGroups));
      const team = teams.find(t => t.id === localSeeds[i].teamId);
      if (team) previewGroups[groupIdx].push(team);
    }
  }

  return (
    <div className="card p-5 border-gold/40 shadow-[0_0_15px_rgba(255,215,0,0.05)]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-lg text-white font-display uppercase tracking-widest">SEEDING & GROUPINGS</h2>
            <p className="text-sm text-white/50">
              Randomize locally and arrange the teams manually. Hit <b>SAVE</b> when you're done.
            </p>
            {hasScheduledGames && (
              <p className="text-xs text-red-400 mt-2">
                Note: Games have already been scheduled. You cannot re-seed or randomize the bracket anymore.
              </p>
            )}
            {isLive && !hasScheduledGames && (
              <p className="text-xs text-yellow-400 mt-2">
                🔒 Tournament is <b>LIVE</b>. Hit <b>RESET BRACKET</b> first if you need to change the groupings.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {isVeteransLeague && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest whitespace-nowrap">Groups</span>
                  <select
                    value={numGroups}
                    onChange={e => setNumGroups(Number(e.target.value))}
                    disabled={busy || hasScheduledGames || isLive}
                    style={{ colorScheme: 'dark' }}
                    className="bg-arena-800 border border-white/[0.15] text-white text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-flag-gold/50 cursor-pointer"
                  >
                    <option value={1}>No Groups</option>
                    {maxGroups >= 2 && <option value={2}>2 Groups</option>}
                    {maxGroups >= 3 && <option value={3}>3 Groups</option>}
                    {maxGroups >= 4 && <option value={4}>4 Groups</option>}
                  </select>
                </div>

                <button
                  onClick={() => setDoubleRoundRobin(v => !v)}
                  disabled={busy || hasScheduledGames}
                  className={`py-2 px-4 text-xs font-mono uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap ${doubleRoundRobin
                    ? 'border-flag-gold/40 text-flag-gold bg-flag-gold/10'
                    : 'border-white/[0.1] text-white/50'
                    } ${(busy || hasScheduledGames || isLive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {doubleRoundRobin ? '✓ Double RR' : 'Single RR'}
                </button>
              </>
            )}

            <button
              onClick={async () => {
                const confirmed = await showConfirm(
                  'Reset Bracket',
                  'This will wipe all bracket matchups, schedules, and seeds for this tournament. Teams will NOT be deleted. Are you sure?'
                );
                if (!confirmed) return;
                setBusy(true);
                try {
                  await resetBracketSeeding(tournamentId);
                  showToast('Bracket cleared. You can now reshuffle and save.', 'success');
                  router.refresh();
                } catch (err: any) {
                  showToast(parseError(err), 'error');
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="btn-secondary py-2 px-5 !border-red-500/40 !text-red-400 hover:!bg-red-500/10"
            >
              RESET BRACKET
            </button>
            <button
              onClick={handleShuffleLocally}
              disabled={busy || totalRostered === 0 || hasScheduledGames || isLive}
              className="btn-secondary py-2 px-5"
            >
              SHUFFLE
            </button>
            <button
              onClick={handleSaveToDB}
              disabled={busy || localSeeds.length === 0 || hasScheduledGames || isLive}
              className="btn-primary py-2 px-5"
            >
              {busy ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>

        {isVeteransLeague && numGroups > 1 && localSeeds.length > 0 ? (
          <div>
            <h3 className="text-sm font-mono text-flag-gold mb-3 uppercase tracking-widest">Group Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {previewGroups.map((group, gIndex) => {
                const sortedGroup = [...group].sort((a, b) => a.name.localeCompare(b.name));
                return (
                  <div key={gIndex} className="bg-arena-900 border border-white/10 rounded-lg p-3">
                    <p className="text-xs font-bold text-white mb-2 pb-2 border-b border-white/10">Group {String.fromCharCode(65 + gIndex)}</p>
                    <div className="space-y-1">
                      {sortedGroup.map(t => (
                        <div key={t.id} className="text-xs text-white/80 bg-arena-800 px-2 py-1.5 rounded">{t.name}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-mono text-flag-gold uppercase tracking-widest">Seeded Teams ({localSeeds.length})</h3>
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
              {localSeeds.length === 0 ? (
                <p className="text-xs text-white/40 italic">No teams seeded yet.</p>
              ) : (
                localSeeds.map((s, idx) => {
                  const t = teams.find(x => x.id === s.teamId);
                  return (
                    <div key={s.teamId} className="flex items-center gap-2 text-sm text-white px-3 py-2 bg-arena-800 rounded border border-white/5 hover:border-white/20 transition-colors">
                      <div className="text-[10px] font-mono text-white/40 w-5">{s.seed}.</div>
                      <div className="flex-1 font-medium truncate">{t?.name || 'Unknown'}</div>
                      {!hasScheduledGames && (
                        <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                          <button onClick={() => handleMoveUp(idx)} disabled={idx === 0} className="p-1 hover:text-flag-gold disabled:opacity-30">▲</button>
                          <button onClick={() => handleMoveDown(idx)} disabled={idx === localSeeds.length - 1} className="p-1 hover:text-flag-gold disabled:opacity-30">▼</button>
                          <button onClick={() => handleRemoveLocal(s.teamId)} className="p-1 ml-1 text-crimson-500 hover:text-crimson-400">×</button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-mono text-flag-gold uppercase tracking-widest">Available Teams ({unseededTeams.length})</h3>
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
              {unseededTeams.length === 0 ? (
                <p className="text-xs text-white/40 italic">All teams have been assigned a seed.</p>
              ) : (
                unseededTeams.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-sm text-white px-3 py-2 bg-arena-800 rounded border border-white/5">
                    <span className="truncate">{t.name}</span>
                    {!hasScheduledGames && (
                      <button onClick={() => handleAddLocal(t.id)} className="text-[10px] font-mono text-flag-gold hover:text-flag-gold/70 uppercase tracking-widest">
                        + Add
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


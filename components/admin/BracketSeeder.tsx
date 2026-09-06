'use client';

import { useState } from 'react';
import { randomizeBracket, resetBracketSeeding } from '@/lib/actions/tournaments';
import { useNotification } from '@/components/providers/NotificationProvider';
import { parseError } from '@/lib/format';

export default function BracketSeeder({ 
  tournamentId, 
  format,
  teams, // all teams in DB
  rosterIds, // team IDs that are registered in tournament_rosters
  seededIds // team IDs that have been assigned a seed
}: { 
  tournamentId: string;
  format?: string;
  teams: { id: string, name: string }[];
  rosterIds: string[];
  seededIds: string[];
}) {
  const { showConfirm, showToast } = useNotification();
  const [busy, setBusy] = useState(false);
  const [numGroups, setNumGroups] = useState(1);
  const [doubleRoundRobin, setDoubleRoundRobin] = useState(true);

  const isVeteransLeague = format === 'VETERANS_LEAGUE';
  const totalRostered = rosterIds.length;
  // Max groups = floor(teams / 3), minimum 3 per group
  const maxGroups = Math.min(4, Math.floor(totalRostered / 3));

  const availableTeams = teams.filter(t => rosterIds.includes(t.id) && !seededIds.includes(t.id));
  const seededTeams = teams.filter(t => seededIds.includes(t.id));

  async function handleRandomize() {
    const groupsText = isVeteransLeague && numGroups > 1 ? ` Teams will be split into ${numGroups} groups.` : '';
    const drrText = isVeteransLeague && doubleRoundRobin ? ' Double round-robin schedule will be generated.' : '';
    const confirmed = await showConfirm(
      'Randomize Bracket',
      `This will wipe existing seeds and randomly assign all registered teams to slots.${groupsText}${drrText} Are you sure?`
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await randomizeBracket(tournamentId, {
        doubleRoundRobin: isVeteransLeague ? doubleRoundRobin : false,
        numGroups: isVeteransLeague ? numGroups : 1,
      });
      showToast('Bracket randomized.', 'success');
    } catch (err: any) {
      showToast(parseError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 border-gold/40 shadow-[0_0_15px_rgba(255,215,0,0.05)]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h2 className="text-lg text-white font-display uppercase tracking-widest">SEEDING & RANDOMIZER</h2>
            <p className="text-sm text-white/50">
              Automatically shuffle all registered teams into the bracket slots.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Veterans League options */}
            {isVeteransLeague && (
              <>
                {/* Groups dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest whitespace-nowrap">Groups</span>
                  <select
                    value={numGroups}
                    onChange={e => setNumGroups(Number(e.target.value))}
                    disabled={busy}
                    style={{ colorScheme: 'dark' }}
                    className="bg-arena-800 border border-white/[0.15] text-white text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-flag-gold/50 cursor-pointer appearance-none"
                  >
                    <option value={1} className="bg-arena-900 text-white">No Groups</option>
                    {maxGroups >= 2 && <option value={2} className="bg-arena-900 text-white">2 Groups</option>}
                    {maxGroups >= 3 && <option value={3} className="bg-arena-900 text-white">3 Groups</option>}
                    {maxGroups >= 4 && <option value={4} className="bg-arena-900 text-white">4 Groups</option>}
                  </select>
                </div>

                {/* Double Round Robin toggle */}
                <button
                  onClick={() => setDoubleRoundRobin(v => !v)}
                  disabled={busy}
                  className={`py-2 px-4 text-xs font-mono uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap ${
                    doubleRoundRobin
                      ? 'border-flag-gold/40 text-flag-gold bg-flag-gold/10 hover:bg-flag-gold/15'
                      : 'border-white/[0.1] text-white/50 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  {doubleRoundRobin ? '✓ Double RR' : 'Single RR'}
                </button>
              </>
            )}

            <button 
              onClick={async () => {
                const confirmed = await showConfirm(
                  'Reset Seeding',
                  'This will wipe all matchups and return all teams to the available pool. Are you sure?'
                );
                if (!confirmed) return;
                setBusy(true);
                try { 
                  await resetBracketSeeding(tournamentId); 
                  showToast('Seeding reset.', 'success');
                }
                catch (err: any) { showToast(parseError(err), 'error'); }
                finally { setBusy(false); }
              }}
              disabled={busy || seededIds.length === 0} 
              className="btn-secondary py-2 px-5"
            >
              RESET SEEDING
            </button>
            <button 
              onClick={handleRandomize} 
              disabled={busy || rosterIds.length === 0} 
              className="btn-primary py-2 px-5"
            >
              {busy ? 'RANDOMIZING...' : 'RANDOMIZE BRACKET'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-mono text-flag-gold mb-2 uppercase tracking-widest">Available Teams ({availableTeams.length})</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableTeams.length === 0 ? (
                <p className="text-xs text-white/40 italic">No unseeded teams available.</p>
              ) : (
                availableTeams.map(t => (
                  <div key={t.id} className="text-sm text-white px-3 py-1.5 bg-arena-800 rounded">
                    {t.name}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-mono text-flag-gold mb-2 uppercase tracking-widest">Seeded Teams ({seededTeams.length})</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {seededTeams.length === 0 ? (
                <p className="text-xs text-white/40 italic">No teams have been seeded yet.</p>
              ) : (
                seededTeams.map(t => (
                  <div key={t.id} className="text-sm text-white px-3 py-1.5 bg-arena-800 rounded">
                    {t.name}
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


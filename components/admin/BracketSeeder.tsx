'use client';

import { useState } from 'react';
import { randomizeBracket, resetBracketSeeding } from '@/lib/actions/tournaments';
import { useNotification } from '@/components/providers/NotificationProvider';
import { parseError } from '@/lib/format';

export default function BracketSeeder({ 
  tournamentId, 
  teams, // all teams in DB
  rosterIds, // team IDs that are registered in tournament_rosters
  seededIds // team IDs that have been assigned a seed
}: { 
  tournamentId: string;
  teams: { id: string, name: string }[];
  rosterIds: string[];
  seededIds: string[];
}) {
  const { showConfirm, showToast } = useNotification();
  const [busy, setBusy] = useState(false);

  const availableTeams = teams.filter(t => rosterIds.includes(t.id) && !seededIds.includes(t.id));
  const seededTeams = teams.filter(t => seededIds.includes(t.id));

  async function handleRandomize() {
    const confirmed = await showConfirm(
      'Randomize Bracket',
      'This will wipe existing seeds and randomly assign all registered teams to slots. Are you sure?'
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await randomizeBracket(tournamentId);
      showToast('Bracket randomized.', 'success');
    } catch (err: any) {
      showToast(parseError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 border-gold/40 shadow-[0_0_15px_rgba(255,215,0,0.05)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg text-bone">SEEDING & RANDOMIZER</h2>
          <p className="text-sm text-mute">
            Automatically shuffle all registered teams into the bracket slots.
          </p>
        </div>
        <div className="flex gap-3">
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
            className="btn-secondary py-2 px-6"
          >
            RESET SEEDING
          </button>
          <button 
            onClick={handleRandomize} 
            disabled={busy || rosterIds.length === 0} 
            className="btn-primary py-2 px-6"
          >
            {busy ? 'RANDOMIZING...' : 'RANDOMIZE BRACKET'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-mono text-gold mb-2">Available Teams ({availableTeams.length})</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {availableTeams.length === 0 ? (
              <p className="text-xs text-mute italic">No unseeded teams available.</p>
            ) : (
              availableTeams.map(t => (
                <div key={t.id} className="text-sm text-bone px-3 py-1.5 bg-arena-800 rounded">
                  {t.name}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-mono text-gold mb-2">Seeded Teams ({seededTeams.length})</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {seededTeams.length === 0 ? (
              <p className="text-xs text-mute italic">No teams have been seeded yet.</p>
            ) : (
              seededTeams.map(t => (
                <div key={t.id} className="text-sm text-bone px-3 py-1.5 bg-arena-800 rounded">
                  {t.name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { finalizeAward } from '@/lib/actions/awards';

const selectCls = 'w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:ring-1 focus:ring-silver-400 transition-colors';
const inputCls = 'w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-silver-400 transition-colors';
const labelCls = 'block text-[10px] text-white font-bold uppercase font-mono tracking-widest mb-1.5';

export default function FinalizeAwardForm({
  awardType,
  awardId,
  tournamentId,
  currentWinnerId,
  currentWinnerIds = [],
  currentCustomName = '',
  candidates,
}: {
  awardType: string;
  awardId: string | null;
  tournamentId: string;
  currentWinnerId: string | null;
  currentWinnerIds?: string[];
  currentCustomName?: string;
  candidates: { id: string; gamertag: string }[];
}) {
  const isMythical = awardType === 'MYTHICAL_TEAM';
  const [winnerId, setWinnerId] = useState(currentWinnerId ?? '');
  
  // For Mythical Team
  const [winnerIds, setWinnerIds] = useState<string[]>(
    currentWinnerIds.length > 0 ? currentWinnerIds : ['', '', '', '', '']
  );
  const [customName, setCustomName] = useState(currentCustomName || 'Mythical 5');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    setError('');
    
    try {
      if (isMythical) {
        const filteredIds = winnerIds.filter(Boolean);
        if (filteredIds.length === 0) throw new Error('Please select at least one player.');
        if (!customName.trim()) throw new Error('Please enter a custom name.');
        
        await finalizeAward({ 
          awardType, 
          awardId, 
          tournamentId, 
          winnerPlayerId: null, 
          winnerPlayerIds: filteredIds,
          customName,
          notes: '', 
          publishNotes: false 
        });
      } else {
        if (!winnerId) throw new Error('Please select a winner.');
        await finalizeAward({ 
          awardType, 
          awardId, 
          tournamentId, 
          winnerPlayerId: winnerId, 
          notes: '', 
          publishNotes: false 
        });
      }
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleWinnerIdsChange(index: number, val: string) {
    const newArr = [...winnerIds];
    newArr[index] = val;
    setWinnerIds(newArr);
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg text-white font-display tracking-widest">FINAL ADMIN DECISION</h2>

      {isMythical ? (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Award Name</label>
            <input 
              type="text" 
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Mythical 5 or All-Vets First Team"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Select Players (Up to 5)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[0, 1, 2, 3, 4].map(idx => (
                <select 
                  key={idx} 
                  value={winnerIds[idx] || ''} 
                  onChange={(e) => handleWinnerIdsChange(idx, e.target.value)} 
                  className={selectCls}
                >
                  <option value="">— select player {idx + 1} —</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>{c.gamertag}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className={labelCls}>Select Winner</label>
          <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className={selectCls}>
            <option value="">— choose a player —</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.gamertag}</option>
            ))}
          </select>
        </div>
      )}

      <button
        disabled={(isMythical ? winnerIds.filter(Boolean).length === 0 : !winnerId) || saving || saved}
        onClick={handleConfirm}
        className="btn-primary"
      >
        {saving ? 'SAVING...' : saved ? 'SAVED' : 'SAVE FINAL AWARD'}
      </button>

      {saved && (
        <p className="text-emerald-400 text-sm font-mono">✓ Award saved successfully.</p>
      )}
      {error && (
        <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">
          <p className="text-red-400 text-sm font-mono">⚠ {error}</p>
        </div>
      )}
    </div>
  );
}

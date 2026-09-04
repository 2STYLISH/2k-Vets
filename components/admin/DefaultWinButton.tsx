'use client';

import { useState } from 'react';
import { useNotification } from '@/components/providers/NotificationProvider';
import { assignDefaultWin } from '@/lib/actions/games';

export default function DefaultWinButton({
  scheduleId,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: {
  scheduleId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const { showConfirm, showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function handleAssign(winnerId: string) {
    const winnerName = winnerId === homeTeamId ? homeTeamName : awayTeamName;
    const confirmed = await showConfirm(
      'Assign Default Win',
      `Are you sure you want to assign a Default Win to ${winnerName}? This will instantly advance the bracket and update standings with a 1-0 win.`
    );
    if (!confirmed) return;

    setLoading(true);
    setIsOpen(false);
    try {
      await assignDefaultWin({
        scheduleId,
        winnerTeamId: winnerId,
        homeTeamId,
        awayTeamId,
      });
      showToast(`${winnerName} awarded Default Win.`, 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to assign default win.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => setIsOpen(true)}
        className="btn-secondary w-full flex items-center justify-center gap-2 mt-4"
      >
        {loading ? 'PROCESSING...' : 'ASSIGN DEFAULT WIN'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/80 backdrop-blur-md p-4">
          <div className="bg-gradient-to-br from-surface-900/80 to-surface-950/80 backdrop-blur-xl border border-white/[0.06] w-full max-w-md rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="text-xl font-display text-white mb-2">Assign Default Win</h3>
            <p className="text-sm text-white/40 font-mono mb-6">
              Select the team that will receive the default win (1-0 score). No player stats will be recorded.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleAssign(homeTeamId)}
                className="w-full text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.1] text-white transition-all duration-300 font-display tracking-widest text-lg"
              >
                {homeTeamName} <span className="text-white/40 text-sm ml-2 font-mono">(Home)</span>
              </button>
              <button
                onClick={() => handleAssign(awayTeamId)}
                className="w-full text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.1] text-white transition-all duration-300 font-display tracking-widest text-lg"
              >
                {awayTeamName} <span className="text-white/40 text-sm ml-2 font-mono">(Away)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

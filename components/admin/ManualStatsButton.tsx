'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureGameForSchedule } from '@/lib/actions/games';
import { useNotification } from '@/components/providers/NotificationProvider';
import { parseError } from '@/lib/format';

export default function ManualStatsButton({ scheduleId }: { scheduleId: string }) {
  const router = useRouter();
  const { showToast } = useNotification();
  const [busy, setBusy] = useState(false);

  async function handleManualEntry() {
    setBusy(true);
    try {
      await ensureGameForSchedule(scheduleId);
      router.refresh();
    } catch (e: any) {
      console.error(e);
      showToast(parseError(e), 'error');
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 border-surface-600 border-dashed">
      <h3 className="text-sm font-mono text-silver-400 uppercase tracking-widest mb-2">Manual Entry</h3>
      <p className="text-xs text-silver-500 mb-4">
        Skip screenshot AI extraction and enter all stats manually.
      </p>
      <button onClick={handleManualEntry} disabled={busy} className="btn-secondary text-xs">
        {busy ? 'PREPARING...' : 'ENTER STATS MANUALLY'}
      </button>
    </div>
  );
}

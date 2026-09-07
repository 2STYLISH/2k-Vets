'use client';

import { useState } from 'react';
import { updateSchedule, deleteSchedule } from '@/lib/actions/schedule';
import { formatDate } from '@/lib/format';
import { useNotification } from '@/components/providers/NotificationProvider';
import { parseError } from '@/lib/format';

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:   'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
  LIVE:        'bg-flag-red/10 text-flag-red border border-flag-red/20 animate-pulse',
  COMPLETED:   'bg-white/[0.03] text-white/30 border border-white/10',
  POSTPONED:   'bg-flag-gold/10 text-flag-gold border border-flag-gold/20',
  CANCELLED:   'bg-red-900/20 text-red-400 border border-red-700/30',
};

export default function ScheduleManager({ games }: { games: any[] }) {
  const [tab, setTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const filtered = games.filter((g) => {
    const isArchived = g.is_archived || g.status === 'COMPLETED';
    if (tab === 'ACTIVE' && isArchived) return false;
    if (tab === 'ARCHIVED' && !isArchived) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <button 
            onClick={() => setTab('ACTIVE')}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded transition-colors ${tab === 'ACTIVE' ? 'bg-flag-red text-white' : 'bg-[#1f2937] text-white/50 hover:text-white border border-white/10'}`}
          >
            Active
          </button>
          <button 
            onClick={() => setTab('ARCHIVED')}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded transition-colors ${tab === 'ARCHIVED' ? 'bg-flag-red text-white' : 'bg-[#1f2937] text-white/50 hover:text-white border border-white/10'}`}
          >
            Archived
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-white text-sm">No games found.</p>}
        {filtered.map((g) => (
          <GameRow key={g.id} game={g} />
        ))}
      </div>
    </div>
  );
}

function GameRow({ game }: { game: any }) {
  const { showConfirm, showToast } = useNotification();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(game.scheduled_date || '');
  const [time, setTime] = useState(game.scheduled_time?.slice(0, 5) || '');
  const [type, setType] = useState(game.game_type || 'REGULAR');
  const [roundLabel, setRoundLabel] = useState(game.round_label || '');
  const [status, setStatus] = useState(game.status || 'SCHEDULED');
  const [busy, setBusy] = useState(false);

  const displayTime = game.scheduled_time
    ? new Date(`1970-01-01T${game.scheduled_time}`).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : '';

  const tournament = game.tournament?.name;

  async function handleSave() {
    setBusy(true);
    try {
      await updateSchedule(game.id, {
        scheduledDate: date,
        scheduledTime: time,
        gameType: type as any,
        roundLabel: roundLabel || undefined,
        status: status as any,
      });
      showToast('Schedule saved.', 'success');
      setEditing(false);
    } catch (e: any) {
      console.error(e);
      showToast(parseError(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleArchive() {
    setBusy(true);
    try {
      await updateSchedule(game.id, { isArchived: !game.is_archived });
      showToast(game.is_archived ? 'Restored game.' : 'Archived game.', 'success');
      setEditing(false);
    } catch (e: any) {
      console.error(e);
      showToast(parseError(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const confirmed = await showConfirm('Delete Schedule', 'Are you sure you want to delete this scheduled game?');
    if (!confirmed) return;
    setBusy(true);
    try {
      await deleteSchedule(game.id);
      showToast('Game deleted.', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(parseError(e), 'error');
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="surface-elevated rounded-xl border border-flag-gold/40 p-5 space-y-3 shadow-[0_0_15px_rgba(212,160,23,0.1)]">
        <div className="mb-2">
          <p className="text-white font-bold">{game.home?.name} vs {game.away?.name}</p>
          {tournament && <p className="text-xs text-white/70 font-mono mt-0.5">{tournament}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <label className="block text-[10px] text-white font-bold uppercase tracking-widest mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-[10px] text-white font-bold uppercase tracking-widest mb-1">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="input-field py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-[10px] text-white font-bold uppercase tracking-widest mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input-field py-1.5 text-sm text-white">
              <option value="REGULAR">Regular</option>
              <option value="PLAYOFF">Playoff</option>
              <option value="TOURNAMENT">Tournament</option>
              <option value="EXHIBITION">Exhibition</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-white font-bold uppercase tracking-widest mb-1">Round Label</label>
            <input type="text" value={roundLabel} onChange={e => setRoundLabel(e.target.value)} placeholder="e.g. Finals" className="input-field py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-[10px] text-white font-bold uppercase tracking-widest mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-field py-1.5 text-sm text-white">
              <option value="SCHEDULED">Scheduled</option>
              <option value="LIVE">Live</option>
              <option value="COMPLETED">Completed</option>
              <option value="POSTPONED">Postponed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-4">
            <button onClick={handleDelete} disabled={busy} className="text-[10px] text-white/40 hover:text-flag-red transition-colors font-mono uppercase tracking-widest">
              DELETE
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} disabled={busy} className="btn-secondary py-1.5 text-xs">CANCEL</button>
            <button onClick={handleSave} disabled={busy} className="btn-primary py-1.5 text-xs">SAVE</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-elevated rounded-xl border border-white/10 p-5 flex items-center justify-between group hover:border-white/20 transition-colors">
      <div className="min-w-0">
        <p className="text-white font-bold truncate">{game.home?.name} vs {game.away?.name}</p>
        <p className="text-xs text-white/70 font-mono uppercase mt-0.5">
          {tournament && <span className="text-white/50 not-uppercase normal-case mr-2">[{tournament}]</span>}
          {formatDate(game.scheduled_date)} · {displayTime}
          {game.round_label ? ` · ${game.round_label}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${STATUS_STYLES[game.status] ?? 'text-silver-500'}`}>
          {game.status}
        </span>
        {game.status !== 'COMPLETED' && (
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] font-mono text-white/40 hover:text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 border border-white/10 rounded hover:border-white/30 bg-[#111827]"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

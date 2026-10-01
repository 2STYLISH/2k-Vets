'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTournament, updateTournament, updateTournamentLogo } from '@/lib/actions/tournaments';
import { uploadFileBypassingRLS } from '@/lib/actions/upload';
import { useNotification } from '@/components/providers/NotificationProvider';
import { parseError } from '@/lib/format';

const FORMATS = [
  { value: 'SINGLE_ELIM', label: 'Single Elimination' },
  { value: 'DOUBLE_ELIM', label: 'Double Elimination' },
  { value: 'PLAYOFFS', label: 'Playoffs (10-Team)' },
  { value: 'VETERANS_LEAGUE', label: 'Veterans League (Season)' },
  { value: 'ROUND_ROBIN', label: 'Round Robin' },
  { value: 'SWISS', label: 'Swiss' },
  { value: 'FREE_FOR_ALL', label: 'Free For All' },
  { value: 'LEADERBOARD', label: 'Leaderboard' },
];

const MATCH_FORMATS = ['BO1', 'BO3', 'BO5', 'BO7'];

const inputCls =
  'w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-flag-gold/50 transition-colors';
const labelCls = 'block text-[10px] text-white/50 uppercase font-mono tracking-widest mb-1';

interface Props {
  tournamentId: string;
  tournamentName: string;
  currentLogoUrl: string;
  currentFormat: string;
  currentNumTeams: number;
  currentMatchFormat: string;
  currentStartDate: string;
  currentEndDate: string;
}

export default function TournamentAdminActions({
  tournamentId,
  tournamentName,
  currentLogoUrl,
  currentFormat,
  currentNumTeams,
  currentMatchFormat,
  currentStartDate,
  currentEndDate,
}: Props) {
  const router = useRouter();
  const { showConfirm, showToast } = useNotification();

  // ── Edit form state ──────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(tournamentName);
  const [format, setFormat] = useState(currentFormat);
  const [numTeams, setNumTeams] = useState(currentNumTeams);
  const [matchFormat, setMatchFormat] = useState(currentMatchFormat);
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);

  // ── Logo state ───────────────────────────────────────────────────────
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [uploading, setUploading] = useState(false);

  // ── Delete state ─────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateTournament({
        tournamentId,
        name,
        format,
        numTeams,
        matchFormat,
        startDate,
        endDate,
      });
      showToast('Tournament updated.', 'success');
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      showToast(parseError(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    // Reset fields back to original
    setName(tournamentName);
    setFormat(currentFormat);
    setNumTeams(currentNumTeams);
    setMatchFormat(currentMatchFormat);
    setStartDate(currentStartDate);
    setEndDate(currentEndDate);
    setEditing(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo must be under 2MB', 'error');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${tournamentId}.${ext}`;
      const formData = new FormData();
      formData.append('file', file);
      const publicUrl = await uploadFileBypassingRLS(formData, 'tournament-logos', path);
      const cacheBustedUrl = publicUrl + `?t=${Date.now()}`;
      await updateTournamentLogo(tournamentId, cacheBustedUrl);
      setLogoUrl(cacheBustedUrl);
      showToast('Tournament logo uploaded.', 'success');
      router.refresh();
    } catch (err: any) {
      showToast(parseError(err), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    const confirmed = await showConfirm(
      'Delete Tournament',
      `DELETE "${tournamentName}"?\n\nThis will permanently delete the tournament, all its brackets, schedules, awards, and rosters. This cannot be undone.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteTournament(tournamentId);
      showToast('Tournament deleted.', 'success');
      router.refresh();
    } catch (e: any) {
      showToast(parseError(e), 'error');
      setDeleting(false);
    }
  }

  return (
    <div className="border-t border-white/10 pt-4 space-y-4">
      {/* ── Logo + action bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {/* Logo upload */}
          <label
            htmlFor={`tourney-logo-${tournamentId}`}
            className="w-12 h-12 rounded bg-[#111827] flex items-center justify-center border border-white/10 cursor-pointer overflow-hidden hover:border-white/30 transition-colors shrink-0"
          >
            {uploading ? (
              <span className="text-[9px] text-silver-500 font-mono">...</span>
            ) : logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] text-silver-500 font-mono">LOGO</span>
            )}
            <input
              id={`tourney-logo-${tournamentId}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={uploading}
            />
          </label>
          <div>
            <p className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">
              Tournament Logo
            </p>
            <p className="text-[9px] font-mono text-silver-500 uppercase tracking-widest mt-0.5">
              Click to upload (Max 2MB)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-[10px] font-mono text-flag-gold hover:text-flag-gold/70 uppercase tracking-widest transition-colors"
          >
            {editing ? 'CANCEL EDIT' : 'EDIT'}
          </button>
          <span className="text-white/20 text-xs">|</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-[10px] font-mono text-crimson-500 hover:text-crimson-300 uppercase tracking-widest transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* ── Inline edit form ── */}
      {editing && (
        <div className="bg-[#0d1117] border border-flag-gold/20 rounded-xl p-5 space-y-4">
          <p className="text-[10px] font-mono text-flag-gold uppercase tracking-widest font-bold">
            Edit Tournament
          </p>

          {/* Name */}
          <div>
            <label className={labelCls}>Tournament Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Commissioner's Cup S2"
            />
          </div>

          {/* Format + Num Teams */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className={inputCls}
                style={{ colorScheme: 'dark' }}
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#111827]">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Number of Teams</label>
              <input
                type="number"
                min={2}
                max={128}
                value={numTeams}
                onChange={(e) => setNumTeams(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Match Format */}
          <div>
            <label className={labelCls}>Default Match Format</label>
            <select
              value={matchFormat}
              onChange={(e) => setMatchFormat(e.target.value)}
              className={inputCls}
              style={{ colorScheme: 'dark' }}
            >
              {MATCH_FORMATS.map((m) => (
                <option key={m} value={m} className="bg-[#111827]">
                  Best of {m.replace('BO', '')}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="btn-primary text-xs py-2"
            >
              {saving ? 'SAVING…' : 'SAVE CHANGES'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs font-mono text-silver-500 hover:text-silver-300 uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

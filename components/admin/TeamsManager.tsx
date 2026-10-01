'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  createTeam,
  deleteTeam,
  importTeamToTournament,
  assignPlayerToTournamentTeam,
  removePlayerFromTournamentTeam,
  updateTeamLogo,
  updateTeamName,
} from '@/lib/actions/teams';
import { updateTournamentLogo } from '@/lib/actions/tournaments';
import { uploadFileBypassingRLS } from '@/lib/actions/upload';
import { useNotification } from '@/components/providers/NotificationProvider';
import { parseError } from '@/lib/format';

interface Tournament {
  id: string;
  name: string;
  status: string;
  logo_url?: string | null;
}

interface Team {
  id: string;
  name: string;
  short_name: string | null;
  tournament_id: string;
  logo_url: string | null;
}

interface Player {
  id: string;
  gamertag: string;
  position: string | null;
}

interface RosterEntry {
  tournament_id: string;
  team_id: string;
  player_id: string;
}

type AddMode = 'existing' | 'new';

export default function TeamsManager({
  tournaments,
  teams,
  allTournaments,
  players,
  rosters,
}: {
  tournaments: Tournament[];
  teams: Team[];
  allTournaments: Tournament[];
  players: Player[];
  rosters: RosterEntry[];
}) {
  const router = useRouter();
  const { showToast } = useNotification();

  const [activeTournament, setActiveTournament] = useState<string>(tournaments[0]?.id || '');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  // ── Add-team panel state ──────────────────────────────────────────────
  const [addMode, setAddMode] = useState<AddMode>('existing');
  const [busy, setBusy] = useState(false);

  // "Use Existing" mode
  const [importSearch, setImportSearch] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [copyRoster, setCopyRoster] = useState(true);

  // "Create New" mode
  const [newTeamName, setNewTeamName] = useState('');

  // Tournament logo upload
  const [uploadingTourney, setUploadingTourney] = useState(false);

  // Teams already in the active tournament
  const teamsInActiveTournament = useMemo(
    () => teams.filter((t) => t.tournament_id === activeTournament),
    [teams, activeTournament],
  );

  // Teams eligible to import: any team NOT already in the active tournament
  // Deduplicated by name — show only one entry per unique team name
  const importCandidates = useMemo(() => {
    const existingNames = new Set(
      teamsInActiveTournament.map((t) => t.name.toLowerCase()),
    );
    const seen = new Map<string, Team & { tournamentName: string }>();
    for (const t of teams) {
      if (t.tournament_id === activeTournament) continue;
      if (existingNames.has(t.name.toLowerCase())) continue;
      const tName = allTournaments.find((at) => at.id === t.tournament_id)?.name ?? 'Unknown Tournament';
      // Keep the most recent occurrence (last write wins as we iterate in order)
      seen.set(t.name.toLowerCase(), { ...t, tournamentName: tName });
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, activeTournament, teamsInActiveTournament, allTournaments]);

  const filteredImportCandidates = useMemo(
    () =>
      importCandidates.filter((t) =>
        t.name.toLowerCase().includes(importSearch.toLowerCase()),
      ),
    [importCandidates, importSearch],
  );

  const selectedSourceTeam = importCandidates.find((t) => t.id === selectedSourceId) ?? null;
  const showDropdown = importSearch.length > 0 && !selectedSourceId;

  // ── Handlers ─────────────────────────────────────────────────────────
  async function handleImportTeam() {
    if (!selectedSourceId || !activeTournament) return;
    setBusy(true);
    try {
      await importTeamToTournament({
        sourceTeamId: selectedSourceId,
        targetTournamentId: activeTournament,
        copyRoster,
      });
      showToast(
        `${selectedSourceTeam?.name} added${copyRoster ? ' with roster' : ''}.`,
        'success',
      );
      setSelectedSourceId('');
      setImportSearch('');
      router.refresh();
    } catch (e: any) {
      showToast(parseError(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTeam(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newTeamName.trim()) return;
    setBusy(true);
    try {
      await createTeam({ tournamentId: activeTournament, name: newTeamName.trim() });
      showToast('Team created successfully.', 'success');
      setNewTeamName('');
      router.refresh();
    } catch (e: any) {
      showToast(parseError(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleTourneyLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeTournament) return;
    setUploadingTourney(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${activeTournament}.${ext}`;
      const formData = new FormData();
      formData.append('file', file);
      const publicUrl = await uploadFileBypassingRLS(formData, 'tournament-logos', path);
      await updateTournamentLogo(activeTournament, publicUrl + `?t=${Date.now()}`);
      showToast('Tournament logo updated.', 'success');
      router.refresh();
    } catch (err: any) {
      showToast(parseError(err), 'error');
    } finally {
      setUploadingTourney(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Tournament selector ── */}
      <div className="surface-elevated rounded-xl border border-flag-gold/40 p-6 shadow-[0_0_15px_rgba(212,160,23,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm text-white font-bold uppercase tracking-widest">
            Active Tournament Rosters
          </h2>
          {activeTournament && (
            <span className="text-xs font-mono text-silver-400">
              {teamsInActiveTournament.length} Teams
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor="tourney-logo-upload"
            className="relative cursor-pointer group shrink-0"
            title="Click to upload tournament logo"
          >
            <div className="w-10 h-10 rounded border border-white/10 bg-[#111827] flex items-center justify-center overflow-hidden group-hover:border-flag-gold/50 transition-colors">
              {uploadingTourney ? (
                <span className="text-[9px] text-mute font-mono">...</span>
              ) : tournaments.find((t) => t.id === activeTournament)?.logo_url ? (
                <img
                  src={tournaments.find((t) => t.id === activeTournament)?.logo_url!}
                  alt="Tournament Logo"
                  className="w-full h-full object-cover bg-[#111827]"
                />
              ) : (
                <span className="text-[9px] text-mute font-mono group-hover:text-silver-300 transition-colors">
                  LOGO
                </span>
              )}
            </div>
            <input
              id="tourney-logo-upload"
              type="file"
              accept="image/*"
              onChange={handleTourneyLogoUpload}
              disabled={uploadingTourney || !activeTournament}
              className="sr-only"
            />
          </label>
          <select
            value={activeTournament}
            onChange={(e) => {
              setActiveTournament(e.target.value);
              setSelectedSourceId('');
              setImportSearch('');
            }}
            className="input-field py-2 flex-1"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.status})
              </option>
            ))}
            {tournaments.length === 0 && <option value="">No tournaments found</option>}
          </select>
        </div>
      </div>

      {/* ── Add Team panel ── */}
      {activeTournament && (
        <div className="surface-elevated rounded-xl border border-white/10 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-white/10">
            <button
              type="button"
              onClick={() => setAddMode('existing')}
              className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${
                addMode === 'existing'
                  ? 'text-flag-gold border-b-2 border-flag-gold bg-flag-gold/5'
                  : 'text-silver-500 hover:text-silver-300'
              }`}
            >
              Use Existing Team
            </button>
            <button
              type="button"
              onClick={() => setAddMode('new')}
              className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${
                addMode === 'new'
                  ? 'text-flag-gold border-b-2 border-flag-gold bg-flag-gold/5'
                  : 'text-silver-500 hover:text-silver-300'
              }`}
            >
              Create New Team
            </button>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {addMode === 'existing' ? (
              <div className="space-y-4">
                <p className="text-xs text-silver-500 font-mono">
                  Pick a team from a previous tournament — name and logo are copied automatically. Just edit the lineup after.
                </p>

                {importCandidates.length === 0 ? (
                  <p className="text-xs text-silver-600 font-mono italic">
                    No importable teams found. All existing teams are already in this tournament, or none have been created yet.
                  </p>
                ) : (
                  <>
                    {/* Search input */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search existing teams…"
                        value={importSearch}
                        onChange={(e) => {
                          setImportSearch(e.target.value);
                          if (selectedSourceId) setSelectedSourceId('');
                        }}
                        className="input-field w-full"
                      />
                      {selectedSourceId && (
                        <button
                          type="button"
                          onClick={() => { setSelectedSourceId(''); setImportSearch(''); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-silver-500 hover:text-white text-xs font-mono"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Dropdown results */}
                    {showDropdown && filteredImportCandidates.length > 0 && (
                      <div className="border border-white/10 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                        {filteredImportCandidates.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedSourceId(t.id);
                              setImportSearch(t.name);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 border-b border-white/5 last:border-0 text-left hover:bg-white/5 transition-colors"
                          >
                            <div className="w-6 h-6 rounded bg-[#111827] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                              {t.logo_url ? (
                                <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[7px] font-mono text-silver-600">
                                  {(t.short_name ?? t.name).slice(0, 3).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{t.name}</p>
                              <p className="text-[10px] font-mono text-silver-600 truncate">
                                from {t.tournamentName}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {showDropdown && filteredImportCandidates.length === 0 && (
                      <p className="text-xs text-silver-600 font-mono italic">No teams match your search.</p>
                    )}

                    {/* Selected team preview */}
                    {selectedSourceTeam && (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-flag-gold/40 bg-flag-gold/5">
                        <div className="w-9 h-9 rounded bg-[#111827] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          {selectedSourceTeam.logo_url ? (
                            <img
                              src={selectedSourceTeam.logo_url}
                              alt={selectedSourceTeam.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] font-mono text-silver-600">
                              {(selectedSourceTeam.short_name ?? selectedSourceTeam.name).slice(0, 3).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white font-display tracking-widest">
                            {selectedSourceTeam.name}
                          </p>
                          <p className="text-[10px] font-mono text-silver-500">
                            Previously in: {selectedSourceTeam.tournamentName}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-flag-gold shrink-0">✓</span>
                      </div>
                    )}

                    {/* Copy roster toggle */}
                    {selectedSourceId && (
                      <label className="flex items-center gap-3 cursor-pointer select-none group">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={copyRoster}
                          onClick={() => setCopyRoster(!copyRoster)}
                          className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${
                            copyRoster ? 'bg-flag-gold' : 'bg-white/10'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                              copyRoster ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="text-xs font-mono text-silver-400 group-hover:text-silver-200 transition-colors">
                          Copy last roster (players still editable after import)
                        </span>
                      </label>
                    )}

                    {/* Action button */}
                    <button
                      type="button"
                      onClick={handleImportTeam}
                      disabled={busy || !selectedSourceId}
                      className="btn-primary w-full"
                    >
                      {busy ? 'IMPORTING…' : 'ADD TO TOURNAMENT'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-silver-500 font-mono">
                  Create a brand-new team for this tournament.
                </p>
                <form className="flex gap-3" onSubmit={handleCreateTeam}>
                  <input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Enter team name"
                    className="input-field flex-1"
                  />
                  <button
                    type="submit"
                    disabled={busy || !newTeamName.trim()}
                    className="btn-primary whitespace-nowrap"
                  >
                    {busy ? 'CREATING…' : 'CREATE TEAM'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Team roster cards ── */}
      {activeTournament ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <input
              type="text"
              placeholder="Search teams..."
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
              className="input-field w-full md:w-1/3"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {teamsInActiveTournament.length === 0 && (
              <p className="text-silver-600 text-sm col-span-2">
                No teams yet. Use the panel above to add teams.
              </p>
            )}
            {teamsInActiveTournament
              .filter((t) => t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()))
              .map((team) => {
                const teamRosterIds = rosters
                  .filter((r) => r.tournament_id === activeTournament && r.team_id === team.id)
                  .map((r) => r.player_id);
                const teamRoster = players.filter((p) => teamRosterIds.includes(p.id));
                const tournamentRosterIds = rosters
                  .filter((r) => r.tournament_id === activeTournament)
                  .map((r) => r.player_id);
                const unassignedPlayers = players.filter(
                  (p) => !tournamentRosterIds.includes(p.id),
                );

                return (
                  <TeamCard
                    key={team.id}
                    team={team}
                    roster={teamRoster}
                    tournamentId={activeTournament}
                    unassignedPlayers={unassignedPlayers}
                  />
                );
              })}
          </div>
        </div>
      ) : (
        <p className="text-silver-600 text-sm">
          Please create a tournament first to manage rosters.
        </p>
      )}
    </div>
  );
}

// ── TeamCard ──────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  roster,
  tournamentId,
  unassignedPlayers,
}: {
  team: Team;
  roster: Player[];
  tournamentId: string;
  unassignedPlayers: Player[];
}) {
  const router = useRouter();
  const { showConfirm, showToast } = useNotification();
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(team.logo_url ?? '');

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(team.name);

  async function handleSaveName() {
    if (!editName.trim() || editName === team.name) {
      setIsEditingName(false);
      setEditName(team.name);
      return;
    }
    setBusy(true);
    try {
      await updateTeamName(team.id, editName.trim());
      showToast('Team name updated.', 'success');
      setIsEditingName(false);
      router.refresh();
    } catch (e: any) {
      showToast(parseError(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddExistingPlayer() {
    if (!searchQuery) return;
    const player = unassignedPlayers.find((p) => p.gamertag === searchQuery);
    if (!player) return;

    setBusy(true);
    try {
      await assignPlayerToTournamentTeam({ tournamentId, teamId: team.id, playerId: player.id });
      showToast(`${player.gamertag} added to ${team.name}.`, 'success');
      setSearchQuery('');
      router.refresh();
    } catch (e: any) {
      showToast(parseError(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemovePlayer(playerId: string) {
    try {
      await removePlayerFromTournamentTeam({ tournamentId, playerId });
      showToast('Player removed from team.', 'info');
      router.refresh();
    } catch (e: any) {
      showToast(parseError(e), 'error');
    }
  }

  async function handleDeleteTeam() {
    const confirmed = await showConfirm(
      'Delete Team',
      `Delete ${team.name}? This removes it from this tournament only.`,
    );
    if (!confirmed) return;

    try {
      await deleteTeam(team.id);
      showToast('Team deleted.', 'success');
      router.refresh();
    } catch (e: any) {
      showToast(parseError(e), 'error');
    }
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
      const path = `${team.id}.${ext}`;
      const formData = new FormData();
      formData.append('file', file);
      const publicUrl = await uploadFileBypassingRLS(formData, 'team-logos', path);
      const cacheBustedUrl = publicUrl + `?t=${Date.now()}`;
      await updateTeamLogo(team.id, cacheBustedUrl);
      setLogoUrl(cacheBustedUrl);
      showToast('Team logo updated.', 'success');
      router.refresh();
    } catch (err: any) {
      showToast(parseError(err), 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="surface-elevated rounded-xl border border-white/10 p-6 flex flex-col">
      {/* Team header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <label
            htmlFor={`logo-upload-${team.id}`}
            className="relative cursor-pointer group"
            title="Click to upload logo"
          >
            <div className="w-10 h-10 rounded-lg bg-[#111827] border border-white/10 group-hover:border-white/40 transition-colors overflow-hidden flex items-center justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-mono text-silver-500 group-hover:text-silver-300 transition-colors">
                  {uploading ? '…' : 'LOGO'}
                </span>
              )}
            </div>
            <input
              id={`logo-upload-${team.id}`}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="sr-only"
            />
          </label>
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-[#1f2937] border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-flag-gold/50"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setIsEditingName(false);
                      setEditName(team.name);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={busy}
                  className="text-[10px] text-flag-gold hover:text-flag-gold/70 font-mono uppercase tracking-widest"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditName(team.name);
                  }}
                  disabled={busy}
                  className="text-[10px] text-silver-500 hover:text-white font-mono uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/name cursor-pointer" onClick={() => setIsEditingName(true)}>
                <p className="text-base text-white font-display tracking-widest">{team.name}</p>
                <button type="button" className="opacity-0 group-hover/name:opacity-100 text-silver-500 hover:text-white transition-opacity">
                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                   </svg>
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDeleteTeam}
          className="text-xs text-white font-bold hover:text-silver-300 transition-colors font-mono"
        >
          DELETE TEAM
        </button>
      </div>

      {/* Roster list */}
      <div className="space-y-1 mb-4 flex-1">
        {roster.length === 0 && (
          <p className="text-silver-600 text-xs font-mono">
            No players registered for this tournament.
          </p>
        )}
        {roster.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm group py-1">
            <span className="text-white font-bold">{p.gamertag}</span>
            <button
              type="button"
              onClick={() => handleRemovePlayer(p.id)}
              className="text-[10px] text-silver-700 hover:text-crimson-400 opacity-0 group-hover:opacity-100 transition-all font-mono uppercase tracking-widest"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Add player */}
      <div className="pt-3 border-t border-white/10">
        <span className="text-[10px] font-mono text-white font-bold uppercase tracking-widest block mb-2">
          Register Player
        </span>
        <div className="flex gap-2">
          <input
            list={`players-${team.id}`}
            placeholder="Type to search player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-[#1f2937] border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-flag-red"
          />
          <datalist id={`players-${team.id}`}>
            {unassignedPlayers.map((p) => (
              <option key={p.id} value={p.gamertag} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={handleAddExistingPlayer}
            disabled={busy || !searchQuery}
            className="btn-secondary text-xs px-3 py-1"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}

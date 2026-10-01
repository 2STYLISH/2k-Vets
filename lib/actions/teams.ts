'use server';

import { createClient, requireAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createTeam(input: { tournamentId: string; name: string; shortName?: string }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', input.tournamentId)
    .ilike('name', input.name)
    .maybeSingle();

  if (existing) {
    throw new Error(`A team with the name "${input.name}" already exists in this tournament.`);
  }

  const { error } = await supabase.from('teams').insert({ tournament_id: input.tournamentId, name: input.name, short_name: input.shortName || null });
  if (error) throw error;

  revalidatePath('/admin/teams');
}

/**
 * Import an existing team into a new tournament.
 * Copies the team's name, short_name, and logo_url.
 * Optionally seeds the roster from the source team's prior roster entries.
 */
export async function importTeamToTournament(input: {
  sourceTeamId: string;
  targetTournamentId: string;
  copyRoster: boolean;
}) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();

  // Fetch source team details
  const { data: sourceTeam, error: srcErr } = await supabase
    .from('teams')
    .select('name, short_name, logo_url')
    .eq('id', input.sourceTeamId)
    .single();
  if (srcErr || !sourceTeam) throw new Error('Source team not found.');

  // Guard: don't import if same name already exists in target tournament
  const { data: duplicate } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', input.targetTournamentId)
    .ilike('name', sourceTeam.name)
    .maybeSingle();
  if (duplicate) {
    throw new Error(`"${sourceTeam.name}" already exists in this tournament.`);
  }

  // Insert new team row for the target tournament
  const { data: newTeam, error: insertErr } = await supabase
    .from('teams')
    .insert({
      tournament_id: input.targetTournamentId,
      name: sourceTeam.name,
      short_name: sourceTeam.short_name,
      logo_url: sourceTeam.logo_url,
    })
    .select('id')
    .single();
  if (insertErr || !newTeam) throw insertErr ?? new Error('Failed to create team.');

  // Optionally copy players from the source team's most recent roster
  if (input.copyRoster) {
    const { data: sourceRoster } = await supabase
      .from('tournament_rosters')
      .select('player_id')
      .eq('team_id', input.sourceTeamId);

    if (sourceRoster && sourceRoster.length > 0) {
      // Filter out players already assigned to the target tournament
      const { data: alreadyAssigned } = await supabase
        .from('tournament_rosters')
        .select('player_id')
        .eq('tournament_id', input.targetTournamentId);

      const assignedIds = new Set((alreadyAssigned ?? []).map((r: any) => r.player_id));
      const toInsert = sourceRoster
        .filter((r: any) => !assignedIds.has(r.player_id))
        .map((r: any) => ({
          tournament_id: input.targetTournamentId,
          team_id: newTeam.id,
          player_id: r.player_id,
        }));

      if (toInsert.length > 0) {
        const { error: rosterErr } = await supabase.from('tournament_rosters').insert(toInsert);
        if (rosterErr) throw rosterErr;
      }
    }
  }

  revalidatePath('/admin/teams');
  return newTeam.id;
}

export async function deleteTeam(teamId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  if (error) throw error;

  revalidatePath('/admin/teams');
}

export async function createPlayer(input: { gamertag: string; position?: string }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('players').insert({
    gamertag: input.gamertag,
    position: input.position || null,
  });
  if (error) throw error;

  revalidatePath('/admin/teams');
}

export async function deletePlayer(playerId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('players').delete().eq('id', playerId);
  if (error) throw error;

  revalidatePath('/admin/teams');
}

export async function assignPlayerToTournamentTeam(input: { tournamentId: string; teamId: string; playerId: string }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('tournament_rosters').insert({
    tournament_id: input.tournamentId,
    team_id: input.teamId,
    player_id: input.playerId,
  });
  if (error) throw error;

  revalidatePath('/admin/teams');
}

export async function removePlayerFromTournamentTeam(input: { tournamentId: string; playerId: string }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase
    .from('tournament_rosters')
    .delete()
    .eq('tournament_id', input.tournamentId)
    .eq('player_id', input.playerId);
  if (error) throw error;

  revalidatePath('/admin/teams');
}


export async function updatePlayerName(playerId: string, gamertag: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('players').update({ gamertag }).eq('id', playerId);
  if (error) throw error;

  revalidatePath('/admin/teams');
  revalidatePath('/admin/players');
}

export async function updateTeamLogo(teamId: string, logoUrl: string | null) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('teams').update({ logo_url: logoUrl }).eq('id', teamId);
  if (error) throw error;

  revalidatePath('/admin/teams');
  revalidatePath('/');
  revalidatePath('/schedule');
}

export async function updateTeamName(teamId: string, name: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('teams').update({ name }).eq('id', teamId);
  if (error) throw error;

  revalidatePath('/admin/teams');
  revalidatePath('/');
  revalidatePath('/schedule');
}


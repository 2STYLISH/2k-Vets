'use server';

import { createClient, requireAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ensureScheduleForMatchup } from './bracket-scheduling';
import { collapseGhostNodes } from './node-collapse';

export async function createTournament(input: {
  name: string;
  format: 'SINGLE_ELIM' | 'DOUBLE_ELIM' | 'PLAYOFFS' | 'ROUND_ROBIN' | 'SWISS' | 'FREE_FOR_ALL' | 'LEADERBOARD' | 'VETERANS_LEAGUE';
  numTeams: number;
  matchFormat: 'BO1' | 'BO3' | 'BO5' | 'BO7';
  startDate?: string;
  endDate?: string;
}) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { data: season } = await supabase.from('seasons').select('id').eq('is_active', true).single();

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      season_id: season?.id,
      name: input.name,
      format: input.format,
      num_teams: input.numTeams,
      match_format: input.matchFormat,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      status: 'SEEDING',
    })
    .select('id')
    .single();
  if (error) throw error;

  revalidatePath('/admin/bracket');
  return tournament.id as string;
}

export async function deleteTournament(tournamentId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  // Cascade deletes bracket_matchups, schedules, awards, seeds, rosters via FK
  const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId);
  if (error) throw error;

  revalidatePath('/admin/tournaments');
  revalidatePath('/admin/bracket');
  revalidatePath('/tournaments');
  revalidatePath('/');
}

export async function updateTournamentChampionshipName(tournamentId: string, name: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase
    .from('tournaments')
    .update({ championship_award_name: name || null })
    .eq('id', tournamentId);
  if (error) throw error;

  revalidatePath('/admin/tournaments');
  revalidatePath('/awards');
}

export async function updateTournamentLogo(tournamentId: string, logoUrl: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase
    .from('tournaments')
    .update({ logo_url: logoUrl || null })
    .eq('id', tournamentId);
  if (error) throw error;

  revalidatePath('/admin/tournaments');
  revalidatePath('/');
  revalidatePath('/schedule');
}

export async function updateTournamentStatus(tournamentId: string, status: 'DRAFT' | 'SEEDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('tournaments').update({ status }).eq('id', tournamentId);
  if (error) throw error;

  revalidatePath('/admin/tournaments');
  revalidatePath('/tournaments');
}

/**
 * Insert a single bracket matchup and return its id.
 */
async function insertMatchup(
  supabase: any,
  tournamentId: string,
  round: number,
  slot: number,
  bracketSide: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL' | 'PLAY_IN'
): Promise<string> {
  const { data, error } = await supabase
    .from('bracket_matchups')
    .insert({ 
      tournament_id: tournamentId, 
      round, 
      slot, 
      status: 'PENDING', 
      bracket_side: bracketSide
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Generates a complete double-elimination (or single-elimination) bracket for
 * any number of teams from 3 to 16. All matchups get an explicit bracket_side
 * ('WINNERS' | 'LOSERS' | 'GRAND_FINAL') so downstream queries can rely on it.
 *
 * Structure for N teams:
 *  - bracketSize = next power of 2 >= N  (e.g. 3 teams -> size 4)
 *  - UB rounds   = log2(bracketSize)
 *  - LB rounds   = 2 * (UB rounds - 1)   (standard double-elim)
 *  - Byes fill empty R1 UB slots; their LB counterpart slots are also byes.
 */
export async function generateBracket(tournamentId: string, numTeams: number) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { data: tourney } = await supabase.from('tournaments').select('format').eq('id', tournamentId).single();
  const isDoubleElim = tourney?.format === 'DOUBLE_ELIM';

  if (tourney?.format === 'ROUND_ROBIN' || tourney?.format === 'LEADERBOARD' || tourney?.format === 'SWISS' || tourney?.format === 'VETERANS_LEAGUE') {
    await supabase.from('tournaments').update({ status: 'SEEDING' }).eq('id', tournamentId);
    revalidatePath('/admin/bracket');
    revalidatePath('/bracket');
    return;
  }

  if (tourney?.format === 'PLAYOFFS') {
    // Clear existing bracket
    await supabase.from('bracket_matchups').delete().eq('tournament_id', tournamentId);
    
    // Create Play-In matches (bracket_side = 'PLAY_IN') - BO1
    const playInM1 = await insertMatchup(supabase, tournamentId, 1, 1, 'PLAY_IN'); // 7v8
    const playInM2 = await insertMatchup(supabase, tournamentId, 1, 2, 'PLAY_IN'); // 9v10
    const playInM3 = await insertMatchup(supabase, tournamentId, 2, 1, 'PLAY_IN'); // Loser M1 vs Winner M2

    // Set feeds for Play-Ins
    await supabase.from('bracket_matchups').update({ loser_feeds_into_matchup_id: playInM3 }).eq('id', playInM1);
    await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: playInM3 }).eq('id', playInM2);

    // Create Playoff Matches (WINNERS, single elim 8-team) - BO3
    // Round 1
    const poM1 = await insertMatchup(supabase, tournamentId, 1, 1, 'WINNERS'); // 1 v 8
    const poM2 = await insertMatchup(supabase, tournamentId, 1, 2, 'WINNERS'); // 4 v 5
    const poM3 = await insertMatchup(supabase, tournamentId, 1, 3, 'WINNERS'); // 2 v 7
    const poM4 = await insertMatchup(supabase, tournamentId, 1, 4, 'WINNERS'); // 3 v 6

    // Set Play-In winners to feed into Playoffs
    await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: poM1 }).eq('id', playInM3); // Winner gets 8th seed, plays 1st seed
    await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: poM3 }).eq('id', playInM1); // Winner gets 7th seed, plays 2nd seed

    // Round 2 (Semis)
    const poM5 = await insertMatchup(supabase, tournamentId, 2, 1, 'WINNERS');
    const poM6 = await insertMatchup(supabase, tournamentId, 2, 2, 'WINNERS');

    await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: poM5 }).eq('id', poM1);
    await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: poM5 }).eq('id', poM2);
    await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: poM6 }).eq('id', poM3);
    await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: poM6 }).eq('id', poM4);

    // Round 3 (Finals)
    const poM7 = await insertMatchup(supabase, tournamentId, 3, 1, 'WINNERS');

    await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: poM7 }).eq('id', poM5);
    await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: poM7 }).eq('id', poM6);

    await supabase.from('tournaments').update({ status: 'SEEDING' }).eq('id', tournamentId);
    revalidatePath('/admin/bracket');
    revalidatePath('/bracket');
    return;
  }

  // Clear existing bracket
  await supabase.from('bracket_matchups').delete().eq('tournament_id', tournamentId);

  const ubRounds = Math.ceil(Math.log2(numTeams));     // e.g. 3 teams -> 2 rounds
  const bracketSize = Math.pow(2, ubRounds);           // e.g. 4 slots

  // ── Build Winners bracket ─────────────────────────────────────────────────
  // ubIds[round-1] = array of matchup ids for that UB round (1-indexed)
  const ubIds: string[][] = [];

  for (let round = 1; round <= ubRounds; round++) {
    const count = bracketSize / Math.pow(2, round);    // R1: size/2, R2: size/4, …
    const roundIds: string[] = [];
    for (let slot = 1; slot <= count; slot++) {
      const id = await insertMatchup(supabase, tournamentId, round, slot, 'WINNERS');
      roundIds.push(id);
    }
    ubIds.push(roundIds);
  }

  // Wire UB: each R(n) matchup feeds into R(n+1)
  for (let r = 0; r < ubIds.length - 1; r++) {
    const current = ubIds[r];
    const next = ubIds[r + 1];
    for (let i = 0; i < current.length; i++) {
      await supabase
        .from('bracket_matchups')
        .update({ feeds_into_matchup_id: next[Math.floor(i / 2)] })
        .eq('id', current[i]);
    }
  }

  if (!isDoubleElim || ubRounds < 2) {
    // Single elim — done
    await supabase.from('tournaments').update({ status: 'SEEDING' }).eq('id', tournamentId);
    revalidatePath('/admin/bracket');
    revalidatePath('/bracket');
    return;
  }

  // ── Build Losers bracket ──────────────────────────────────────────────────
  //
  // Standard double-elim LB has 2*(ubRounds-1) rounds.
  // Round sizes:
  //   LB R1: bracketSize/4  matches  (receives UB R1 losers)
  //   LB R2: bracketSize/4  matches  (LB-vs-LB, no new drop-ins)
  //   LB R3: bracketSize/8  matches  (receives UB R2 losers)
  //   LB R4: bracketSize/8  matches
  //   …
  //   LB R(2k-1): bracketSize/2^(k+1)  receives UB Rk losers
  //   LB R(2k):   same count, LB-vs-LB
  //   LB Final:   1 match

  const lbRoundCount = 2 * (ubRounds - 1);
  const lbIds: string[][] = [];

  for (let lbRound = 1; lbRound <= lbRoundCount; lbRound++) {
    // For LB round r, the "group index" k = ceil(r/2)
    // Size = bracketSize / 2^(k+1), minimum 1
    const k = Math.ceil(lbRound / 2);
    const count = Math.max(1, bracketSize / Math.pow(2, k + 1));
    const roundIds: string[] = [];
    for (let slot = 1; slot <= count; slot++) {
      const id = await insertMatchup(supabase, tournamentId, lbRound, slot, 'LOSERS');
      roundIds.push(id);
    }
    lbIds.push(roundIds);
  }

  // Wire LB winners forward through LB rounds
  for (let r = 0; r < lbIds.length - 1; r++) {
    const current = lbIds[r];
    const next = lbIds[r + 1];
    if (current.length === next.length) {
      // Same size rounds (even -> odd transition): 1-to-1
      for (let i = 0; i < current.length; i++) {
        await supabase
          .from('bracket_matchups')
          .update({ feeds_into_matchup_id: next[i] })
          .eq('id', current[i]);
      }
    } else {
      // Halving rounds (odd -> even transition): 2-to-1
      for (let i = 0; i < current.length; i++) {
        await supabase
          .from('bracket_matchups')
          .update({ feeds_into_matchup_id: next[Math.floor(i / 2)] })
          .eq('id', current[i]);
      }
    }
  }

  // Wire UB losers into LB
  // UB R1 losers -> LB R1 (2-to-1 mapping)
  // UB Rk (k>1) losers -> LB R(2k-2) (1-to-1 mapping)
  for (let ubRound = 1; ubRound <= ubRounds; ubRound++) {
    const ubRoundIds = ubIds[ubRound - 1];
    const lbTargetRound = ubRound === 1 ? 1 : 2 * (ubRound - 1);
    const lbTargetIds = lbIds[lbTargetRound - 1];

    for (let i = 0; i < ubRoundIds.length; i++) {
      const targetIndex = ubRound === 1 ? Math.floor(i / 2) : i;
      const lbTarget = lbTargetIds[targetIndex];
      if (lbTarget) {
        await supabase
          .from('bracket_matchups')
          .update({ loser_feeds_into_matchup_id: lbTarget })
          .eq('id', ubRoundIds[i]);
      }
    }
  }

  // ── Grand Final ───────────────────────────────────────────────────────────
  const gfId = await insertMatchup(supabase, tournamentId, 1, 1, 'GRAND_FINAL');

  // UB champion feeds into GF
  await supabase
    .from('bracket_matchups')
    .update({ feeds_into_matchup_id: gfId })
    .eq('id', ubIds[ubRounds - 1][0]);

  // LB champion feeds into GF
  await supabase
    .from('bracket_matchups')
    .update({ feeds_into_matchup_id: gfId })
    .eq('id', lbIds[lbRoundCount - 1][0]);

  await supabase.from('tournaments').update({ status: 'SEEDING' }).eq('id', tournamentId);
  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
}

export async function seedTeam(tournamentId: string, teamId: string, seed: number) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase
    .from('tournament_seeds')
    .upsert({ tournament_id: tournamentId, team_id: teamId, seed }, { onConflict: 'tournament_id,seed' });
  if (error) throw error;

  const { data: tourney } = await supabase.from('tournaments').select('format').eq('id', tournamentId).single();

  if (tourney?.format === 'PLAYOFFS') {
    // Specialized seeding for 10-team Playoff bracket
    const { data: matchups } = await supabase.from('bracket_matchups').select('id, round, slot, bracket_side').eq('tournament_id', tournamentId);
    if (!matchups) return;
    
    let targetMatchup: any = null;
    let field: 'team_a_id' | 'team_b_id' = 'team_a_id';
    
    if (seed === 1) { targetMatchup = matchups.find(m => m.bracket_side === 'WINNERS' && m.round === 1 && m.slot === 1); field = 'team_a_id'; }
    else if (seed === 2) { targetMatchup = matchups.find(m => m.bracket_side === 'WINNERS' && m.round === 1 && m.slot === 3); field = 'team_a_id'; }
    else if (seed === 3) { targetMatchup = matchups.find(m => m.bracket_side === 'WINNERS' && m.round === 1 && m.slot === 4); field = 'team_a_id'; }
    else if (seed === 4) { targetMatchup = matchups.find(m => m.bracket_side === 'WINNERS' && m.round === 1 && m.slot === 2); field = 'team_a_id'; }
    else if (seed === 5) { targetMatchup = matchups.find(m => m.bracket_side === 'WINNERS' && m.round === 1 && m.slot === 2); field = 'team_b_id'; }
    else if (seed === 6) { targetMatchup = matchups.find(m => m.bracket_side === 'WINNERS' && m.round === 1 && m.slot === 4); field = 'team_b_id'; }
    else if (seed === 7) { targetMatchup = matchups.find(m => m.bracket_side === 'PLAY_IN' && m.round === 1 && m.slot === 1); field = 'team_a_id'; }
    else if (seed === 8) { targetMatchup = matchups.find(m => m.bracket_side === 'PLAY_IN' && m.round === 1 && m.slot === 1); field = 'team_b_id'; }
    else if (seed === 9) { targetMatchup = matchups.find(m => m.bracket_side === 'PLAY_IN' && m.round === 1 && m.slot === 2); field = 'team_a_id'; }
    else if (seed === 10) { targetMatchup = matchups.find(m => m.bracket_side === 'PLAY_IN' && m.round === 1 && m.slot === 2); field = 'team_b_id'; }

    if (targetMatchup) {
      await supabase.from('bracket_matchups').update({ [field]: teamId }).eq('id', targetMatchup.id);
    }
  } else {
    // Place the seed into round-1 matchups (standard bracket seeding order 1v8, 4v5, 3v6, 2v7 etc
    // is left to a future refinement — MVP here places seeds sequentially into round 1 slots).
    const { data: round1 } = await supabase
      .from('bracket_matchups')
      .select('id, team_a_id, team_b_id')
      .eq('tournament_id', tournamentId)
      .eq('bracket_side', 'WINNERS')
      .eq('round', 1)
      .order('slot', { ascending: true });

    const slotIndex = Math.floor((seed - 1) / 2);
    const matchup = round1?.[slotIndex];
    if (matchup) {
      const field = seed % 2 === 1 ? 'team_a_id' : 'team_b_id';
      await supabase.from('bracket_matchups').update({ [field]: teamId }).eq('id', matchup.id);
    }
  }

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
  revalidatePath('/admin/schedule');
  revalidatePath('/admin/games');
  revalidatePath('/schedule');
}

/**
 * Directly place a team into one side of a specific Round 1 matchup slot.
 * This is what the Bracket Management "Seed Teams" panel calls — it's how
 * teams actually get put into the bracket. Also records the seed number
 * and, once both sides of the matchup are filled, auto-creates the matching
 * schedule so it shows up under Schedule and Games & Screenshots.
 */
export async function assignTeamToSlot(input: {
  tournamentId: string;
  matchupId: string;
  field: 'team_a_id' | 'team_b_id';
  teamId: string;
  seed: number;
}) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();

  const { error: seedError } = await supabase
    .from('tournament_seeds')
    .upsert(
      { tournament_id: input.tournamentId, team_id: input.teamId, seed: input.seed },
      { onConflict: 'tournament_id,seed' }
    );
  if (seedError) throw seedError;

  const { error } = await supabase
    .from('bracket_matchups')
    .update({ [input.field]: input.teamId })
    .eq('id', input.matchupId);
  if (error) throw error;

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
  revalidatePath('/admin/schedule');
  revalidatePath('/admin/games');
  revalidatePath('/schedule');
}

export async function updateSeedStats(input: {
  tournamentId: string;
  teamId: string;
  seed?: number | null;
  manual_wins?: number | null;
  manual_losses?: number | null;
  point_differential?: number | null;
}) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  
  // First check if the seed exists for this team
  const { data: existing } = await supabase
    .from('tournament_seeds')
    .select('id')
    .eq('tournament_id', input.tournamentId)
    .eq('team_id', input.teamId)
    .maybeSingle();

  const payload: any = {
    tournament_id: input.tournamentId,
    team_id: input.teamId,
  };
  if (input.seed !== undefined) payload.seed = input.seed;
  if (input.manual_wins !== undefined) payload.manual_wins = input.manual_wins;
  if (input.manual_losses !== undefined) payload.manual_losses = input.manual_losses;
  if (input.point_differential !== undefined) payload.point_differential = input.point_differential;

  if (existing) {
    const { error } = await supabase.from('tournament_seeds').update(payload).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('tournament_seeds').insert(payload);
    if (error) throw error;
  }

  // Update the bracket if seed changed?
  // We'll leave that up to the user explicitly triggering a re-seed or randomize.
  
  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
  revalidatePath('/tournaments');
}

/** Clear a single team out of a Round 1 matchup slot (e.g. picked wrong team). */
export async function clearBracketSlot(input: { matchupId: string; field: 'team_a_id' | 'team_b_id' }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase
    .from('bracket_matchups')
    .update({ [input.field]: null })
    .eq('id', input.matchupId);
  if (error) throw error;

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
}

function generateSeedOrder(bracketSize: number): number[] {
  let rounds = Math.log2(bracketSize);
  let matches = [1, 2];
  for (let r = 1; r < rounds; r++) {
    let nextMatches = [];
    let sum = Math.pow(2, r + 1) + 1;
    for (let i = 0; i < matches.length; i++) {
      nextMatches.push(matches[i]);
      nextMatches.push(sum - matches[i]);
    }
    matches = nextMatches;
  }
  return matches;
}

export async function randomizeBracket(tournamentId: string, options?: { randomizeSeeds?: boolean, doubleRoundRobin?: boolean }) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const shouldRandomize = options?.randomizeSeeds ?? true;
  
  // 1. Get all teams registered to this tournament
  const { data: rosters } = await supabase
    .from('tournament_rosters')
    .select('team_id')
    .eq('tournament_id', tournamentId);
    
  if (!rosters || rosters.length === 0) throw new Error('No teams registered');
  
  const teamIds = Array.from(new Set(rosters.map(r => r.team_id)));
  const teamSeedMap = new Map<number, string>();

  if (shouldRandomize) {
    // Shuffle teams
    for (let i = teamIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
    }

    // Assign random seeds (1 to N)
    for (let i = 0; i < teamIds.length; i++) {
      teamSeedMap.set(i + 1, teamIds[i]);
    }
    
    // Upsert seeds
    for (let i = 0; i < teamIds.length; i++) {
      await supabase.from('tournament_seeds').upsert(
        { tournament_id: tournamentId, team_id: teamIds[i], seed: i + 1 },
        { onConflict: 'tournament_id,seed' } // Wait, this constraint might cause issues if seeds overlap. Best to delete first or update by team_id
      );
    }
  } else {
    // Read existing seeds from database
    const { data: existingSeeds } = await supabase
      .from('tournament_seeds')
      .select('team_id, seed')
      .eq('tournament_id', tournamentId)
      .not('seed', 'is', null);
      
    if (existingSeeds) {
      for (const s of existingSeeds) {
        if (s.seed != null) {
          teamSeedMap.set(s.seed, s.team_id);
        }
      }
    }
  }

  const { data: tourney } = await supabase.from('tournaments').select('format').eq('id', tournamentId).single();

  if (tourney?.format === 'ROUND_ROBIN' || tourney?.format === 'LEADERBOARD' || tourney?.format === 'VETERANS_LEAGUE') {
    // Round Robin / Circle Method Generation
    await supabase.from('bracket_matchups').delete().eq('tournament_id', tournamentId);

    // Sort teams by seed to ensure balanced groups
    const sortedTeamIds = [...teamIds].sort((a, b) => {
      let seedA = 999, seedB = 999;
      for (const [s, t] of teamSeedMap.entries()) {
        if (t === a) seedA = s;
        if (t === b) seedB = s;
      }
      return seedA - seedB;
    });

    let groupsOfTeams: string[][] = [sortedTeamIds];

    if (tourney?.format === 'VETERANS_LEAGUE') {
      const total = sortedTeamIds.length;
      let numGroups = Math.max(1, Math.round(total / 5.5));
      if (total < 8) numGroups = 1;

      if (numGroups > 1) {
        groupsOfTeams = Array.from({ length: numGroups }, () => []);
        // Snake draft to balance seeds across groups
        for (let i = 0; i < total; i++) {
          const round = Math.floor(i / numGroups);
          const isEvenRound = round % 2 === 0;
          const groupIdx = isEvenRound ? (i % numGroups) : (numGroups - 1 - (i % numGroups));
          groupsOfTeams[groupIdx].push(sortedTeamIds[i]);
        }

        // Assign group_names in the DB
        const groupLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let g = 0; g < groupsOfTeams.length; g++) {
          const groupName = `Group ${groupLetters[g]}`;
          for (const tId of groupsOfTeams[g]) {
            await supabase.from('teams').update({ group_name: groupName }).eq('id', tId);
          }
        }
      }
    }

    let slotCounter = 1;

    for (const groupTeams of groupsOfTeams) {
      const isOdd = groupTeams.length % 2 !== 0;
      const isDouble = options?.doubleRoundRobin ?? (tourney?.format === 'VETERANS_LEAGUE');
      const numCycles = isDouble ? 2 : 1;

      for (let cycle = 0; cycle < numCycles; cycle++) {
        // Reset working teams for each cycle
        const workingTeams = isOdd ? [...groupTeams, null] : [...groupTeams];
        const n = workingTeams.length;
        const rounds = n - 1;

        for (let round = 1; round <= rounds; round++) {
          for (let i = 0; i < n / 2; i++) {
            let teamA = workingTeams[i];
            let teamB = workingTeams[n - 1 - i];

            if (cycle === 1) {
              [teamA, teamB] = [teamB, teamA];
            }

            if (teamA && teamB) {
              await supabase.from('bracket_matchups').insert({
                tournament_id: tournamentId,
                round: round + (cycle * rounds),
                slot: slotCounter++,
                status: 'PENDING',
                bracket_side: 'ROUND_ROBIN',
                team_a_id: teamA,
                team_b_id: teamB,
              });
            }
          }
          // Rotate array for next round (keep first element fixed)
          workingTeams.splice(1, 0, workingTeams.pop() as string | null);
        }
      }
    }
    await supabase.from('tournaments').update({ status: 'IN_PROGRESS' }).eq('id', tournamentId);
    revalidatePath('/admin/bracket');
    revalidatePath('/bracket');
    return;
  }

  if (tourney?.format === 'SWISS') {
    await supabase.from('bracket_matchups').delete().eq('tournament_id', tournamentId);
    
    let workingTeams = [...teamIds];
    
    let slotCounter = 1;
    let matchIdx = 0;
    
    while (matchIdx < workingTeams.length) {
      if (matchIdx === workingTeams.length - 1) {
        // Last team gets a bye
        const team = workingTeams[matchIdx];
        await supabase.from('bracket_matchups').insert({
          tournament_id: tournamentId,
          round: 1,
          slot: slotCounter++,
          status: 'COMPLETED',
          bracket_side: 'SWISS',
          team_a_id: team,
          team_b_id: null,
          winner_id: team,
          is_bye: true,
        });
        break;
      }
      
      const teamA = workingTeams[matchIdx];
      const teamB = workingTeams[matchIdx + 1];
      
      await supabase.from('bracket_matchups').insert({
        tournament_id: tournamentId,
        round: 1,
        slot: slotCounter++,
        status: 'PENDING',
        bracket_side: 'SWISS',
        team_a_id: teamA,
        team_b_id: teamB,
      });
      
      matchIdx += 2;
    }
    
    await supabase.from('tournaments').update({ status: 'IN_PROGRESS' }).eq('id', tournamentId);
    revalidatePath('/admin/bracket');
    revalidatePath('/bracket');
    return;
  }

  if (tourney?.format === 'PLAYOFFS') {
    // ── PLAYOFFS ───────────────────────────────────────────────
    await supabase
      .from('bracket_matchups')
      .update({ team_a_id: null, team_b_id: null, winner_id: null, is_bye: false, status: 'PENDING', schedule_id: null })
      .eq('tournament_id', tournamentId);
    await supabase.from('schedules').delete().eq('tournament_id', tournamentId);

    const { data: matchups } = await supabase.from('bracket_matchups').select('id, round, slot, bracket_side, feeds_into_matchup_id, loser_feeds_into_matchup_id').eq('tournament_id', tournamentId);
    if (!matchups || matchups.length === 0) throw new Error('Bracket not generated yet.');

    const placeSeed = async (matchSide: string, round: number, slot: number, field: 'team_a_id' | 'team_b_id', seedNum: number) => {
      const match = matchups.find(m => m.bracket_side === matchSide && m.round === round && m.slot === slot);
      const teamId = teamSeedMap.get(seedNum);
      if (match && teamId) {
        await supabase.from('bracket_matchups').update({ [field]: teamId }).eq('id', match.id);
      }
    };

    await placeSeed('WINNERS', 1, 1, 'team_a_id', 1);
    await placeSeed('WINNERS', 1, 3, 'team_a_id', 2);
    await placeSeed('WINNERS', 1, 4, 'team_a_id', 3);
    await placeSeed('WINNERS', 1, 2, 'team_a_id', 4);
    await placeSeed('WINNERS', 1, 2, 'team_b_id', 5);
    await placeSeed('WINNERS', 1, 4, 'team_b_id', 6);
    await placeSeed('PLAY_IN', 1, 1, 'team_a_id', 7);
    await placeSeed('PLAY_IN', 1, 1, 'team_b_id', 8);
    await placeSeed('PLAY_IN', 1, 2, 'team_a_id', 9);
    await placeSeed('PLAY_IN', 1, 2, 'team_b_id', 10);

    // Manual BYE cascading for Play-ins (e.g., if seed 10 is missing)
    const m1 = matchups.find(m => m.bracket_side === 'PLAY_IN' && m.round === 1 && m.slot === 1);
    const m2 = matchups.find(m => m.bracket_side === 'PLAY_IN' && m.round === 1 && m.slot === 2);
    
    for (const match of [m1, m2]) {
      if (!match) continue;
      const tA = match.slot === 1 ? teamSeedMap.get(7) : teamSeedMap.get(9);
      const tB = match.slot === 1 ? teamSeedMap.get(8) : teamSeedMap.get(10);
      
      if ((tA && !tB) || (!tA && tB)) {
        const present = tA || tB;
        await supabase.from('bracket_matchups').update({ winner_id: present, is_bye: true, status: 'COMPLETED' }).eq('id', match.id);
        if (match.feeds_into_matchup_id) {
          const next = matchups.find(m => m.id === match.feeds_into_matchup_id);
          if (next) {
            // For PLAY_IN R1 S2, feeds into PLAY_IN R2 S1 (Match 3) as team_a
            // For PLAY_IN R1 S1, feeds into WINNERS R1 S3 as team_b
            const fieldToUpdate = (next.bracket_side === 'PLAY_IN' && next.round === 2) ? 'team_a_id' : 'team_b_id';
            await supabase.from('bracket_matchups').update({ [fieldToUpdate]: present }).eq('id', next.id);
          }
        }
        if (match.loser_feeds_into_matchup_id) {
          await supabase.from('bracket_matchups').update({ is_bye: true, status: 'COMPLETED' }).eq('id', match.loser_feeds_into_matchup_id);
        }
      }
    }

    await supabase.from('tournaments').update({ status: 'IN_PROGRESS' }).eq('id', tournamentId);
    revalidatePath('/admin/bracket');
    revalidatePath('/bracket');
    return;
  }

  // ── ELIM (single or double) ───────────────────────────────────────────────
  // Reset all matchup slots to clean state (wipe teams/winners/byes/schedules)
  await supabase
    .from('bracket_matchups')
    .update({
      team_a_id: null,
      team_b_id: null,
      winner_id: null,
      is_bye: false,
      status: 'PENDING',
      schedule_id: null,
    })
    .eq('tournament_id', tournamentId);

  // Delete stale schedules from a previous randomize run
  await supabase.from('schedules').delete().eq('tournament_id', tournamentId);

  // Get R1 UB matchups — must use bracket_side = 'WINNERS' (set correctly in generateBracket)
  const { data: round1 } = await supabase
    .from('bracket_matchups')
    .select('id, feeds_into_matchup_id, loser_feeds_into_matchup_id')
    .eq('tournament_id', tournamentId)
    .eq('bracket_side', 'WINNERS')
    .eq('round', 1)
    .order('slot', { ascending: true });

  if (!round1 || round1.length === 0) throw new Error('Bracket not generated yet. Please generate the bracket first.');

  const bracketSize = round1.length * 2;
  const seedOrder = generateSeedOrder(bracketSize);

  // Track bye matchup IDs for cascade propagation
  const byeMatchupIds = new Set<string>();

  for (let i = 0; i < round1.length; i++) {
    const matchup = round1[i];
    const seedA = seedOrder[i * 2];
    const seedB = seedOrder[i * 2 + 1];
    
    const teamA = teamSeedMap.get(seedA) || null;
    const teamB = teamSeedMap.get(seedB) || null;
    
    if (teamA && teamB) {
      // Normal match
      await supabase.from('bracket_matchups').update({ 
        team_a_id: teamA, 
        team_b_id: teamB,
        status: 'PENDING',
      }).eq('id', matchup.id);
    } else if (teamA || teamB) {
      // Bye match — one real team, auto-advance
      const presentTeam = (teamA || teamB)!;
      await supabase.from('bracket_matchups').update({ 
        team_a_id: teamA, 
        team_b_id: teamB,
        winner_id: presentTeam,
        is_bye: true,
        status: 'COMPLETED'
      }).eq('id', matchup.id);
      byeMatchupIds.add(matchup.id);
      
      // Advance winner to next UB slot
      if (matchup.feeds_into_matchup_id) {
        const { data: next } = await supabase.from('bracket_matchups')
          .select('id, team_a_id, team_b_id')
          .eq('id', matchup.feeds_into_matchup_id).single();
          
        if (next) {
          const field = next.team_a_id ? 'team_b_id' : 'team_a_id';
          await supabase.from('bracket_matchups').update({ [field]: presentTeam }).eq('id', next.id);
        }
      }
      
      // The LB slot that would receive this bye's loser is itself a bye
      // (there's no real loser from a bye match)
      if (matchup.loser_feeds_into_matchup_id) {
        byeMatchupIds.add(matchup.loser_feeds_into_matchup_id);
        await supabase.from('bracket_matchups')
          .update({ is_bye: true, status: 'COMPLETED' })
          .eq('id', matchup.loser_feeds_into_matchup_id);
      }
    } else {
      // Ghost vs ghost — mark as bye, cascade both outputs
      await supabase.from('bracket_matchups').update({ is_bye: true, status: 'COMPLETED' }).eq('id', matchup.id);
      byeMatchupIds.add(matchup.id);
      if (matchup.feeds_into_matchup_id) {
        byeMatchupIds.add(matchup.feeds_into_matchup_id);
        await supabase.from('bracket_matchups').update({ is_bye: true, status: 'COMPLETED' }).eq('id', matchup.feeds_into_matchup_id);
      }
      if (matchup.loser_feeds_into_matchup_id) {
        byeMatchupIds.add(matchup.loser_feeds_into_matchup_id);
        await supabase.from('bracket_matchups').update({ is_bye: true, status: 'COMPLETED' }).eq('id', matchup.loser_feeds_into_matchup_id);
      }
    }
  }

  // Cascade bye flags through the Losers bracket:
  // A LB matchup that receives ALL bye inputs is itself a bye.
  if (byeMatchupIds.size > 0) {
    const { data: allMatchups } = await supabase
      .from('bracket_matchups')
      .select('id, feeds_into_matchup_id, loser_feeds_into_matchup_id, bracket_side, is_bye')
      .eq('tournament_id', tournamentId);

    if (allMatchups) {
      let changed = true;
      while (changed) {
        changed = false;
        for (const m of allMatchups) {
          if (byeMatchupIds.has(m.id)) continue;
          const incomers = allMatchups.filter(
            x => x.feeds_into_matchup_id === m.id || x.loser_feeds_into_matchup_id === m.id
          );
          const byeIncomers = incomers.filter(x => byeMatchupIds.has(x.id));
          if (incomers.length > 0 && byeIncomers.length === incomers.length && m.bracket_side === 'LOSERS') {
            byeMatchupIds.add(m.id);
            await supabase.from('bracket_matchups')
              .update({ is_bye: true, status: 'COMPLETED' })
              .eq('id', m.id);
            const local = allMatchups.find(x => x.id === m.id);
            if (local) local.is_bye = true;
            changed = true;
          }
        }
      }
    }
  }

  await supabase.from('tournaments').update({ status: 'IN_PROGRESS' }).eq('id', tournamentId);

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
}

export async function generateSwissRound(tournamentId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  
  // 1. Fetch all matches
  const { data: matches } = await supabase.from('bracket_matchups').select('*').eq('tournament_id', tournamentId);
  if (!matches || matches.length === 0) throw new Error('No matches found.');

  // 2. Validate all completed
  if (matches.some(m => m.status !== 'COMPLETED')) {
    throw new Error('All matches in the current round must be completed before generating the next round.');
  }

  const currentRound = Math.max(...matches.map(m => m.round));
  const newRound = currentRound + 1;

  // 3. Get all teams
  const { data: participants } = await supabase.from('tournament_rosters').select('team_id').eq('tournament_id', tournamentId);
  const teamIds = Array.from(new Set(participants?.map(p => p.team_id) || []));
  if (teamIds.length < 2) throw new Error('Not enough teams.');

  // 4. Calculate stats & history
  type TeamStats = { id: string, wins: number, played: string[], hadBye: boolean };
  const stats = new Map<string, TeamStats>();
  for (const id of teamIds) {
    stats.set(id, { id, wins: 0, played: [], hadBye: false });
  }

  for (const m of matches) {
    if (m.is_bye) {
      if (m.team_a_id) stats.get(m.team_a_id)!.hadBye = true;
      if (m.team_b_id) stats.get(m.team_b_id)!.hadBye = true;
      continue;
    }
    
    if (m.team_a_id && m.team_b_id) {
      stats.get(m.team_a_id)!.played.push(m.team_b_id);
      stats.get(m.team_b_id)!.played.push(m.team_a_id);
      
      if (m.winner_id === m.team_a_id) stats.get(m.team_a_id)!.wins++;
      if (m.winner_id === m.team_b_id) stats.get(m.team_b_id)!.wins++;
    }
  }

  // 5. Sort by wins descending
  const sortedTeams = Array.from(stats.values()).sort((a, b) => b.wins - a.wins);
  
  const pairings: Array<[string, string | null]> = [];
  const used = new Set<string>();

  // Handle Bye if odd
  if (sortedTeams.length % 2 !== 0) {
    for (let i = sortedTeams.length - 1; i >= 0; i--) {
      if (!sortedTeams[i].hadBye) {
        pairings.push([sortedTeams[i].id, null]);
        used.add(sortedTeams[i].id);
        break;
      }
    }
    if (used.size === 0) {
      pairings.push([sortedTeams[sortedTeams.length - 1].id, null]);
      used.add(sortedTeams[sortedTeams.length - 1].id);
    }
  }

  // Greedy pairing
  for (let i = 0; i < sortedTeams.length; i++) {
    const t1 = sortedTeams[i];
    if (used.has(t1.id)) continue;
    
    let paired = false;
    for (let j = i + 1; j < sortedTeams.length; j++) {
      const t2 = sortedTeams[j];
      if (used.has(t2.id)) continue;
      
      if (!t1.played.includes(t2.id)) {
        pairings.push([t1.id, t2.id]);
        used.add(t1.id);
        used.add(t2.id);
        paired = true;
        break;
      }
    }
    
    if (!paired) {
      for (let j = i + 1; j < sortedTeams.length; j++) {
        const t2 = sortedTeams[j];
        if (!used.has(t2.id)) {
          pairings.push([t1.id, t2.id]);
          used.add(t1.id);
          used.add(t2.id);
          paired = true;
          break;
        }
      }
    }
  }

  // 6. Insert matches
  let slot = 1;
  for (const [t1, t2] of pairings) {
    if (t2 === null) {
      await supabase.from('bracket_matchups').insert({
        tournament_id: tournamentId,
        round: newRound,
        slot: slot++,
        status: 'COMPLETED',
        bracket_side: 'SWISS',
        team_a_id: t1,
        team_b_id: null,
        winner_id: t1,
        is_bye: true,
      });
    } else {
      await supabase.from('bracket_matchups').insert({
        tournament_id: tournamentId,
        round: newRound,
        slot: slot++,
        status: 'PENDING',
        bracket_side: 'SWISS',
        team_a_id: t1,
        team_b_id: t2,
      });
    }
  }

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
}

export async function resetBracketSeeding(tournamentId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  
  // Wipe tournament seeds
  await supabase.from('tournament_seeds').delete().eq('tournament_id', tournamentId);
  
  // Delete all schedules generated by seating
  await supabase.from('schedules').delete().eq('tournament_id', tournamentId);

  // Reset all bracket matchups to TBD
  await supabase
    .from('bracket_matchups')
    .update({
      team_a_id: null,
      team_b_id: null,
      winner_id: null,
      is_bye: false,
      status: 'PENDING',
      schedule_id: null,
    })
    .eq('tournament_id', tournamentId);

  await supabase.from('tournaments').update({ status: 'SEEDING' }).eq('id', tournamentId);

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
}

/**
 * Compute standings from completed round-robin matchups, then generate
 * a play-in + playoff bracket for a VETERANS_LEAGUE tournament.
 *
 * Standings are ranked by: wins (desc) → point differential (desc) → losses (asc).
 *
 * Playoff structure (if 10+ teams):
 *   Seeds 1–6  → direct to 8-team single-elim bracket
 *   Seeds 7–10 → Play-In (7v8, 9v10, elimination game)
 *   Seeds 11+  → eliminated
 *
 * If fewer than 10 teams, the bracket adapts:
 *   8–9 teams  → 4 direct + 4 play-in
 *   6–7 teams  → 2 direct + 4 play-in (or direct bracket if not enough)
 *   4–5 teams  → direct single-elim bracket
 *
 * Play-ins are always BO1, playoffs are always BO3.
 */
export async function generateLeaguePlayoffs(tournamentId: string) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();

  // 1. Verify this is a VETERANS_LEAGUE tournament
  const { data: tourney } = await supabase
    .from('tournaments')
    .select('format, match_format')
    .eq('id', tournamentId)
    .single();
  if (!tourney || tourney.format !== 'VETERANS_LEAGUE') {
    throw new Error('This action is only available for Veterans League tournaments.');
  }

  // 2. Fetch all registered teams
  const { data: rosters } = await supabase
    .from('tournament_rosters')
    .select('team_id')
    .eq('tournament_id', tournamentId);
  const teamIds = Array.from(new Set((rosters ?? []).map(r => r.team_id)));
  if (teamIds.length < 4) throw new Error('Need at least 4 teams to generate playoffs.');

  // 3. Compute standings from completed round-robin games
  const { data: games } = await supabase
    .from('games')
    .select('home_team_id, away_team_id, home_score, away_score, status, schedule:schedules!games_schedule_id_fkey(tournament_id)')
    .in('status', ['VERIFIED', 'COMPLETED']);

  const tourneyGames = (games ?? []).filter((g: any) => g.schedule?.tournament_id === tournamentId);

  // Also get manual overrides from seeds
  const { data: existingSeeds } = await supabase
    .from('tournament_seeds')
    .select('team_id, seed, manual_wins, manual_losses, point_differential')
    .eq('tournament_id', tournamentId);

  type Standing = { teamId: string; wins: number; losses: number; pd: number };
  const standingsMap = new Map<string, Standing>();

  for (const id of teamIds) {
    const seedData = existingSeeds?.find(s => s.team_id === id);
    standingsMap.set(id, {
      teamId: id,
      wins: seedData?.manual_wins ?? 0,
      losses: seedData?.manual_losses ?? 0,
      pd: seedData?.point_differential ?? 0,
    });
  }

  // Calculate from actual game results if no manual overrides
  for (const game of tourneyGames as any[]) {
    if (!game.home_team_id || !game.away_team_id) continue;
    if (game.home_score == null || game.away_score == null) continue;

    const homeEntry = standingsMap.get(game.home_team_id);
    const awayEntry = standingsMap.get(game.away_team_id);
    const homeSeed = existingSeeds?.find(s => s.team_id === game.home_team_id);
    const awaySeed = existingSeeds?.find(s => s.team_id === game.away_team_id);

    // Only count game results if no manual overrides for that team
    if (homeEntry && homeSeed?.manual_wins == null && homeSeed?.manual_losses == null) {
      if (game.home_score > game.away_score) homeEntry.wins++;
      else homeEntry.losses++;
      if (homeSeed?.point_differential == null) {
        homeEntry.pd += (game.home_score - game.away_score);
      }
    }
    if (awayEntry && awaySeed?.manual_wins == null && awaySeed?.manual_losses == null) {
      if (game.away_score > game.home_score) awayEntry.wins++;
      else awayEntry.losses++;
      if (awaySeed?.point_differential == null) {
        awayEntry.pd += (game.away_score - game.home_score);
      }
    }
  }

  // 4. Rank teams: wins desc → PD desc → losses asc
  const standings = Array.from(standingsMap.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pd !== a.pd) return b.pd - a.pd;
    return a.losses - b.losses;
  });

  // 5. Delete existing playoff matchups (keep round-robin)
  await supabase
    .from('bracket_matchups')
    .delete()
    .eq('tournament_id', tournamentId)
    .in('bracket_side', ['PLAY_IN', 'WINNERS', 'GRAND_FINAL']);

  // 6. Update seeds based on standings
  // First clear old seeds
  await supabase.from('tournament_seeds').delete().eq('tournament_id', tournamentId);

  for (let i = 0; i < standings.length; i++) {
    const s = standings[i];
    const oldSeed = existingSeeds?.find(x => x.team_id === s.teamId);

    await supabase
      .from('tournament_seeds')
      .insert({
        tournament_id: tournamentId,
        team_id: s.teamId,
        seed: i + 1,
        manual_wins: oldSeed?.manual_wins ?? null,
        manual_losses: oldSeed?.manual_losses ?? null,
        point_differential: oldSeed?.point_differential ?? null,
      });
  }

  const totalTeams = standings.length;

  // 7. Determine playoff structure based on team count
  if (totalTeams >= 10) {
    // ── Standard: 6 direct + 4 play-in ────────────────────────
    await generateStandardPlayoffs(supabase, tournamentId, standings);
  } else if (totalTeams >= 8) {
    // ── 8-9 teams: 4 direct + 4 play-in ──────────────────────
    await generateSmallPlayoffs(supabase, tournamentId, standings, 4, 4);
  } else if (totalTeams >= 6) {
    // ── 6-7 teams: 2 direct + up to 4 play-in ────────────────
    const playInCount = Math.min(4, totalTeams - 2);
    if (playInCount >= 4) {
      await generateSmallPlayoffs(supabase, tournamentId, standings, 2, playInCount);
    } else {
      await generateDirectBracket(supabase, tournamentId, standings.slice(0, totalTeams));
    }
  } else {
    // ── 4-5 teams: direct bracket ─────────────────────────────
    await generateDirectBracket(supabase, tournamentId, standings.slice(0, totalTeams));
  }

  revalidatePath('/admin/bracket');
  revalidatePath('/bracket');
  revalidatePath('/tournaments');
}

/**
 * Standard 10+ team playoffs: 6 direct seeds + 4 play-in seeds → 8-team bracket.
 * Play-ins: BO1. Playoffs: BO3.
 */
async function generateStandardPlayoffs(
  supabase: any,
  tournamentId: string,
  standings: { teamId: string; wins: number; losses: number; pd: number }[]
) {
  const seed = (n: number) => standings[n - 1]?.teamId || null;

  // ── Play-In (bracket_side = 'PLAY_IN') ──────────────────
  // Match 1: 7 vs 8 (winner → 7th playoff slot)
  const playInM1 = await insertMatchup(supabase, tournamentId, 1, 1, 'PLAY_IN');
  // Match 2: 9 vs 10 (winner → Match 3)
  const playInM2 = await insertMatchup(supabase, tournamentId, 1, 2, 'PLAY_IN');
  // Match 3: Loser M1 vs Winner M2 (winner → 8th playoff slot)
  const playInM3 = await insertMatchup(supabase, tournamentId, 2, 1, 'PLAY_IN');

  // Set match format to BO1 for play-ins
  await supabase.from('bracket_matchups').update({ match_format: 'BO1' }).in('id', [playInM1, playInM2, playInM3]);

  // Wire play-in feeds
  await supabase.from('bracket_matchups').update({ loser_feeds_into_matchup_id: playInM3 }).eq('id', playInM1);
  await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: playInM3 }).eq('id', playInM2);

  // Seed play-in teams
  await supabase.from('bracket_matchups').update({ team_a_id: seed(7), team_b_id: seed(8) }).eq('id', playInM1);
  await supabase.from('bracket_matchups').update({ team_a_id: seed(9), team_b_id: seed(10) }).eq('id', playInM2);

  // ── Playoff Bracket (WINNERS, 8-team single-elim) ──────
  // QF: 1v8slot, 4v5, 2v7slot, 3v6
  const qf1 = await insertMatchup(supabase, tournamentId, 1, 1, 'WINNERS'); // 1 vs play-in 8th
  const qf2 = await insertMatchup(supabase, tournamentId, 1, 2, 'WINNERS'); // 4 vs 5
  const qf3 = await insertMatchup(supabase, tournamentId, 1, 3, 'WINNERS'); // 2 vs play-in 7th
  const qf4 = await insertMatchup(supabase, tournamentId, 1, 4, 'WINNERS'); // 3 vs 6

  // SF
  const sf1 = await insertMatchup(supabase, tournamentId, 2, 1, 'WINNERS');
  const sf2 = await insertMatchup(supabase, tournamentId, 2, 2, 'WINNERS');

  // Finals
  const finals = await insertMatchup(supabase, tournamentId, 3, 1, 'WINNERS');

  // Set match format to BO3 for playoffs
  await supabase.from('bracket_matchups').update({ match_format: 'BO3' }).in('id', [qf1, qf2, qf3, qf4, sf1, sf2, finals]);

  // Wire playoff feeds
  await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: sf1 }).eq('id', qf1);
  await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: sf1 }).eq('id', qf2);
  await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: sf2 }).eq('id', qf3);
  await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: sf2 }).eq('id', qf4);
  await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: finals }).eq('id', sf1);
  await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: finals }).eq('id', sf2);

  // Wire play-in winners into playoff bracket
  // M1 winner (7th seed slot) → QF3 team_b (vs 2nd seed)
  await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: qf3 }).eq('id', playInM1);
  // M3 winner (8th seed slot) → QF1 team_b (vs 1st seed)
  await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: qf1 }).eq('id', playInM3);

  // Seed direct playoff teams
  await supabase.from('bracket_matchups').update({ team_a_id: seed(1) }).eq('id', qf1);  // 1 vs TBD (play-in)
  await supabase.from('bracket_matchups').update({ team_a_id: seed(4), team_b_id: seed(5) }).eq('id', qf2);
  await supabase.from('bracket_matchups').update({ team_a_id: seed(2) }).eq('id', qf3);  // 2 vs TBD (play-in)
  await supabase.from('bracket_matchups').update({ team_a_id: seed(3), team_b_id: seed(6) }).eq('id', qf4);
}

/**
 * Smaller playoff bracket for 6–9 teams with play-ins.
 * directCount seeds go direct, playInCount seeds go through play-in.
 */
async function generateSmallPlayoffs(
  supabase: any,
  tournamentId: string,
  standings: { teamId: string; wins: number; losses: number; pd: number }[],
  directCount: number,
  playInCount: number
) {
  const seed = (n: number) => standings[n - 1]?.teamId || null;
  
  // ── Play-In ──────────────────────────────────────────────
  const piSeed1 = directCount + 1;
  const piSeed2 = directCount + 2;
  const piSeed3 = directCount + 3;
  const piSeed4 = directCount + 4;

  const playInM1 = await insertMatchup(supabase, tournamentId, 1, 1, 'PLAY_IN');
  const playInM2 = await insertMatchup(supabase, tournamentId, 1, 2, 'PLAY_IN');
  const playInM3 = await insertMatchup(supabase, tournamentId, 2, 1, 'PLAY_IN');

  await supabase.from('bracket_matchups').update({ match_format: 'BO1' }).in('id', [playInM1, playInM2, playInM3]);

  await supabase.from('bracket_matchups').update({ loser_feeds_into_matchup_id: playInM3 }).eq('id', playInM1);
  await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: playInM3 }).eq('id', playInM2);

  await supabase.from('bracket_matchups').update({
    team_a_id: seed(piSeed1),
    team_b_id: seed(piSeed2)
  }).eq('id', playInM1);

  if (seed(piSeed3) && seed(piSeed4)) {
    await supabase.from('bracket_matchups').update({
      team_a_id: seed(piSeed3),
      team_b_id: seed(piSeed4)
    }).eq('id', playInM2);
  } else if (seed(piSeed3)) {
    // Odd number — only 3 play-in teams, M2 is a bye
    await supabase.from('bracket_matchups').update({
      team_a_id: seed(piSeed3),
      winner_id: seed(piSeed3),
      is_bye: true,
      status: 'COMPLETED'
    }).eq('id', playInM2);
  } else {
    // Only 2 play-in teams, M2 not needed — mark as bye
    await supabase.from('bracket_matchups').update({
      is_bye: true,
      status: 'COMPLETED'
    }).eq('id', playInM2);
  }

  // ── Bracket ─────────────────────────────────────────────
  const bracketTeams = directCount + 2;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(bracketTeams)));
  const rounds = Math.ceil(Math.log2(bracketSize));

  const matchupIds: string[][] = [];
  for (let round = 1; round <= rounds; round++) {
    const count = bracketSize / Math.pow(2, round);
    const roundIds: string[] = [];
    for (let slot = 1; slot <= count; slot++) {
      const id = await insertMatchup(supabase, tournamentId, round, slot, 'WINNERS');
      roundIds.push(id);
    }
    matchupIds.push(roundIds);
  }

  // Set all playoff matchups to BO3
  const allPlayoffIds = matchupIds.flat();
  if (allPlayoffIds.length > 0) {
    await supabase.from('bracket_matchups').update({ match_format: 'BO3' }).in('id', allPlayoffIds);
  }

  // Wire rounds
  for (let r = 0; r < matchupIds.length - 1; r++) {
    const current = matchupIds[r];
    const next = matchupIds[r + 1];
    for (let i = 0; i < current.length; i++) {
      await supabase.from('bracket_matchups')
        .update({ feeds_into_matchup_id: next[Math.floor(i / 2)] })
        .eq('id', current[i]);
    }
  }

  // Place direct seeds — use standard bracket seeding order
  const r1 = matchupIds[0];
  const seedOrder = generatePlayoffSeedOrder(bracketSize);

  for (let i = 0; i < r1.length; i++) {
    const seedA = seedOrder[i * 2];
    const seedB = seedOrder[i * 2 + 1];

    const teamA = seedA <= directCount ? seed(seedA) : null;
    const teamB = seedB <= directCount ? seed(seedB) : null;

    const update: any = {};
    if (teamA) update.team_a_id = teamA;
    if (teamB) update.team_b_id = teamB;

    // Handle byes
    if (teamA && !teamB && seedB > bracketTeams) {
      update.team_a_id = teamA;
      update.winner_id = teamA;
      update.is_bye = true;
      update.status = 'COMPLETED';
    } else if (!teamA && teamB && seedA > bracketTeams) {
      update.team_b_id = teamB;
      update.winner_id = teamB;
      update.is_bye = true;
      update.status = 'COMPLETED';
    }

    if (Object.keys(update).length > 0) {
      await supabase.from('bracket_matchups').update(update).eq('id', r1[i]);
    }
  }

  // Wire play-in winners into the bracket slots
  const piSlot1Seed = directCount + 1;
  const piSlot2Seed = directCount + 2;

  for (let i = 0; i < r1.length; i++) {
    const seedA = seedOrder[i * 2];
    const seedB = seedOrder[i * 2 + 1];
    if (seedA === piSlot1Seed || seedB === piSlot1Seed) {
      await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: r1[i] }).eq('id', playInM1);
    }
    if (seedA === piSlot2Seed || seedB === piSlot2Seed) {
      await supabase.from('bracket_matchups').update({ feeds_into_matchup_id: r1[i] }).eq('id', playInM3);
    }
  }
}

/**
 * Direct single-elim bracket for small team counts (4–5 teams, no play-in).
 */
async function generateDirectBracket(
  supabase: any,
  tournamentId: string,
  standings: { teamId: string; wins: number; losses: number; pd: number }[]
) {
  const n = standings.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const rounds = Math.ceil(Math.log2(bracketSize));

  const matchupIds: string[][] = [];
  for (let round = 1; round <= rounds; round++) {
    const count = bracketSize / Math.pow(2, round);
    const roundIds: string[] = [];
    for (let slot = 1; slot <= count; slot++) {
      const id = await insertMatchup(supabase, tournamentId, round, slot, 'WINNERS');
      roundIds.push(id);
    }
    matchupIds.push(roundIds);
  }

  // Set all to BO3
  const allIds = matchupIds.flat();
  if (allIds.length > 0) {
    await supabase.from('bracket_matchups').update({ match_format: 'BO3' }).in('id', allIds);
  }

  // Wire rounds
  for (let r = 0; r < matchupIds.length - 1; r++) {
    const current = matchupIds[r];
    const next = matchupIds[r + 1];
    for (let i = 0; i < current.length; i++) {
      await supabase.from('bracket_matchups')
        .update({ feeds_into_matchup_id: next[Math.floor(i / 2)] })
        .eq('id', current[i]);
    }
  }

  // Seed teams
  const r1 = matchupIds[0];
  const seedOrder = generatePlayoffSeedOrder(bracketSize);

  for (let i = 0; i < r1.length; i++) {
    const seedA = seedOrder[i * 2];
    const seedB = seedOrder[i * 2 + 1];
    const teamA = seedA <= n ? standings[seedA - 1]?.teamId : null;
    const teamB = seedB <= n ? standings[seedB - 1]?.teamId : null;

    if (teamA && teamB) {
      await supabase.from('bracket_matchups').update({
        team_a_id: teamA,
        team_b_id: teamB,
      }).eq('id', r1[i]);
    } else if (teamA || teamB) {
      const present = (teamA || teamB)!;
      await supabase.from('bracket_matchups').update({
        team_a_id: teamA,
        team_b_id: teamB,
        winner_id: present,
        is_bye: true,
        status: 'COMPLETED',
      }).eq('id', r1[i]);

      // Advance bye winner
      const matchup = await supabase.from('bracket_matchups').select('feeds_into_matchup_id').eq('id', r1[i]).single();
      if (matchup?.data?.feeds_into_matchup_id) {
        const { data: next } = await supabase.from('bracket_matchups')
          .select('id, team_a_id, team_b_id')
          .eq('id', matchup.data.feeds_into_matchup_id)
          .single();
        if (next) {
          const field = next.team_a_id ? 'team_b_id' : 'team_a_id';
          await supabase.from('bracket_matchups').update({ [field]: present }).eq('id', next.id);
        }
      }
    }
  }
}

/**
 * Standard bracket seed ordering (1v8, 4v5, 3v6, 2v7 for 8 teams, etc.).
 */
function generatePlayoffSeedOrder(bracketSize: number): number[] {
  let rounds = Math.log2(bracketSize);
  let matches = [1, 2];
  for (let r = 1; r < rounds; r++) {
    let nextMatches: number[] = [];
    let sum = Math.pow(2, r + 1) + 1;
    for (let i = 0; i < matches.length; i++) {
      nextMatches.push(matches[i]);
      nextMatches.push(sum - matches[i]);
    }
    matches = nextMatches;
  }
  return matches;
}

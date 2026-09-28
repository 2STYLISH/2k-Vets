import { createClient, requireAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/repair-series
 * Body: { matchupId: string }
 *
 * Recounts wins from all VERIFIED/COMPLETED games for the series linked to
 * the given bracket matchup, then:
 *  - Updates series.match_format from bracket_matchups.match_format
 *  - Recalculates team_a_wins / team_b_wins
 *  - Sets the correct winner and status
 *  - If it's the final matchup (no feeds_into_matchup_id), marks tournament COMPLETED
 *    and inserts a championship record if missing
 */
export async function POST(req: Request) {
  const { isAdmin, user } = await requireAdmin();
  if (!isAdmin || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { matchupId } = body as { matchupId: string };
  if (!matchupId) {
    return NextResponse.json({ error: 'matchupId required' }, { status: 400 });
  }

  const supabase = createClient();

  // 1. Load the matchup
  const { data: matchup } = await supabase
    .from('bracket_matchups')
    .select('id, tournament_id, team_a_id, team_b_id, match_format, bracket_side, feeds_into_matchup_id, loser_feeds_into_matchup_id, tournaments(match_format)')
    .eq('id', matchupId)
    .single();

  if (!matchup) return NextResponse.json({ error: 'Matchup not found' }, { status: 404 });

  const effectiveFormat = matchup.match_format || (matchup.tournaments as any)?.match_format || 'BO3';

  // 2. Load the series for this matchup
  const { data: series } = await supabase
    .from('series')
    .select('*')
    .eq('bracket_matchup_id', matchupId)
    .maybeSingle();

  if (!series) return NextResponse.json({ error: 'No series found for this matchup' }, { status: 404 });

  // 3. Recalculate wins from all verified games
  const { data: seriesGames } = await supabase
    .from('games')
    .select('home_team_id, away_team_id, home_score, away_score, status')
    .eq('series_id', series.id)
    .in('status', ['VERIFIED', 'COMPLETED']);

  let teamAWins = 0;
  let teamBWins = 0;
  for (const g of seriesGames || []) {
    const winnerId = g.home_score > g.away_score ? g.home_team_id : g.away_team_id;
    if (winnerId === series.team_a_id) teamAWins++;
    else if (winnerId === series.team_b_id) teamBWins++;
  }

  // 4. Determine required wins based on format
  let requiredWins = 1;
  if (effectiveFormat === 'BO3') requiredWins = 2;
  else if (effectiveFormat === 'BO5') requiredWins = 3;
  else if (effectiveFormat === 'BO7') requiredWins = 4;
  else if (effectiveFormat === 'TWICE_TO_BEAT') requiredWins = 2;

  let seriesWinnerId: string | null = null;
  if (teamAWins >= requiredWins) seriesWinnerId = series.team_a_id;
  else if (teamBWins >= requiredWins) seriesWinnerId = series.team_b_id;

  // 5. Update series with correct data
  await supabase.from('series').update({
    match_format: effectiveFormat,
    team_a_wins: teamAWins,
    team_b_wins: teamBWins,
    status: seriesWinnerId ? 'COMPLETED' : 'IN_PROGRESS',
    winner_id: seriesWinnerId,
  }).eq('id', series.id);

  // 6. Update bracket_matchup winner if series is done
  if (seriesWinnerId) {
    await supabase.from('bracket_matchups').update({
      winner_id: seriesWinnerId,
      status: 'COMPLETED',
    }).eq('id', matchupId);
  }

  // 7. If this matchup has no next matchup → it's the final → mark tournament COMPLETED
  const isFinal = !matchup.feeds_into_matchup_id && !matchup.loser_feeds_into_matchup_id;
  if (isFinal && seriesWinnerId && matchup.tournament_id) {
    const { data: existingChamp } = await supabase
      .from('championships')
      .select('id')
      .eq('tournament_id', matchup.tournament_id)
      .maybeSingle();

    const loserId = matchup.team_a_id === seriesWinnerId ? matchup.team_b_id : matchup.team_a_id;

    if (!existingChamp) {
      await supabase.from('championships').insert({
        tournament_id: matchup.tournament_id,
        champion_team_id: seriesWinnerId,
        runner_up_team_id: loserId,
        final_series_id: series.id,
      });
    } else {
      await supabase.from('championships').update({
        champion_team_id: seriesWinnerId,
        runner_up_team_id: loserId,
        final_series_id: series.id,
      }).eq('id', existingChamp.id);
    }

    await supabase.from('tournaments').update({ status: 'COMPLETED' }).eq('id', matchup.tournament_id);
  }

  revalidatePath('/bracket');
  revalidatePath('/admin/bracket');
  revalidatePath('/bracket/[matchupId]', 'page');
  revalidatePath('/');

  return NextResponse.json({
    ok: true,
    format: effectiveFormat,
    teamAWins,
    teamBWins,
    winner: seriesWinnerId,
    tournamentCompleted: isFinal && !!seriesWinnerId,
    gamesFound: seriesGames?.length ?? 0,
  });
}

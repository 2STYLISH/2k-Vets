import { createClient } from '@/lib/supabase/server';
import BracketTree from '@/components/BracketTree';
import StandingsTable from '@/components/StandingsTable';

export default async function PublicBracketPage() {
  const supabase = createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status, format, match_format')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: matchups } = tournament
    ? await supabase
        .from('bracket_matchups')
        .select('id, round, slot, status, winner_id, is_bye, bracket_side, match_format, feeds_into_matchup_id, loser_feeds_into_matchup_id, team_a:teams!bracket_matchups_team_a_id_fkey(id,name,slug), team_b:teams!bracket_matchups_team_b_id_fkey(id,name,slug), series(team_a_wins, team_b_wins), schedule:schedules(games(home_score, away_score, status))')
        .eq('tournament_id', tournament.id)
        .order('round', { ascending: true })
        .order('slot', { ascending: true })
    : { data: [] };

  const { data: teams } = await supabase.from('teams').select('id, name').order('name');

  const { data: seeds } = tournament
    ? await supabase.from('tournament_seeds').select('*').eq('tournament_id', tournament.id)
    : { data: [] };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="section-header mb-8">
        <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">Tournament Bracket</p>
        <h1 className="text-4xl text-white font-display tracking-[0.12em] uppercase title-glow">{tournament?.name ?? 'BRACKET'}</h1>
        <p className="text-white/40 text-sm mt-2 font-body">
          Winners are only advanced after an admin verifies the series result.
        </p>
      </div>
      {!tournament ? (
        <div className="card p-6">
          <p className="text-white/40 text-sm font-mono uppercase tracking-widest">No active tournament bracket yet.</p>
        </div>
      ) : tournament.format === 'ROUND_ROBIN' || tournament.format === 'LEADERBOARD' ? (
        <StandingsTable matchups={(matchups ?? []) as any} teams={teams ?? []} seeds={seeds ?? []} />
      ) : tournament.format === 'SWISS' ? (
        <>
          <StandingsTable matchups={(matchups ?? []) as any} teams={teams ?? []} seeds={seeds ?? []} />
          <div className="mt-8">
            <BracketTree matchups={(matchups ?? []) as any} defaultMatchFormat={tournament.match_format} />
          </div>
        </>
      ) : (
        <BracketTree matchups={(matchups ?? []) as any} defaultMatchFormat={tournament.match_format} />
      )}
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import AdminInteractiveBracket from '@/components/admin/AdminInteractiveBracket';
import StandingsTable from '@/components/StandingsTable';
import BracketSeeder from '@/components/admin/BracketSeeder';
import SeedEditor from '@/components/admin/SeedEditor';
import SwissGenerator from '@/components/admin/SwissGenerator';
import LeaguePlayoffGenerator from '@/components/admin/LeaguePlayoffGenerator';
import Link from '@/components/HiddenLink';
import BackButton from '@/components/BackButton';
import { slugify } from '@/lib/format';
import TournamentFilter from '@/components/TournamentFilter';

export default async function AdminBracketPage({
  searchParams,
}: {
  searchParams: { t?: string };
}) {
  const supabase = createClient();
  const activeParam = searchParams.t;

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, format, match_format, playoffs_visible')
    .neq('status', 'COMPLETED')
    .order('created_at', { ascending: false });

  const active = activeParam
    ? tournaments?.find((t) => t.id === activeParam || slugify(t.name) === activeParam) ?? tournaments?.[0]
    : tournaments?.[0];

  const activeTournamentSlug = active ? slugify(active.name) : '';

  const { data: teams } = active 
    ? await supabase.from('teams').select('id, name, slug, group_name').eq('tournament_id', active.id).order('name')
    : { data: [] };

  const { data: matchups } = active
    ? await supabase
        .from('bracket_matchups')
        .select('id, round, slot, status, winner_id, is_bye, bracket_side, match_format, feeds_into_matchup_id, loser_feeds_into_matchup_id, team_a:teams!bracket_matchups_team_a_id_fkey(id,name,slug,group_name), team_b:teams!bracket_matchups_team_b_id_fkey(id,name,slug,group_name), schedule:schedules(home_team_id, away_team_id, games(home_score, away_score))')
        .eq('tournament_id', active.id)
        .order('round', { ascending: true })
        .order('slot', { ascending: true })
    : { data: [] };

  // Get roster & seeded
  const { data: rosters } = active
    ? await supabase.from('tournament_rosters').select('team_id').eq('tournament_id', active.id)
    : { data: [] };
  const { data: seeds } = active
    ? await supabase.from('tournament_seeds').select('*').eq('tournament_id', active.id)
    : { data: [] };

  const rosterIds = (rosters ?? []).map((r) => r.team_id);
  const seededIds = (seeds ?? []).map((s) => s.team_id);

  return (
    <div className="space-y-8">
      <BackButton />
      
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="section-header !mb-0 !pb-0 !border-b-0">
          <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">Admin / Bracket</p>
          <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase">BRACKET MANAGEMENT</h1>
          <p className="text-white/40 text-sm mt-4 max-w-2xl">
            Verified series results advance teams automatically. The system never invents a winner —
            use Admin Override below for manual corrections.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-[#1f2937] p-2 rounded-xl border border-white/10">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-2 font-bold">Tournament</span>
            <TournamentFilter tournaments={tournaments ?? []} activeId={activeTournamentSlug} basePath="/admin/bracket" />
          </div>
        </div>
      </div>

      {!active ? (
        <p className="surface-elevated rounded-xl p-6 text-white/40 text-sm border border-white/10 text-center uppercase tracking-widest font-mono">No tournaments yet.</p>
      ) : (
        <>
          <div className="surface-elevated rounded-xl border border-flag-gold/40 shadow-[0_0_15px_rgba(212,160,23,0.1)] p-4 flex items-center justify-between">
            <p className="text-white font-display tracking-widest">{active.name}</p>
            <p className="text-[10px] font-mono font-bold text-flag-gold uppercase tracking-widest px-2 py-1 bg-flag-gold/10 rounded-full border border-flag-gold/20">{active.status}</p>
          </div>

          {active.format === 'VETERANS_LEAGUE' ? (
            <>
              <BracketSeeder
                tournamentId={active.id}
                format={active.format}
                teams={teams ?? []}
                rosterIds={rosterIds}
                seededIds={seededIds}
                hasScheduledGames={(matchups ?? []).some((m: any) => m.schedule && (Array.isArray(m.schedule) ? m.schedule.length > 0 : Object.keys(m.schedule).length > 0))}
              />

              {/* Seed Editor */}
              <SeedEditor
                key={(seeds ?? []).map(s => `${s.team_id}:${s.seed}:${s.manual_wins}:${s.manual_losses}:${s.point_differential}`).join('|')}
                tournamentId={active.id}
                teams={teams ?? []}
                seeds={seeds ?? []}
                matchups={(matchups ?? []) as any}
              />

              {/* Round-robin standings */}
              <StandingsTable matchups={(matchups ?? []) as any} teams={teams ?? []} seeds={seeds ?? []} />


              {/* Playoff picture & generator */}
              {active.status === 'IN_PROGRESS' && (
                <LeaguePlayoffGenerator
                  tournamentId={active.id}
                  teams={teams ?? []}
                  seeds={seeds ?? []}
                  matchups={(matchups ?? []) as any}
                  hasPlayoffs={(matchups ?? []).some((m: any) => m.bracket_side === 'WINNERS' || m.bracket_side === 'PLAY_IN')}
                  playoffsVisible={(active as any).playoffs_visible ?? false}
                />
              )}

              {/* Show playoff bracket if generated */}
              {(matchups ?? []).some((m: any) => m.bracket_side === 'WINNERS' || m.bracket_side === 'PLAY_IN') && (
                <div className="mt-8">

                  <AdminInteractiveBracket 
                    matchups={((matchups ?? []) as any[]).filter((m: any) => m.bracket_side !== 'ROUND_ROBIN')} 
                    teams={(teams ?? []) as any} 
                    defaultMatchFormat={active.match_format} 
                  />
                </div>
              )}

              {/* Round-robin matchups */}
              {(matchups ?? []).some((m: any) => m.bracket_side === 'ROUND_ROBIN') && (
                <div className="mt-8">
                  <h2 className="text-xl font-display text-white tracking-widest mb-4">REGULAR SEASON MATCHUPS</h2>
                  <AdminInteractiveBracket 
                    matchups={((matchups ?? []) as any[]).filter((m: any) => m.bracket_side === 'ROUND_ROBIN')} 
                    teams={(teams ?? []) as any} 
                    defaultMatchFormat="BO1" 
                  />
                </div>
              )}
            </>
          ) : (active.format === 'ROUND_ROBIN' || active.format === 'LEADERBOARD') ? (
            <StandingsTable matchups={(matchups ?? []) as any} teams={teams ?? []} seeds={seeds ?? []} />
          ) : active.format === 'SWISS' ? (
            <>
              <StandingsTable matchups={(matchups ?? []) as any} teams={teams ?? []} seeds={seeds ?? []} />
              <div className="mt-8">
                <AdminInteractiveBracket matchups={(matchups ?? []) as any} teams={(teams ?? []) as any} defaultMatchFormat={active.match_format} />
              </div>
            </>
          ) : (
            <>
              {active.format === 'PLAYOFFS' && (
                <SeedEditor
                  tournamentId={active.id}
                  teams={teams ?? []}
                  seeds={seeds ?? []}
                  matchups={(matchups ?? []) as any}
                />
              )}
              <AdminInteractiveBracket matchups={(matchups ?? []) as any} teams={(teams ?? []) as any} defaultMatchFormat={active.match_format} />
            </>
          )}


          {active.format === 'SWISS' && active.status === 'IN_PROGRESS' && (
            <SwissGenerator tournamentId={active.id} />
          )}
        </>
      )}
    </div>
  );
}

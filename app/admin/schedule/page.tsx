import { createClient } from '@/lib/supabase/server';
import CreateGameForm from '@/components/admin/CreateGameForm';
import ScheduleManager from '@/components/admin/ScheduleManager';
import BackButton from '@/components/BackButton';
import TournamentFilter from '@/components/TournamentFilter';
import { slugify } from '@/lib/format';

export default async function AdminSchedulePage({ searchParams }: { searchParams: { t?: string } }) {
  const supabase = createClient();
  const activeParam = searchParams.t;

  const { data: tournamentsData } = await supabase.from('tournaments').select('id, name, format').neq('status', 'COMPLETED');
  const tournaments = tournamentsData ?? [];
  const activeTournamentObj = tournaments.find(t => t.id === activeParam || slugify(t.name) === activeParam) ?? tournaments[0];
  const activeTournament = activeTournamentObj?.id || '';
  const activeTournamentSlug = activeTournamentObj ? slugify(activeTournamentObj.name) : '';

  const [{ data: rosters }, { data: games }, { data: matchups }] = await Promise.all([
    supabase
      .from('tournament_rosters')
      .select('tournament_id, team_id, team:teams(id, name)')
      .eq('tournament_id', activeTournament)
      .order('team_id'),
    supabase
      .from('schedules')
      .select('id, scheduled_date, scheduled_time, status, game_type, round_label, is_archived, series_id, tournament:tournaments(name), home:teams!schedules_home_team_id_fkey(name), away:teams!schedules_away_team_id_fkey(name)')
      .eq('tournament_id', activeTournament)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('bracket_matchups')
      .select('id, schedule_id, tournament_id, team_a_id, team_b_id, status, bracket_side, round, team_a:teams!bracket_matchups_team_a_id_fkey(id,name,slug), team_b:teams!bracket_matchups_team_b_id_fkey(id,name,slug), series(id)')
      .eq('tournament_id', activeTournament)
      .not('team_a_id', 'is', null)
      .not('team_b_id', 'is', null)
      .neq('status', 'COMPLETED'),
  ]);

  const rosterMap: Record<string, { id: string; name: string }[]> = {};
  for (const row of rosters ?? []) {
    const team = row.team as any;
    if (!team) continue;
    if (!rosterMap[row.tournament_id]) rosterMap[row.tournament_id] = [];
    if (!rosterMap[row.tournament_id].some((t) => t.id === team.id)) {
      rosterMap[row.tournament_id].push({ id: team.id, name: team.name });
    }
  }

  const matchupsMap: Record<string, any[]> = {};
  for (const m of matchups ?? []) {
    if (!matchupsMap[m.tournament_id]) matchupsMap[m.tournament_id] = [];
    matchupsMap[m.tournament_id].push(m);
  }

  return (
    <div className="space-y-8">
      <BackButton />
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="section-header !mb-0 !pb-0 !border-b-0">
          <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">Admin / Schedule</p>
          <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase">ADMIN SCHEDULE</h1>
          <p className="text-white/40 text-sm mt-4 max-w-2xl">Create, reschedule, and manage games across the season.</p>
        </div>
      </div>

      <CreateGameForm tournaments={tournaments} rosterMap={rosterMap} matchupsMap={matchupsMap} schedules={games ?? []} />

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg text-white font-display tracking-widest uppercase">ALL GAMES</h2>
          <div className="flex items-center gap-3 bg-[#1f2937] p-2 rounded-xl border border-white/10">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-2 font-bold">Tournament</span>
            <TournamentFilter tournaments={tournaments} activeId={activeTournamentSlug} basePath="/admin/schedule" />
          </div>
        </div>
        <ScheduleManager games={games ?? []} />
      </div>
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import ScheduleAccordion from '@/components/ScheduleAccordion';

export default async function SchedulePage({ searchParams }: { searchParams: { filter?: string } }) {
  const supabase = createClient();
  const filter = searchParams.filter ?? 'all';

  let query = supabase
    .from('schedules')
    .select('id, scheduled_date, scheduled_time, game_type, round_label, status, tournament_id, tournament:tournaments(name, status), home:teams!schedules_home_team_id_fkey(name), away:teams!schedules_away_team_id_fkey(name), games(id, short_id)')
    .eq('is_archived', false)
    .neq('status', 'COMPLETED')
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  if (filter === 'playoffs') query = query.eq('game_type', 'PLAYOFF');
  if (filter === 'regular') query = query.eq('game_type', 'REGULAR');
  if (filter === 'tournament') query = query.eq('game_type', 'TOURNAMENT');

  const { data: games } = await query;

  // Group games by tournament ID
  const groupedByTournament = new Map<string, { tournamentName: string, status: string, games: any[] }>();

  // Track games without a tournament separately
  const unassignedGames: any[] = [];

  (games ?? []).forEach((g) => {
    // Handle Supabase returning arrays for foreign keys
    const tournamentObj = Array.isArray(g.tournament) ? g.tournament[0] : g.tournament;

    // Skip games if the tournament is completed
    if (tournamentObj && tournamentObj.status === 'COMPLETED') {
      return;
    }

    if (g.tournament_id && tournamentObj) {
      const group = groupedByTournament.get(g.tournament_id) ?? {
        tournamentName: tournamentObj.name,
        status: tournamentObj.status,
        games: [] as any[]
      };
      group.games.push({ ...g, tournament: tournamentObj }); // normalize the tournament object just in case
      groupedByTournament.set(g.tournament_id, group);
    } else {
      unassignedGames.push(g);
    }
  });

  // Sort tournaments: active first (SEEDING, IN_PROGRESS), then others
  const sortedTournaments = [...groupedByTournament.values()].sort((a, b) => {
    const aActive = ['SEEDING', 'IN_PROGRESS'].includes(a.status);
    const bActive = ['SEEDING', 'IN_PROGRESS'].includes(b.status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });

  const filters = [
    { key: 'all', label: 'All Games' },
    { key: 'regular', label: 'Regular Season' },
    { key: 'playoffs', label: 'Playoffs' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="section-header">
        <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">2K Veterans League</p>
        <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase title-glow">UPCOMING GAMES</h1>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex flex-wrap gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
        {filters.map((f) => (
          <a
            key={f.key}
            href={`/schedule?filter=${f.key}`}
            className={`px-5 py-2.5 rounded-lg text-xs font-body font-medium uppercase tracking-[0.12em] transition-all duration-200 ${filter === f.key
                ? 'bg-flag-red text-white shadow-md'
                : 'text-white/50 hover:text-white hover:bg-navy-900/50'
              }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {(games ?? []).length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-white/40 font-mono text-sm uppercase tracking-widest">No games scheduled for this filter.</p>
        </div>
      )}

      <div className="space-y-6">
        {sortedTournaments.map((t, idx) => (
          <ScheduleAccordion
            key={idx}
            tournamentName={t.tournamentName}
            games={t.games}
            defaultExpanded={['SEEDING', 'IN_PROGRESS'].includes(t.status)}
          />
        ))}

        {unassignedGames.length > 0 && (
          <ScheduleAccordion
            tournamentName="Exhibition / Unassigned Games"
            games={unassignedGames}
            defaultExpanded={true}
          />
        )}
      </div>
    </div>
  );
}

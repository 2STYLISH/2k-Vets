import { createClient } from '@/lib/supabase/server';
import ScheduleAccordion from '@/components/ScheduleAccordion';

export default async function SchedulePage({ searchParams }: { searchParams: { filter?: string; date?: string } }) {
  const supabase = createClient();
  const filter = searchParams.filter;
  const dateFilter = searchParams.date ?? null;

  // Fetch all upcoming game dates for the date strip (unfiltered by date)
  let allDatesQuery = supabase
    .from('schedules')
    .select('scheduled_date')
    .eq('is_archived', false)
    .neq('status', 'COMPLETED')
    .order('scheduled_date', { ascending: true });

  if (filter === 'playoffs') allDatesQuery = allDatesQuery.eq('game_type', 'PLAYOFF');
  else if (filter === 'regular') allDatesQuery = allDatesQuery.eq('game_type', 'REGULAR');
  else if (filter === 'tournament') allDatesQuery = allDatesQuery.eq('game_type', 'TOURNAMENT');
  else if (filter === 'playins') allDatesQuery = allDatesQuery.eq('game_type', 'PLAYIN');
  else allDatesQuery = allDatesQuery.is('id', null);

  const { data: allDatesRaw } = await allDatesQuery;
  const allUniqueDates = [...new Set((allDatesRaw ?? []).map(g => g.scheduled_date).filter(Boolean))].sort();

  // Fetch games (with optional date filter)
  let query = supabase
    .from('schedules')
    .select('id, scheduled_date, scheduled_time, game_type, round_label, status, tournament_id, tournament:tournaments(name, status), home:teams!schedules_home_team_id_fkey(name, slug), away:teams!schedules_away_team_id_fkey(name, slug), games(id, short_id)')
    .eq('is_archived', false)
    .neq('status', 'COMPLETED')
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  if (filter === 'playoffs') query = query.eq('game_type', 'PLAYOFF');
  else if (filter === 'regular') query = query.eq('game_type', 'REGULAR');
  else if (filter === 'tournament') query = query.eq('game_type', 'TOURNAMENT');
  else if (filter === 'playins') query = query.eq('game_type', 'PLAYIN');
  else query = query.is('id', null);
  
  if (dateFilter) query = query.eq('scheduled_date', dateFilter);
  else query = query.is('id', null); // Don't load games if no date is selected

  const { data: games } = await query;

  // Group games by tournament ID
  const groupedByTournament = new Map<string, { tournamentName: string, status: string, games: any[] }>();
  const unassignedGames: any[] = [];

  (games ?? []).forEach((g) => {
    const tournamentObj = Array.isArray(g.tournament) ? g.tournament[0] : g.tournament;
    if (tournamentObj && tournamentObj.status === 'COMPLETED') return;

    if (g.tournament_id && tournamentObj) {
      const group = groupedByTournament.get(g.tournament_id) ?? {
        tournamentName: tournamentObj.name,
        status: tournamentObj.status,
        games: [] as any[]
      };
      group.games.push({ ...g, tournament: tournamentObj });
      groupedByTournament.set(g.tournament_id, group);
    } else {
      unassignedGames.push(g);
    }
  });

  const sortedTournaments = [...groupedByTournament.values()].sort((a, b) => {
    const aActive = ['SEEDING', 'IN_PROGRESS'].includes(a.status);
    const bActive = ['SEEDING', 'IN_PROGRESS'].includes(b.status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });

  const filters = [
    { key: 'regular', label: 'Regular Season' },
    { key: 'playins', label: 'Play-Ins' },
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
      <div className="inline-flex flex-wrap gap-1 bg-[#1f2937] rounded-xl p-1 border border-white/10">
        {filters.map((f) => (
          <a
            key={f.key}
            href={`/schedule?filter=${f.key}`}
            className={`px-5 py-2.5 rounded-lg text-[10px] font-mono font-medium uppercase tracking-widest transition-all duration-200 ${filter === f.key
              ? 'bg-flag-red text-white'
              : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* Date Selector Strip */}
      {allUniqueDates.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {allUniqueDates.map((date) => {
            const d = new Date(date + 'T00:00:00');
            const isActive = dateFilter === date;
            const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
            const dayNum = d.toLocaleDateString(undefined, { day: 'numeric' });
            const monthName = d.toLocaleDateString(undefined, { month: 'short' });
            return (
              <a
                key={date}
                href={isActive ? `/schedule?filter=${filter}` : `/schedule?filter=${filter}&date=${date}`}
                className={`shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border text-center transition-all duration-200 ${isActive
                  ? 'bg-flag-gold border-flag-gold text-[#111827]'
                  : 'bg-[#1f2937] border-white/10 text-white/50 hover:border-flag-gold/50 hover:text-white'
                  }`}
              >
                <span className={`text-[9px] font-mono uppercase tracking-widest font-bold ${isActive ? 'text-[#111827]' : ''}`}>{dayName}</span>
                <span className={`text-xl font-display font-bold leading-none my-0.5 ${isActive ? 'text-[#111827]' : 'text-white'}`}>{dayNum}</span>
                <span className={`text-[9px] font-mono uppercase tracking-widest ${isActive ? 'text-[#111827]/70' : 'text-white/30'}`}>{monthName}</span>
              </a>
            );
          })}
        </div>
      )}

      {!filter ? (
        <div className="surface-elevated rounded-xl p-8 text-center border border-white/10">
          <p className="text-white/40 font-mono text-sm uppercase tracking-widest">Please select a filter to view scheduled games.</p>
        </div>
      ) : !dateFilter ? (
        <div className="surface-elevated rounded-xl p-8 text-center border border-white/10">
          <p className="text-white/40 font-mono text-sm uppercase tracking-widest">Select a date to view games.</p>
        </div>
      ) : (games ?? []).length === 0 ? (
        <div className="surface-elevated rounded-xl p-8 text-center border border-white/10">
          <p className="text-white/40 font-mono text-sm uppercase tracking-widest">No games scheduled for this filter.</p>
        </div>
      ) : null}

      <div className="space-y-6">
        {sortedTournaments.map((t, idx) => (
          <ScheduleAccordion
            key={idx}
            tournamentName={t.tournamentName}
            games={t.games}
            defaultExpanded={['SEEDING', 'IN_PROGRESS'].includes(t.status)}
            currentFilter={filter}
            activeDateFilter={dateFilter}
          />
        ))}

        {unassignedGames.length > 0 && (
          <ScheduleAccordion
            tournamentName="Exhibition / Unassigned Games"
            games={unassignedGames}
            defaultExpanded={true}
            currentFilter={filter}
            activeDateFilter={dateFilter}
          />
        )}
      </div>
    </div>
  );
}

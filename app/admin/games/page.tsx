import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import BackButton from '@/components/BackButton';
import { formatDate, formatTime, slugify } from '@/lib/format';
import TournamentFilter from '@/components/TournamentFilter';

export const maxDuration = 60;

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'text-white/40 bg-white/[0.03]',
  LIVE: 'text-white bg-navy-50',
  AWAITING_STATS: 'text-white/30 bg-white/[0.03]',
  STATS_UNDER_REVIEW: 'text-white/50 bg-navy-50',
  VERIFIED: 'text-white bg-navy-50',
  COMPLETED: 'text-white/30 bg-white/[0.03]',
};

export default async function AdminGamesPage({ searchParams }: { searchParams: { tab?: string, t?: string } }) {
  const tab = searchParams.tab || 'active';
  const supabase = createClient();
  const activeParam = searchParams.t;

  const { data: tournamentsData } = await supabase.from('tournaments').select('id, name').neq('status', 'COMPLETED');
  const tournaments = tournamentsData ?? [];
  const activeTournamentObj = tournaments.find(t => t.id === activeParam || slugify(t.name) === activeParam) ?? tournaments[0];
  const activeTournament = activeTournamentObj?.id || '';
  const activeTournamentSlug = activeTournamentObj ? slugify(activeTournamentObj.name) : '';

  const { data: schedules } = await supabase
    .from('schedules')
    .select(
      'id, scheduled_date, scheduled_time, game_type, round_label, status, is_archived, home:teams!schedules_home_team_id_fkey(id,name), away:teams!schedules_away_team_id_fkey(id,name)'
    )
    .eq('tournament_id', activeTournament)
    .order('scheduled_date', { ascending: false })
    .limit(200);

  const { data: games } = await supabase
    .from('games')
    .select('id, schedule_id, status');
  const gameBySchedule = new Map((games ?? []).map((g) => [g.schedule_id, g]));

  return (
    <div className="space-y-4">
      <BackButton />
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/[0.06]">
        <div>
          <h1 className="text-4xl text-white mb-1">GAMES & SCREENSHOTS</h1>
          <p className="text-white/40 text-sm">
            Upload the final box-score screenshot, run AI extraction, then review and mark players
            as DNP before verifying. Stats and award rankings update automatically on verify.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface-900/50 p-2 rounded-xl border border-white/[0.06]">
          <span className="text-[10px] font-mono text-silver-400 uppercase tracking-widest pl-2">Tournament</span>
          <TournamentFilter tournaments={tournaments} activeId={activeTournamentSlug} basePath="/admin/games" />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Link 
          href="?tab=active" 
          className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded transition-colors ${tab === 'active' ? 'bg-flag-red text-white shadow-lg border border-red-500' : 'bg-surface-800 text-white/50 hover:text-white border border-surface-600'}`}
        >
          Active
        </Link>
        <Link 
          href="?tab=archived" 
          className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded transition-colors ${tab === 'archived' ? 'bg-flag-red text-white shadow-lg border border-red-500' : 'bg-surface-800 text-white/50 hover:text-white border border-surface-600'}`}
        >
          Archived
        </Link>
      </div>

      <div className="grid gap-3">
        {(() => {
          const combined = (schedules ?? []).map((s: any) => {
            const game = gameBySchedule.get(s.id);
            return { ...s, gameStatus: game?.status ?? 'SCHEDULED' };
          });

          const activeList = combined.filter(s => !s.is_archived && s.gameStatus !== 'VERIFIED' && s.gameStatus !== 'COMPLETED');
          const archivedList = combined.filter(s => s.is_archived || s.gameStatus === 'VERIFIED' || s.gameStatus === 'COMPLETED');
          
          const currentList = tab === 'archived' ? archivedList : activeList;

          if (currentList.length === 0) {
            return (
              <div className="card p-8 text-center">
                <p className="text-white text-sm">No games found in this view.</p>
              </div>
            );
          }

          const sortOrder: Record<string, number> = {
            SCHEDULED: 1,
            LIVE: 2,
            AWAITING_STATS: 3,
            STATS_UNDER_REVIEW: 4,
            VERIFIED: 9,
            COMPLETED: 10,
          };

          currentList.sort((a, b) => {
            const orderA = sortOrder[a.gameStatus] ?? 5;
            const orderB = sortOrder[b.gameStatus] ?? 5;
            if (orderA !== orderB) return orderA - orderB;
            // Tie-breaker: date descending
            const dateA = new Date(a.scheduled_date + 'T' + a.scheduled_time).getTime();
            const dateB = new Date(b.scheduled_date + 'T' + b.scheduled_time).getTime();
            return dateB - dateA;
          });

          return currentList.map((s) => {
            const statusStyle = STATUS_STYLES[s.gameStatus] ?? 'text-white/40';
            return (
              <Link
                key={s.id}
                href={`/admin/games/${s.id}`}
                className="relative group p-5 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-surface-900/80 to-surface-950/80 backdrop-blur-xl shadow-lg hover:shadow-[0_0_25px_rgba(220,38,38,0.15)] hover:border-red-500/40 transition-all duration-300 overflow-hidden flex items-center justify-between"
              >
                <div className="absolute top-0 left-0 w-full h-full bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest group-hover:text-white/30 transition-colors">
                    {s.game_type}
                    {s.round_label ? ` · ${s.round_label}` : ''} · {formatDate(s.scheduled_date)} {formatTime(s.scheduled_time)}
                  </p>
                  <p className="text-white font-display text-lg mt-1 group-hover:text-red-400 transition-colors">
                    {s.home?.name ?? 'TBD'} <span className="text-white/40">vs</span> {s.away?.name ?? 'TBD'}
                  </p>
                </div>
                <span className={`relative z-10 text-[10px] font-mono uppercase px-3 py-1 rounded-full border border-white/[0.06]/50 shadow-sm ${statusStyle}`}>
                  {s.gameStatus.replace(/_/g, ' ')}
                </span>
              </Link>
            );
          });
        })()}
      </div>
    </div>
  );
}

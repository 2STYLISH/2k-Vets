import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import MatchCenter from '@/components/MatchCenter';
import SponsorSlideshow from '@/components/SponsorSlideshow';

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: upcoming }, { data: awards }, { data: recentGames }] = await Promise.all([
    supabase
      .from('schedules')
      .select('id, scheduled_date, scheduled_time, round_label, game_type, home_team_id, away_team_id, status, home:teams!schedules_home_team_id_fkey(name, logo_url), away:teams!schedules_away_team_id_fkey(name, logo_url)')
      .eq('status', 'SCHEDULED')
      .eq('is_archived', false)
      .order('scheduled_date', { ascending: true })
      .limit(3),
    supabase.from('awards').select('id, award_type, winner_player_id').eq('status', 'PUBLISHED').limit(3),
    supabase
      .from('games')
      .select('id, short_id, home_score, away_score, schedule:schedules(scheduled_date, scheduled_time, game_type, round_label, tournament:tournaments(name, logo_url)), home:teams!games_home_team_id_fkey(name, logo_url, logo_path), away:teams!games_away_team_id_fkey(name, logo_url, logo_path)')
      .in('status', ['VERIFIED', 'COMPLETED'])
      .order('verified_at', { ascending: false })
      .limit(50),
  ]);

  const sortedGames = (recentGames || []).sort((a: any, b: any) => {
    const dateTimeA = a.schedule?.scheduled_date ? new Date(`${a.schedule.scheduled_date}T${a.schedule.scheduled_time || '00:00:00'}`).getTime() : 0;
    const dateTimeB = b.schedule?.scheduled_date ? new Date(`${b.schedule.scheduled_date}T${b.schedule.scheduled_time || '00:00:00'}`).getTime() : 0;
    return dateTimeB - dateTimeA;
  }).slice(0, 20);

  return (
    <>
      <div className="flex flex-col gap-4 md:gap-6 h-full justify-center">

        {/* Match Center */}
        {sortedGames && sortedGames.length > 0 && (
          <section className="animate-fade-in">
            <MatchCenter games={sortedGames} />
          </section>
        )}

        {/* Hero Banner */}
        <section className="animate-slide-up flex-1 relative flex flex-col overflow-hidden rounded-xl surface-elevated border border-white/10">
          <div className="w-full flex-1 relative min-h-[180px] md:min-h-[200px] overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/bg-container.png')" }}
            />
          </div>
          <div className="relative p-5 md:p-8 bg-[#111827] border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-display text-white tracking-[0.15em] uppercase">
                  2K VETERANS LEAGUE
                </h2>
                <p className="text-[10px] sm:text-xs font-mono text-white/50 uppercase tracking-[0.2em] mt-2 font-bold">
                  Philippine NBA 2K Pro-Am Competition
                </p>
              </div>
              <div className="flex flex-wrap justify-center sm:justify-end gap-4 w-full sm:w-auto">
                <Link href="/schedule" className="btn-primary flex-1 sm:flex-none text-center justify-center">VIEW SCHEDULE</Link>
                <Link href="/tournaments" className="btn-secondary flex-1 sm:flex-none text-center justify-center">TOURNAMENTS</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

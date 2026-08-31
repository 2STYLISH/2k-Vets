import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import MatchCenter from '@/components/MatchCenter';
import SponsorRails from '@/components/SponsorRails';

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
      .select('id, home_score, away_score, schedule:schedules(scheduled_date, scheduled_time, game_type, round_label, tournament:tournaments(name, logo_url)), home:teams!games_home_team_id_fkey(name, logo_url), away:teams!games_away_team_id_fkey(name, logo_url)')
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
      {/* Fixed sponsor rails at viewport edges */}
      <SponsorRails />

      <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 md:gap-6 overflow-hidden">
        {/* Match Center */}
        {sortedGames && sortedGames.length > 0 && (
          <section className="animate-fade-in">
            <MatchCenter games={sortedGames} />
          </section>
        )}

        {/* Hero Banner */}
        <section className="animate-slide-up flex-1 relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-navy-900/50 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <div
            className="w-full flex-1 bg-cover bg-center bg-no-repeat min-h-[80px]"
            style={{ backgroundImage: "url('/bg-container.png')" }}
          />
          <div className="relative p-4 md:p-6 bg-navy-900/80 backdrop-blur-md border-t border-white/[0.06]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-display text-white tracking-[0.15em] uppercase title-glow">
                  2K VETERANS LEAGUE
                </h2>
                <p className="text-xs font-mono text-white/40 uppercase tracking-[0.2em] mt-1">
                  Philippine NBA 2K Pro-Am Competition
                </p>
              </div>
              <div className="flex flex-wrap justify-center sm:justify-end gap-3">
                <Link href="/schedule" className="btn-primary">VIEW SCHEDULE</Link>
                <Link href="/tournaments" className="btn-secondary">TOURNAMENTS</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

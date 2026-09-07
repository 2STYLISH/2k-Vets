'use client';

import { formatDate, formatTime } from '@/lib/format';
import Link from 'next/link';

export default function UpcomingSchedulesList({ schedules, teamIds }: { schedules: any[], teamIds: string[] }) {
  if (!schedules || schedules.length === 0) return null;

  return (
    <section className="surface-elevated rounded-xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display text-white tracking-widest">UPCOMING MATCHES</h2>
      </div>
      <div className="space-y-2">
        {schedules.map((s: any) => {
          const home = Array.isArray(s.home) ? s.home[0] : s.home;
          const away = Array.isArray(s.away) ? s.away[0] : s.away;
          const tourney = Array.isArray(s.tournament) ? s.tournament[0] : s.tournament;
          const isHome = teamIds.includes(s.home_team_id);
          const myTeam = isHome ? home : away;
          const opponent = isHome ? away : home;
          const oppSlug = opponent?.slug;

          return (
            <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-[#111827]">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-white text-base font-display tracking-[0.1em] uppercase">
                    {myTeam?.name || 'Unknown'} <span className="text-white/30 mx-2 text-xs font-mono font-bold">VS</span> {opponent?.name || 'Unknown'}
                  </p>
                  {tourney && <p className="text-[10px] text-white/30 font-mono uppercase mt-1">{tourney.name} {s.round_label ? `· ${s.round_label}` : ''}</p>}
                </div>
              </div>
              <div className="text-right">
                {s.scheduled_date && (
                  <p className="text-sm font-mono font-bold text-white">{formatDate(s.scheduled_date)}</p>
                )}
                {s.scheduled_time && (
                  <p className="text-[10px] text-white/50 font-mono uppercase tracking-widest">{formatTime(s.scheduled_time)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

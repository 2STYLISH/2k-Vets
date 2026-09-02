'use client';

import { useState } from 'react';
import Link from '@/components/HiddenLink';
import { formatGameUrl } from '@/lib/format';

export default function ScheduleAccordion({ 
  tournamentName, 
  games, 
  defaultExpanded = false 
}: { 
  tournamentName: string;
  games: any[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Group games by date inside this tournament
  const groupedByDate = new Map<string, any[]>();
  games.forEach(g => {
    const list = groupedByDate.get(g.scheduled_date) ?? [];
    list.push(g);
    groupedByDate.set(g.scheduled_date, list);
  });

  return (
    <div className="card overflow-hidden transition-all">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-white/[0.03] transition-colors text-left gap-4"
      >
        <h2 className="text-xl md:text-2xl font-display text-white uppercase tracking-[0.1em] flex-1 min-w-0 truncate pr-2">{tournamentName}</h2>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-mono bg-flag-gold/10 border border-flag-gold/20 text-flag-gold px-3 py-1 rounded-lg uppercase tracking-widest font-bold">
            {games.length} {games.length === 1 ? 'GAME' : 'GAMES'}
          </span>
          <span className={`text-white/30 font-mono text-sm transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="p-5 md:p-8 space-y-8 border-t border-white/[0.06] bg-white/[0.02]">
          {[...groupedByDate.entries()].map(([date, list]) => (
            <div key={date}>
              <p className="text-xs font-mono text-white/50 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-white/[0.06] font-bold">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map((g: any) => {
                  const displayTime = g.scheduled_time 
                    ? new Date(`1970-01-01T${g.scheduled_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
                    : '';
                  const gameId = g.games?.[0]?.id;
                  const shortId = g.games?.[0]?.short_id;
                  const isComplete = g.status === 'COMPLETED' && gameId;

                  const CardContent = (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.15em]">{displayTime}</p>
                        <span className={`text-[9px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-lg border ${
                          g.status === 'COMPLETED' ? 'bg-white/[0.06] text-white/40 border-white/[0.06]' :
                          g.status === 'IN_PROGRESS' ? 'bg-flag-red/10 text-flag-red border-flag-red/20 shadow-sm' :
                          'bg-navy-900 text-white/50 border-white/[0.06]'
                        }`}>
                          {g.status === 'IN_PROGRESS' ? 'LIVE' : g.status === 'SCHEDULED' ? 'UPCOMING' : g.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-base">
                        <p className="text-white/90 font-display tracking-[0.1em] uppercase truncate flex-1 min-w-0 group-hover/card:text-white transition-colors font-bold">{g.home?.name ?? 'TBD'}</p>
                        <span className="text-white/20 font-mono text-[10px] mx-3 shrink-0 font-bold">VS</span>
                        <p className="text-white/90 font-display tracking-[0.1em] uppercase truncate flex-1 min-w-0 text-right group-hover/card:text-white transition-colors font-bold">{g.away?.name ?? 'TBD'}</p>
                      </div>
                      {g.round_label && <p className="text-[10px] text-flag-red mt-4 uppercase font-mono tracking-[0.15em] font-semibold">{g.round_label}</p>}
                    </>
                  );

                  return isComplete ? (
                    <Link key={g.id} href={formatGameUrl(gameId, shortId, g.home?.name, g.away?.name)} className="group/card relative block p-5 rounded-xl border border-white/[0.06] bg-navy-900/70 backdrop-blur-sm shadow-sm hover:border-flag-red hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-navy rounded-r" />
                      {CardContent}
                    </Link>
                  ) : (
                    <div key={g.id} className="group/card relative block p-5 rounded-xl border border-white/[0.06] bg-navy-800/60 backdrop-blur-sm shadow-sm overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${g.status === 'IN_PROGRESS' ? 'bg-flag-red animate-pulse-glow' : 'bg-navy-200'}`} />
                      {CardContent}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

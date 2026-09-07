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
    <div className="surface-elevated rounded-xl overflow-hidden transition-all">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-white/5 transition-colors text-left gap-4 bg-[#1f2937]"
      >
        <h2 className="text-xl md:text-2xl font-display text-white uppercase tracking-[0.1em] flex-1 min-w-0 truncate pr-2">{tournamentName}</h2>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-[10px] font-mono bg-flag-gold/10 border border-flag-gold/20 text-flag-gold px-3 py-1 rounded font-bold uppercase tracking-widest">
            {games.length} {games.length === 1 ? 'GAME' : 'GAMES'}
          </span>
          <span className={`text-white/50 font-mono text-sm transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="p-5 md:p-8 space-y-10 border-t border-white/10 bg-[#111827]">
          {[...groupedByDate.entries()].map(([date, list]) => (
            <div key={date}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-white/10 flex-1" />
                <p className="text-xs font-mono text-white/40 uppercase tracking-[0.2em] font-bold">
                  {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                <div className="h-px bg-white/10 flex-1" />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {list.map((g: any) => {
                  const displayTime = g.scheduled_time 
                    ? new Date(`1970-01-01T${g.scheduled_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
                    : '';
                  const gameId = g.games?.[0]?.id;
                  const shortId = g.games?.[0]?.short_id;
                  const isComplete = g.status === 'COMPLETED' && gameId;

                  const CardContent = (
                    <>
                      <div className="flex justify-between items-start mb-6">
                        <p className="text-[10px] text-white/40 font-mono uppercase tracking-[0.15em] font-bold">{displayTime}</p>
                        <span className={`text-[9px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${
                          g.status === 'COMPLETED' ? 'bg-white/5 text-white/40 border-white/10' :
                          g.status === 'IN_PROGRESS' ? 'bg-flag-red/20 text-flag-red border-flag-red shadow-[0_0_10px_rgba(206,17,38,0.3)]' :
                          'bg-[#1f2937] text-white/50 border-white/20'
                        }`}>
                          {g.status === 'IN_PROGRESS' ? 'LIVE' : g.status === 'SCHEDULED' ? 'UPCOMING' : g.status}
                        </span>
                      </div>
                      
                      {isComplete ? (
                        <div className="flex flex-col gap-4">
                          <div className="flex justify-between items-center text-base">
                            <p className={`font-display tracking-[0.1em] uppercase truncate flex-1 min-w-0 ${isComplete && g.home_score > g.away_score ? 'text-white font-bold' : 'text-white/70'} transition-colors`}>{g.home?.name ?? 'TBD'}</p>
                            <span className={`font-display tracking-wider text-xl ${isComplete && g.home_score > g.away_score ? 'text-white font-bold' : 'text-white/50'}`}>{isComplete ? g.home_score : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center text-base">
                            <p className={`font-display tracking-[0.1em] uppercase truncate flex-1 min-w-0 ${isComplete && g.away_score > g.home_score ? 'text-white font-bold' : 'text-white/70'} transition-colors`}>{g.away?.name ?? 'TBD'}</p>
                            <span className={`font-display tracking-wider text-xl ${isComplete && g.away_score > g.home_score ? 'text-white font-bold' : 'text-white/50'}`}>{isComplete ? g.away_score : '-'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-2">
                          <p className="font-display tracking-[0.12em] uppercase text-white text-center w-full truncate text-base">{g.home?.name ?? 'TBD'}</p>
                          <span className="text-[10px] font-mono text-white/30 font-bold uppercase tracking-widest">VS</span>
                          <p className="font-display tracking-[0.12em] uppercase text-white text-center w-full truncate text-base">{g.away?.name ?? 'TBD'}</p>
                        </div>
                      )}

                      {g.round_label && (
                        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                           <p className="text-[9px] text-flag-gold uppercase font-mono tracking-[0.15em] font-bold">{g.round_label}</p>
                           {isComplete && <span className="text-[9px] text-white/30 font-mono tracking-widest uppercase hover:text-white transition-colors">Box Score →</span>}
                        </div>
                      )}
                    </>
                  );

                  return isComplete ? (
                    <Link key={g.id} href={formatGameUrl(gameId, shortId, g.home?.name, g.away?.name)} className="group/card relative block p-5 rounded-lg border border-white/10 bg-[#1f2937] hover:border-flag-red/50 hover:bg-[#0f1742] transition-all overflow-hidden shadow-md">
                      {CardContent}
                    </Link>
                  ) : (
                    <div key={g.id} className="group/card relative block p-5 rounded-lg border border-white/10 bg-[#1f2937] overflow-hidden shadow-sm">
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

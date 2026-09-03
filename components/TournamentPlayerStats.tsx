'use client';

import { useState } from 'react';
import Link from 'next/link';

type PlayerStats = {
  player: any;
  avg: any;
};

type TeamStats = {
  teamId: string;
  teamName: string;
  players: PlayerStats[];
};

export default function TournamentPlayerStats({ teams }: { teams: TeamStats[] }) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.teamId || '');

  if (teams.length === 0) return null;

  const selectedTeam = teams.find(t => t.teamId === selectedTeamId) || teams[0];

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-display text-white tracking-widest mb-4">PLAYER STATS</h2>
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          {teams.map(t => (
            <button
              key={t.teamId}
              onClick={() => setSelectedTeamId(t.teamId)}
              className={`shrink-0 px-4 py-2 text-xs font-display tracking-widest uppercase rounded border transition-all ${
                selectedTeamId === t.teamId 
                  ? 'bg-flag-red border-flag-red text-white shadow-[0_0_15px_rgba(206,17,38,0.4)]' 
                  : 'bg-white/[0.05] border-white/20 text-white hover:bg-white/[0.1] hover:border-white/40'
              }`}
            >
              {t.teamName}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6 overflow-hidden">
        <h3 className="text-lg font-display text-flag-gold tracking-widest uppercase mb-4">{selectedTeam.teamName}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] font-mono text-white/40 uppercase tracking-widest">
                <th className="pb-3 pr-4 font-normal">Player</th>
                <th className="pb-3 px-2 font-normal text-right">GP</th>
                <th className="pb-3 px-2 font-normal text-right">PTS</th>
                <th className="pb-3 px-2 font-normal text-right">REB</th>
                <th className="pb-3 px-2 font-normal text-right">AST</th>
                <th className="pb-3 px-2 font-normal text-right">STL</th>
                <th className="pb-3 px-2 font-normal text-right">BLK</th>
                <th className="pb-3 pl-2 font-normal text-right">TOV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {selectedTeam.players.map(({ player, avg }) => (
                <tr key={player.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 pr-4">
                    <Link href={`/${player.slug || player.gamertag.toLowerCase()}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-navy-800 shrink-0">
                        {player.photo_path ? (
                          <img src={player.photo_path} alt={player.gamertag} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-50">
                            <img src="/logo.png" className="w-4 h-4 object-contain" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-white group-hover:text-flag-gold transition-colors">{player.gamertag}</span>
                    </Link>
                  </td>
                  {avg ? (
                    <>
                      <td className="py-3 px-2 text-right font-mono text-sm text-white/70">{avg.gp ?? 0}</td>
                      <td className="py-3 px-2 text-right font-mono text-sm text-white">{Number(avg.ppg ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-2 text-right font-mono text-sm text-white">{Number(avg.rpg ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-2 text-right font-mono text-sm text-white">{Number(avg.apg ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-2 text-right font-mono text-sm text-white">{Number(avg.spg ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-2 text-right font-mono text-sm text-white">{Number(avg.bpg ?? 0).toFixed(1)}</td>
                      <td className="py-3 pl-2 text-right font-mono text-sm text-white">{Number(avg.topg ?? 0).toFixed(1)}</td>
                    </>
                  ) : (
                    <td colSpan={8} className="py-3 px-2 text-center text-white/40 italic text-sm">No games played</td>
                  )}
                </tr>
              ))}
              {selectedTeam.players.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-white/40 italic text-sm">No players on roster</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { slugify } from '@/lib/format';

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
              className={`shrink-0 px-4 py-2 text-[10px] font-mono tracking-widest uppercase rounded border transition-all ${
                selectedTeamId === t.teamId 
                  ? 'bg-flag-red border-flag-red text-white' 
                  : 'bg-[#111827] border-white/10 text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              {t.teamName}
            </button>
          ))}
        </div>
      </div>

      <div className="surface-elevated rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10 bg-[#111827]">
          <h3 className="text-sm font-display text-flag-gold tracking-widest uppercase">{selectedTeam.teamName}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-[#111827] border-b border-white/10 text-[9px] font-mono text-white/50 uppercase tracking-widest">
                <th className="py-4 px-6 font-normal">Player</th>
                <th className="py-4 px-4 font-normal text-right">GP</th>
                <th className="py-4 px-4 font-normal text-right">PTS</th>
                <th className="py-4 px-4 font-normal text-right">REB</th>
                <th className="py-4 px-4 font-normal text-right">AST</th>
                <th className="py-4 px-4 font-normal text-right">STL</th>
                <th className="py-4 px-4 font-normal text-right">BLK</th>
                <th className="py-4 px-6 font-normal text-right">TOV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {selectedTeam.players.map(({ player, avg }) => (
                <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-3 px-6">
                    <Link href={`/${player.slug || slugify(player.gamertag)}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-[#111827] shrink-0">
                        {player.photo_path ? (
                          <img src={player.photo_path} alt={player.gamertag} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-50">
                            <img src="/bg-logo.png" className="w-4 h-4 object-contain" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-flag-gold transition-colors">{player.gamertag}</span>
                        {player.position && (
                          <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest mt-0.5">{player.position}</span>
                        )}
                      </div>
                    </Link>
                  </td>
                  {avg ? (
                    <>
                      <td className="py-3 px-4 text-right font-mono text-sm text-white/50">{avg.gamesPlayed ?? 0}</td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-white font-bold">{Number(avg.ppg ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-white/80">{Number(avg.rpg ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-white/80">{Number(avg.apg ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-white/80">{Number(avg.spg ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-white/80">{Number(avg.bpg ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-6 text-right font-mono text-sm text-white/50">{Number(avg.topg ?? 0).toFixed(1)}</td>
                    </>
                  ) : (
                    <td colSpan={7} className="py-3 px-6 text-right text-white/30 italic text-sm font-mono uppercase tracking-widest">No games played</td>
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

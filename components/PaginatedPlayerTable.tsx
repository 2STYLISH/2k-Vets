'use client';

import { useState } from 'react';
import Link from 'next/link';
import { slugify } from '@/lib/format';

type StatsRow = {
  player: any;
  avg: any;
  teamName: string;
};

export default function PaginatedPlayerTable({ rows, showTeamSearch = false }: { rows: StatsRow[], showTeamSearch?: boolean }) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredRows = showTeamSearch && search.trim() !== ''
    ? rows.filter(r => r.teamName.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  return (
    <section>
      {showTeamSearch && (
        <div className="mb-6 flex justify-end">
          <input 
            type="text" 
            placeholder="SEARCH TEAM..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-64 px-4 py-2.5 bg-[#1f2937] border border-white/10 rounded text-white font-mono text-[10px] uppercase tracking-widest focus:outline-none focus:border-flag-red transition-colors placeholder:text-white/30"
          />
        </div>
      )}

      <div className="relative surface-elevated rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono stat-mono">
            <thead>
              <tr className="bg-[#111827] text-[9px] text-white/50 uppercase tracking-widest border-b border-white/10">
                <th className="text-left px-6 py-4 w-10 font-bold">#</th>
                <th className="text-left px-4 py-4 font-bold">Player</th>
                <th className="text-left px-4 py-4 font-bold">Team</th>
                <th className="px-4 py-4 text-right font-bold">GP</th>
                <th className="px-4 py-4 text-right font-bold text-white">PPG</th>
                <th className="px-4 py-4 text-right font-bold text-white">RPG</th>
                <th className="px-4 py-4 text-right font-bold text-white">APG</th>
                <th className="px-4 py-4 text-right font-bold">SPG</th>
                <th className="px-4 py-4 text-right font-bold">BPG</th>
                <th className="px-4 py-4 text-right font-bold">FG%</th>
                <th className="px-4 py-4 text-right font-bold">3P%</th>
                <th className="px-4 py-4 text-right font-bold">FT%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRows.length === 0 && (
                <tr><td colSpan={12} className="px-6 py-10 text-white/40 text-center uppercase tracking-widest text-[10px]">No stats available.</td></tr>
              )}
              {paginatedRows.map(({ player, avg, teamName }, idx) => (
                <tr key={player.id} className="group/row transition-all hover:bg-white/[0.03]">
                  <td className="px-6 py-3.5 text-flag-gold text-[10px] font-bold">{startIndex + idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Link href={`/${player.slug || slugify(player.gamertag)}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-navy-800 shrink-0">
                          {player.photo_path ? (
                            <img src={player.photo_path} alt={player.gamertag} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-50">
                              <img src="/bg-logo.png" className="w-4 h-4 object-contain" />
                            </div>
                          )}
                        </div>
                        <span className="text-white/90 font-body group-hover:text-white transition-colors font-medium">
                          {player.gamertag}
                        </span>
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-white/40 font-mono text-[9px] uppercase tracking-widest group-hover/row:text-white/70 transition-colors">{teamName}</td>
                  <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.gamesPlayed}</td>
                  <td className="px-4 py-3.5 text-right text-white font-bold text-sm">{avg.ppg}</td>
                  <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.rpg}</td>
                  <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.apg}</td>
                  <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.spg}</td>
                  <td className="px-4 py-3.5 text-right text-white/70 group-hover/row:text-white/90 transition-colors">{avg.bpg}</td>
                  <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.fgPct}%</td>
                  <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.tpPct}%</td>
                  <td className="px-4 py-3.5 text-right text-white/50 group-hover/row:text-white/80 transition-colors">{avg.ftPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-between border-t border-white/10 bg-[#111827]">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-[10px] font-mono tracking-widest uppercase rounded border border-white/10 text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-[10px] font-mono tracking-widest uppercase rounded border border-white/10 text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

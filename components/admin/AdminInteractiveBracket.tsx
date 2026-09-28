'use client';

import { useState, useMemo } from 'react';
import BracketTree from '../BracketTree';
import EditMatchupModal from './EditMatchupModal';
import type { Matchup, Team } from '../BracketTree';

export default function AdminInteractiveBracket({ matchups, teams, defaultMatchFormat, layout }: { matchups: Matchup[]; teams: Team[]; defaultMatchFormat?: string; layout?: 'compact' | 'tree' | 'cross_group' }) {
  const [selectedMatchup, setSelectedMatchup] = useState<Matchup | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>('ALL');

  // Derive available groups from matchup team data
  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const m of matchups) {
      const ga = (m.team_a as any)?.group_name;
      const gb = (m.team_b as any)?.group_name;
      if (ga) groups.add(ga);
      if (gb) groups.add(gb);
    }
    return [...groups].sort();
  }, [matchups]);

  const filteredMatchups = useMemo(() => {
    if (groupFilter === 'ALL' || availableGroups.length < 2) return matchups;
    return matchups.filter(m => {
      const ga = (m.team_a as any)?.group_name;
      const gb = (m.team_b as any)?.group_name;
      return ga === groupFilter || gb === groupFilter;
    });
  }, [matchups, groupFilter, availableGroups]);

  return (
    <div className="relative">
      {/* Group filter — only shown when multiple groups exist */}
      {availableGroups.length >= 2 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Group</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setGroupFilter('ALL')}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-widest rounded transition-colors ${groupFilter === 'ALL' ? 'bg-flag-gold text-black font-bold' : 'bg-[#1f2937] text-white/50 hover:text-white border border-white/10'}`}
            >
              All
            </button>
            {availableGroups.map(g => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                className={`px-3 py-1 text-xs font-mono uppercase tracking-widest rounded transition-colors ${groupFilter === g ? 'bg-flag-gold text-black font-bold' : 'bg-[#1f2937] text-white/50 hover:text-white border border-white/10'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      <BracketTree matchups={filteredMatchups} onMatchupClick={setSelectedMatchup} layout={layout} />
      <EditMatchupModal
        matchup={selectedMatchup}
        allTeams={teams}
        isOpen={!!selectedMatchup}
        onClose={() => setSelectedMatchup(null)}
      />
    </div>
  );
}

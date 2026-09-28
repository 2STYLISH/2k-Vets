'use client';

import { useState } from 'react';
import BracketTree from '../BracketTree';
import EditMatchupModal from './EditMatchupModal';
import type { Matchup, Team } from '../BracketTree';

export default function AdminInteractiveBracket({ matchups, teams, defaultMatchFormat, layout }: { matchups: Matchup[]; teams: Team[]; defaultMatchFormat?: string; layout?: 'compact' | 'tree' | 'cross_group' }) {
  const [selectedMatchup, setSelectedMatchup] = useState<Matchup | null>(null);

  return (
    <div className="relative">
      <BracketTree matchups={matchups} onMatchupClick={setSelectedMatchup} layout={layout} />
      <EditMatchupModal
        matchup={selectedMatchup}
        allTeams={teams}
        isOpen={!!selectedMatchup}
        onClose={() => setSelectedMatchup(null)}
      />
    </div>
  );
}

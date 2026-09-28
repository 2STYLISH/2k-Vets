export type Team = { 
  id: string; 
  name: string; 
  slug?: string;
  short_name?: string;
  logo_url?: string | null;
  group_name?: string | null;
} | null;
export type Matchup = {
  id: string;
  round: number;
  slot: number;
  status: string;
  winner_id: string | null;
  bracket_side: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL' | 'PLAY_IN' | 'ROUND_ROBIN' | 'SWISS';
  is_bye?: boolean;
  feeds_into_matchup_id?: string | null;
  loser_feeds_into_matchup_id?: string | null;
  matchNumber?: number;
  sourceA?: string;
  sourceB?: string;
  team_a: Team;
  team_b: Team;
  match_format?: string;
  schedule?: { games?: { id: string }[] };
};

import Link from 'next/link';

export default function BracketTree({ 
  matchups,
  defaultMatchFormat,
  onMatchupClick,
  layout
}: { 
  matchups: Matchup[];
  defaultMatchFormat?: string;
  onMatchupClick?: (matchup: Matchup) => void;
  layout?: 'compact' | 'tree' | 'cross_group';
}) {
  const sortedMatchups = [...matchups].sort((a, b) => {
    const getOrder = (side?: string) => {
      if (side === 'PLAY_IN') return 0;
      if (side === 'WINNERS' || !side) return 1;
      if (side === 'LOSERS') return 2;
      return 3;
    };
    const orderA = getOrder(a.bracket_side);
    const orderB = getOrder(b.bracket_side);
    if (orderA !== orderB) return orderA - orderB;
    if (a.round !== b.round) return a.round - b.round;
    return a.slot - b.slot;
  });

  sortedMatchups.forEach((m, idx) => {
    m.matchNumber = idx + 1;
  });

  sortedMatchups.forEach((m) => {
    const upstreams = sortedMatchups.filter(
      up => up.feeds_into_matchup_id === m.id || up.loser_feeds_into_matchup_id === m.id
    ).sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));

    if (upstreams.length > 0) {
      if (upstreams.length === 2) {
        if (!m.team_a) m.sourceA = upstreams[0].loser_feeds_into_matchup_id === m.id ? `Loser of ${upstreams[0].matchNumber}` : `Winner of ${upstreams[0].matchNumber}`;
        if (!m.team_b) m.sourceB = upstreams[1].loser_feeds_into_matchup_id === m.id ? `Loser of ${upstreams[1].matchNumber}` : `Winner of ${upstreams[1].matchNumber}`;
      } else if (upstreams.length === 1) {
        const u = upstreams[0];
        const text = u.loser_feeds_into_matchup_id === m.id ? `Loser of ${u.matchNumber}` : `Winner of ${u.matchNumber}`;
        if (!m.team_a && !m.team_b) {
          m.sourceB = text;
        } else {
          if (!m.team_a) m.sourceA = text;
          if (!m.team_b) m.sourceB = text;
        }
      }
    }
  });

  const hasByes = sortedMatchups.some((m) => m.is_bye);
  const isTreeLayout = layout === 'tree' || (layout === undefined && hasByes);

  // Auto-detect cross-group: if WINNERS round 1 has more than 4 slots, it's cross-group
  const winnerR1 = sortedMatchups.filter(m => m.bracket_side === 'WINNERS' && m.round === 1);
  const isCrossGroup = layout === 'cross_group' || winnerR1.length >= 8;

  const visibleMatchups = isTreeLayout || isCrossGroup ? sortedMatchups : sortedMatchups.filter(m => !m.is_bye);

  if (isCrossGroup) {
    return <CrossGroupBracket matchups={visibleMatchups} onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />;
  }

  const winners = visibleMatchups.filter((m) => m.bracket_side !== 'LOSERS' && m.bracket_side !== 'GRAND_FINAL' && m.bracket_side !== 'PLAY_IN');
  const losers = visibleMatchups.filter((m) => m.bracket_side === 'LOSERS');
  const grandFinal = visibleMatchups.filter((m) => m.bracket_side === 'GRAND_FINAL');
  const playIns = visibleMatchups.filter((m) => m.bracket_side === 'PLAY_IN');

  const isRoundRobin = winners.length > 0 && winners.every(m => m.bracket_side === 'ROUND_ROBIN');
  const bracketTitle = isRoundRobin ? 'REGULAR SEASON' : 'PLAYOFF BRACKET';

  return (
    <div className="space-y-12">
      {playIns.length > 0 && <BracketSection title="PLAY-IN STAGE" matchups={playIns} onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />}
      {winners.length > 0 && <BracketSection title={bracketTitle} matchups={winners} onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />}
      {losers.length > 0 && <BracketSection title="LOWER BRACKET" matchups={losers} onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />}
      {grandFinal.length > 0 && <BracketSection title="GRAND FINAL" matchups={grandFinal} onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />}
    </div>
  );
}

// ─── Cross-Group Bracket ────────────────────────────────────────────────────
// All columns share the same total bracket height.
// justify-around distributes items so they vertically align across rounds:
//  R1 (4 items) → QF (2 items) → Semi (1 item) → GRAND FINALS ← Semi ← QF ← R1

const BRACKET_H = 880; // px — total height shared by all columns

function BracketCol({
  matchups, label, labelColor = 'text-white/40', align = 'left', onMatchupClick, defaultMatchFormat,
}: {
  matchups: Matchup[]; label: string; labelColor?: string; align?: 'left' | 'right' | 'center';
  onMatchupClick?: (m: Matchup) => void; defaultMatchFormat?: string;
}) {
  if (matchups.length === 0) return null;
  const textAlign = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <div className="flex flex-col w-[260px] shrink-0" style={{ height: BRACKET_H }}>
      <p className={`text-[10px] font-mono uppercase tracking-widest font-semibold mb-3 ${labelColor} ${textAlign}`}>{label}</p>
      <div className="flex-1 flex flex-col justify-around">
        {matchups.map(m => (
          <MatchCard key={m.id} matchup={m} onClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />
        ))}
      </div>
    </div>
  );
}

function CrossGroupBracket({ matchups, onMatchupClick, defaultMatchFormat }: {
  matchups: Matchup[];
  onMatchupClick?: (m: Matchup) => void;
  defaultMatchFormat?: string;
}) {
  const playIns = matchups.filter(m => m.bracket_side === 'PLAY_IN');
  const winners = matchups.filter(m => m.bracket_side === 'WINNERS');

  // Play-in splits
  const playInR1A  = playIns.filter(m => m.round === 1 && m.slot <= 2).sort((a, b) => a.slot - b.slot);
  const playInR2A  = playIns.filter(m => m.round === 2 && m.slot === 1);
  const playInR1B  = playIns.filter(m => m.round === 1 && m.slot > 2).sort((a, b) => a.slot - b.slot);
  const playInR2B  = playIns.filter(m => m.round === 2 && m.slot === 2);
  const hasPlayIn  = playIns.length > 0;

  // Bracket splits — slots 1-4 = left (Group A), slots 5-8 = right (Group B)
  const maxRound   = Math.max(...winners.map(m => m.round), 0);
  const finals     = winners.filter(m => m.round === maxRound);
  const semiL      = winners.filter(m => m.round === maxRound - 1 && m.slot <= 1).sort((a,b) => a.slot - b.slot);
  const semiR      = winners.filter(m => m.round === maxRound - 1 && m.slot > 1).sort((a,b) => a.slot - b.slot);
  const qfL        = winners.filter(m => m.round === maxRound - 2 && m.slot <= 2).sort((a,b) => a.slot - b.slot);
  const qfR        = winners.filter(m => m.round === maxRound - 2 && m.slot > 2).sort((a,b) => a.slot - b.slot);
  const r1L        = winners.filter(m => m.round === 1 && m.slot <= 4).sort((a,b) => a.slot - b.slot);
  const r1R        = winners.filter(m => m.round === 1 && m.slot > 4).sort((a,b) => a.slot - b.slot);

  return (
    <div className="space-y-10">

      {/* ── PLAY-IN STAGE ─────────────────────────────────────────── */}
      {hasPlayIn && (
        <div>
          <h3 className="text-base font-display text-yellow-400 tracking-[0.2em] mb-5 uppercase">Play-In Stage</h3>
          {/* Scrollable play-in container */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-10" style={{ minWidth: 'max-content' }}>

              {/* Group A */}
              <div className="shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <p className="text-xs font-mono text-blue-400 font-bold uppercase tracking-widest">GROUP A Play-In</p>
                </div>
                <div className="flex gap-6 items-stretch">
                  {playInR1A.length > 0 && (
                    <div className="w-[280px] flex flex-col">
                      <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-3">Round 1</p>
                      <div className="flex flex-col gap-4">
                        {playInR1A.map(m => <MatchCard key={m.id} matchup={m} onClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />)}
                      </div>
                    </div>
                  )}
                  {playInR2A.length > 0 && (
                    <div className="w-[280px] flex flex-col">
                      <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-3">Decider</p>
                      <div className="flex-1 flex flex-col justify-center">
                        {playInR2A.map(m => <MatchCard key={m.id} matchup={m} onClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-px bg-white/10 self-stretch mx-2 shrink-0" />

              {/* Group B */}
              <div className="shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <p className="text-xs font-mono text-red-400 font-bold uppercase tracking-widest">GROUP B Play-In</p>
                </div>
                <div className="flex gap-6 items-stretch">
                  {playInR1B.length > 0 && (
                    <div className="w-[280px] flex flex-col">
                      <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-3">Round 1</p>
                      <div className="flex flex-col gap-4">
                        {playInR1B.map(m => <MatchCard key={m.id} matchup={m} onClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />)}
                      </div>
                    </div>
                  )}
                  {playInR2B.length > 0 && (
                    <div className="w-[280px] flex flex-col">
                      <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-3">Decider</p>
                      <div className="flex-1 flex flex-col justify-center">
                        {playInR2B.map(m => <MatchCard key={m.id} matchup={m} onClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── CROSS-GROUP PLAYOFFS BRACKET ──────────────────────────── */}
      {winners.length > 0 && (
        <div>
          <h3 className="text-base font-display text-flag-gold tracking-[0.2em] mb-5 uppercase">Cross-Group Playoffs</h3>
          {/* Scrollable bracket — never breaks container, just scrolls left/right */}
          <div className="overflow-x-auto pb-6">
            <div className="flex gap-4 items-stretch" style={{ minWidth: 'max-content', height: BRACKET_H }}>

              {/* ── LEFT SIDE (Group A) — outermost to innermost ── */}
              <BracketCol matchups={r1L} label="1st Round (Group A)" labelColor="text-blue-400" onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />
              {qfL.length > 0 && <BracketCol matchups={qfL} label="Quarterfinals" onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />}
              {semiL.length > 0 && <BracketCol matchups={semiL} label="Semifinals" onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />}

              {/* ── CENTER — GRAND FINALS (wider + golden highlight) ── */}
              {finals.length > 0 && (
                <div className="flex flex-col w-[300px] shrink-0 mx-4" style={{ height: BRACKET_H }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-flag-gold/60" />
                    <p className="text-sm font-display font-bold text-flag-gold uppercase tracking-widest px-2">Grand Finals</p>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-flag-gold/60" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    {finals.map(m => <MatchCard key={m.id} matchup={m} onClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} variant="grand-finals" />)}
                  </div>
                </div>
              )}

              {/* ── RIGHT SIDE (Group B) — innermost to outermost ── */}
              {semiR.length > 0 && <BracketCol matchups={semiR} label="Semifinals" align="right" onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />}
              {qfR.length > 0 && <BracketCol matchups={qfR} label="Quarterfinals" align="right" onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />}
              <BracketCol matchups={r1R} label="1st Round (Group B)" labelColor="text-red-400" align="right" onMatchupClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />

            </div>
          </div>
        </div>
      )}
    </div>
  );
}





function BracketSection({ title, matchups, onMatchupClick, defaultMatchFormat }: { title: string; matchups: Matchup[]; onMatchupClick?: (matchup: Matchup) => void; defaultMatchFormat?: string }) {
  const rounds = [...new Set(matchups.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div>
      <h3 className="text-xl font-display text-flag-gold tracking-[0.2em] mb-4">{title}</h3>
      <div className="flex gap-6 overflow-x-auto pb-4 pl-6">
        {rounds.map((round) => {
          let label = `ROUND ${round}`;
          if (title === 'GRAND FINAL') {
            label = round === 1 ? 'MATCH 1' : 'MATCH 2';
          } else if (title !== 'PLAY-IN STAGE' && title !== 'REGULAR SEASON') {
            const maxRound = rounds[rounds.length - 1];
            if (round === maxRound) label = 'FINALS';
            else if (round === maxRound - 1) label = 'SEMIFINALS';
            else if (round === maxRound - 2) label = 'QUARTERFINALS';
          }

          return (
            <div key={round} className="flex flex-col justify-around gap-6 min-w-[260px]">
              <p className="text-xs font-mono text-white/50 uppercase tracking-widest mb-2 font-semibold">
                {label}
              </p>
            {matchups
              .filter((m) => m.round === round)
              .sort((a, b) => a.slot - b.slot)
              .map((m) => (
                <MatchCard key={m.id} matchup={m} onClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({ matchup, onClick, defaultMatchFormat, variant = 'default' }: { matchup: Matchup; onClick?: (m: Matchup) => void; defaultMatchFormat?: string; variant?: 'default' | 'grand-finals' }) {
  const isComplete = matchup.status === 'COMPLETED';
  const href = `/bracket/${(matchup as any).short_id || matchup.id}`;
  const boFormat = matchup.match_format || defaultMatchFormat;

  let scoreA: number | undefined;
  let scoreB: number | undefined;

  const directSeries = (matchup as any).series;
  const schedSeries = (() => {
    const sched = Array.isArray((matchup as any).schedule) ? (matchup as any).schedule[0] : (matchup as any).schedule;
    if (!sched) return null;
    return Array.isArray(sched.series) ? sched.series[0] : sched.series;
  })();
  const activeSeries = (directSeries && directSeries.length > 0) ? directSeries[0] : schedSeries;

  if (activeSeries && (activeSeries.team_a_wins > 0 || activeSeries.team_b_wins > 0 || matchup.status === 'IN_PROGRESS' || matchup.status === 'COMPLETED')) {
    const s = activeSeries;
    if (s.team_a_id && matchup.team_a && s.team_a_id === matchup.team_a.id) {
      scoreA = s.team_a_wins;
      scoreB = s.team_b_wins;
    } else if (s.team_b_id && matchup.team_a && s.team_b_id === matchup.team_a.id) {
      scoreA = s.team_b_wins;
      scoreB = s.team_a_wins;
    } else {
      scoreA = s.team_a_wins;
      scoreB = s.team_b_wins;
    }
  } else if ((matchup as any).schedule) {
    const sched = Array.isArray(matchup.schedule) ? matchup.schedule[0] : matchup.schedule;
    if (sched && sched.games && sched.games.length > 0) {
      const g = sched.games[0];
      if (g && g.status !== 'SCHEDULED') {
        if (matchup.winner_id) {
          scoreA = matchup.winner_id === matchup.team_a?.id ? 1 : 0;
          scoreB = matchup.winner_id === matchup.team_b?.id ? 1 : 0;
        } else {
          scoreA = 0;
          scoreB = 0;
        }
      }
    }
  }

  const innerContent = (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.02),transparent_70%)] pointer-events-none"></div>
      
      <TeamRow name={matchup.team_a?.name} slug={matchup.team_a?.slug} score={scoreA} isWinner={isComplete && matchup.winner_id === matchup.team_a?.id} isByePlaceholder={matchup.is_bye && !matchup.team_a} placeholderText={matchup.sourceA} suppressLink={!onClick} />
      
      <div className="flex items-center gap-2 my-2 relative z-10">
        <div className="flex-1 border-t border-white/[0.06]" />
        <p className={`text-[9px] font-mono font-bold uppercase tracking-widest ${
          matchup.is_bye ? 'text-white/30' : isComplete ? 'text-flag-red' : matchup.status === 'SCHEDULED' ? 'text-white/40' : matchup.team_a && matchup.team_b ? 'text-flag-gold' : 'text-white/30'
        }`}>
          {matchup.is_bye ? 'BYE' : isComplete ? 'FINAL' : matchup.status === 'SCHEDULED' ? 'SCHEDULED' : matchup.team_a && matchup.team_b ? 'VS' : 'TBD'}
        </p>
        <div className="flex-1 border-t border-white/[0.06]" />
        {boFormat && (
          <div className="text-[8px] font-mono font-bold bg-white/[0.06] text-white/50 px-1.5 py-0.5 rounded shadow-sm border border-white/[0.08] uppercase">
            {boFormat === 'TWICE_TO_BEAT' ? '2x TO BEAT' : boFormat}
          </div>
        )}
      </div>
      
      <TeamRow name={matchup.team_b?.name} slug={matchup.team_b?.slug} score={scoreB} isWinner={isComplete && matchup.winner_id === matchup.team_b?.id} isByePlaceholder={matchup.is_bye && !matchup.team_b} placeholderText={matchup.sourceB} suppressLink={!onClick} />
    </>
  );

  const cardClasses = variant === 'grand-finals'
    ? 'w-full text-left relative surface-elevated rounded-xl p-4 block transition-all z-10 border-2 border-flag-gold shadow-[0_0_20px_rgba(212,160,23,0.3)] hover:-translate-y-0.5 scale-110 transform origin-center my-4'
    : 'w-full text-left relative surface-elevated rounded-xl border border-white/10 p-4 block hover:border-flag-gold hover:-translate-y-0.5 transition-all z-10';

  return (
    <div className={`relative group/bracketcard ml-6 ${matchup.is_bye ? 'opacity-0 pointer-events-none' : ''}`}>
      <div className="absolute -left-7 top-1/2 -translate-y-1/2 text-sm font-mono font-bold transition-colors text-white/40 drop-shadow-md group-hover/bracketcard:text-flag-gold w-6 text-right pr-2">
        {matchup.matchNumber}
      </div>
      {onClick ? (
        <button onClick={() => onClick(matchup)} className={`${cardClasses} cursor-pointer`}>
          {innerContent}
        </button>
      ) : (
        <a href={href} className={cardClasses}>
          {innerContent}
        </a>
      )}
    </div>
  );
}

function TeamRow({ name, slug, score, isWinner, isByePlaceholder, placeholderText, suppressLink }: { name?: string; slug?: string; score?: number | null; isWinner: boolean; isByePlaceholder?: boolean; placeholderText?: string; suppressLink?: boolean }) {
  if (isByePlaceholder) {
    return <p className="text-sm font-display tracking-widest text-white/30 italic uppercase text-center">BYE</p>;
  }
  return (
    <div className={`flex items-center justify-between text-sm font-display tracking-widest uppercase truncate relative z-10 ${isWinner ? 'text-flag-gold font-bold drop-shadow-[0_0_8px_rgba(212,160,23,0.5)]' : 'text-white'} ${!name ? 'text-white/40 italic text-[12px]' : ''}`}>
      <span className="truncate">
        {slug && !suppressLink ? (
          <Link href={`/teams/${slug}`} className="hover:text-flag-gold hover:underline transition-colors">{name}</Link>
        ) : (
          name ?? placeholderText ?? 'TBD'
        )}
      </span>
      {score !== undefined && score !== null && (
        <span className={`ml-2 font-mono text-[16px] px-2 py-0.5 rounded shadow-inner border ${isWinner ? 'bg-flag-gold/10 text-flag-gold border-flag-gold/30' : 'bg-white/[0.04] text-white border-white/[0.06]'}`}>{score}</span>
      )}
    </div>
  );
}

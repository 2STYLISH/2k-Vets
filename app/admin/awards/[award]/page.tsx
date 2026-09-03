import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import PublishAwardButton from '@/components/admin/PublishAwardButton';
import FinalizeAwardForm from '@/components/admin/FinalizeAwardForm';

const VALID_TYPES = [
  'MYTHICAL_TEAM',
  'FINALS_MVP', 'OVERALL_MVP', 'OVERALL_DPOY',
];

const AWARD_DESC: Record<string, string> = {
  MYTHICAL_TEAM: 'Mythical Team (Customizable Name, 5 Players)',
  FINALS_MVP: 'Finals Most Valuable Player',
  OVERALL_MVP: 'Overall Most Valuable Player',
  OVERALL_DPOY: 'Overall Defensive Player of the Year',
};

export default async function AdminAwardDetailPage({ params, searchParams }: { params: { award: string }, searchParams: { tournament_id?: string } }) {
  const awardType = params.award.toUpperCase();
  if (!VALID_TYPES.includes(awardType)) notFound();

  const supabase = createClient();
  const tournamentId = searchParams.tournament_id;
  if (!tournamentId) notFound(); // Or handle gracefully, but we expect it now

  let { data: award } = await supabase
    .from('awards')
    .select('*, winner:players!awards_winner_player_id_fkey(id, gamertag)')
    .eq('award_type', awardType)
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  let teamWinners: any[] = [];
  if (awardType === 'MYTHICAL_TEAM' && award?.winner_player_ids?.length) {
    const { data: players } = await supabase
      .from('players')
      .select('id, gamertag')
      .in('id', award.winner_player_ids);
    teamWinners = players ?? [];
  }

  // If award doesn't exist for this tournament, we can create it dynamically or just let the finalize form handle it.
  // Actually, FinalizeAwardForm expects an awardId to update, or it inserts.
  // We should pass tournamentId to FinalizeAwardForm so it can insert if it doesn't exist.

  const { data: rosterPlayers } = await supabase
    .from('tournament_rosters')
    .select('player:players(id, gamertag)')
    .eq('tournament_id', tournamentId);
  const eligiblePlayers = rosterPlayers?.map((r: any) => ({ id: r.player.id, gamertag: r.player.gamertag })).sort((a,b) => a.gamertag.localeCompare(b.gamertag)) ?? [];

  return (
    <div className="space-y-8">
      <BackButton />

      {/* Header */}
      <div className="pb-6 border-b border-white/[0.06]">
        <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Award</p>
        <h1 className="text-3xl text-white mb-1">{awardType.replace(/_/g, ' ')}</h1>
        <p className="text-white/40 text-sm">{AWARD_DESC[awardType] ?? ''}</p>
        {award?.status && (
          <span className={`mt-3 inline-block text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
            award.status === 'PUBLISHED' ? 'text-white bg-navy-50'
            : award.status === 'FINALIZED' ? 'text-silver-200 bg-navy-50'
            : 'text-white/40 bg-white/[0.03]'
          }`}>
            {award.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Finalize form — admin picks winner from tournament players */}
      {award?.status !== 'PUBLISHED' ? (
        <FinalizeAwardForm
          awardType={awardType}
          awardId={award?.id ?? null}
          tournamentId={tournamentId}
          currentWinnerId={award?.winner_player_id ?? null}
          currentWinnerIds={award?.winner_player_ids ?? []}
          currentCustomName={award?.custom_name ?? ''}
          candidates={eligiblePlayers}
        />
      ) : (
        <div className="card p-6 border-flag-gold/20 bg-flag-gold/5 flex flex-col items-center justify-center text-center py-10">
          <p className="text-[10px] font-mono text-flag-gold uppercase tracking-widest mb-2">OFFICIAL WINNER</p>
          <p className="text-3xl text-white font-display tracking-widest">
            {awardType === 'MYTHICAL_TEAM' 
              ? award?.custom_name || 'Mythical Team'
              : (award as any).winner?.gamertag ?? 'Unknown'}
          </p>
          {awardType === 'MYTHICAL_TEAM' && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {teamWinners.map(w => (
                <span key={w.id} className="text-sm font-mono text-white/70 bg-black/20 px-3 py-1 rounded-full border border-flag-gold/20">{w.gamertag}</span>
              ))}
            </div>
          )}
          <p className="text-white/30 text-sm font-mono uppercase tracking-widest mt-6">
            ✓ Published to public awards page
          </p>
        </div>
      )}

      {/* Publish panel */}
      {award?.status === 'FINALIZED' && (
        <div className="card p-5 flex items-center justify-between">
          <div>
            {awardType === 'MYTHICAL_TEAM' ? (
              <div className="text-white/50 text-sm">
                Winner: <span className="text-white font-display">{award?.custom_name || 'Mythical Team'}</span>
                <span className="ml-2 text-xs text-white/30 font-mono">({teamWinners.length} players)</span>
              </div>
            ) : (
              <p className="text-white/50 text-sm">
                Winner: <span className="text-white font-display">{(award as any).winner?.gamertag}</span>
              </p>
            )}
            <p className="text-[10px] font-mono text-white/40 uppercase mt-1">
              Finalized — not yet visible to the public
            </p>
          </div>
          <PublishAwardButton
            awardId={award.id}
            awardType={awardType}
            winnerName={(award as any).winner?.gamertag ?? ''}
          />
        </div>
      )}
    </div>
  );
}

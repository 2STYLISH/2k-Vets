import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import BackButton from '@/components/BackButton';
import TournamentSelect from '@/components/TournamentSelect';
import { slugify } from '@/lib/format';

const AWARD_TYPES = [
  'MYTHICAL_TEAM',
  'FINALS_MVP', 'OVERALL_MVP', 'OVERALL_DPOY',
];

const STATUS_LABEL: Record<string, { label: string; style: string }> = {
  DRAFT:        { label: 'Draft',        style: 'text-white/40 bg-white/[0.03] border border-white/10' },
  UNDER_REVIEW: { label: 'Under Review', style: 'text-white/30 bg-white/[0.03] border border-white/10' },
  FINALIZED:    { label: 'Finalized',    style: 'text-white/70 bg-[#1f2937] border border-white/20' },
  PUBLISHED:    { label: 'Published',    style: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' },
};

export default async function AdminAwardsPage({ searchParams }: { searchParams: { tournament_id?: string } }) {
  const supabase = createClient();
  const activeParam = searchParams.tournament_id;

  const { data: tournaments } = await supabase.from('tournaments').select('id, name').order('created_at', { ascending: false });
  const activeTournamentObj = activeParam ? (tournaments ?? []).find(t => t.id === activeParam || slugify(t.name) === activeParam) : tournaments?.[0];
  const activeTournamentId = activeTournamentObj?.id;
  const activeTournamentSlug = activeTournamentObj ? slugify(activeTournamentObj.name) : '';

  const { data: awards } = await supabase
    .from('awards')
    .select('id, award_type, status, winner:players!awards_winner_player_id_fkey(gamertag)')
    .eq('tournament_id', activeTournamentId);

  // Count candidates per award for display
  const { data: candidateCounts } = await supabase
    .from('award_candidates')
    .select('award_id'); // We'd ideally join to ensure it's for this tournament, but candidates belong to awards, and we're filtering awards

  const countByAward = new Map<string, number>();
  const awardIdMap = new Map<string, string>();
  (awards ?? []).forEach((a: any) => awardIdMap.set(a.award_type, a.id));
  (candidateCounts ?? []).forEach((c: any) => {
    countByAward.set(c.award_id, (countByAward.get(c.award_id) ?? 0) + 1);
  });

  const byType = new Map((awards ?? []).map((a: any) => [a.award_type, a]));

  return (
    <div className="space-y-6">
      <BackButton />
      <div className="section-header !mb-6 !pb-0 !border-b-0">
        <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">Admin / Awards</p>
        <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase mb-4">AWARDS</h1>
        <p className="text-white/40 text-sm mt-4 max-w-2xl mb-6">
          Candidate rankings auto-update every time you verify a game. The final winner is
          always selected manually — nothing publishes automatically.
        </p>

        <div className="flex items-center gap-4 bg-[#1f2937] p-2 rounded-xl border border-white/10 w-fit">
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold pl-2">Tournament</p>
          <TournamentSelect 
            tournaments={tournaments ?? []} 
            activeId={activeTournamentId} 
            basePath="/admin/awards" 
          />
        </div>
      </div>

      {!activeTournamentId ? (
        <p className="text-white/40 text-sm">Please create a tournament first.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {AWARD_TYPES.map((type) => {
            const record = byType.get(type) as any;
            const status = record?.status ?? 'DRAFT';
            const { label, style } = STATUS_LABEL[status] ?? STATUS_LABEL.DRAFT;
            const awardId = awardIdMap.get(type);
            const candidateCount = awardId ? (countByAward.get(awardId) ?? 0) : 0;

            return (
              <div key={type} className="surface-elevated rounded-xl border border-white/10 p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm text-white font-display tracking-widest">
                      {type.replace(/_/g, ' ')}
                    </p>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${style}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase">
                    {status === 'PUBLISHED' || status === 'FINALIZED'
                      ? `Winner: ${record?.winner?.gamertag ?? 'Unknown'}`
                      : 'No candidates yet'}
                  </p>
                </div>
                <Link
                  href={`/admin/awards/${type}?tournament_id=${activeTournamentSlug}`}
                  className="btn-secondary text-xs px-4 py-2 whitespace-nowrap"
                >
                  MANAGE →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

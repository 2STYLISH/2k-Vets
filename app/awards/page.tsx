import { createClient } from '@/lib/supabase/server';
import TournamentSelect from '@/components/TournamentSelect';
import Link from '@/components/HiddenLink';

const TROPHY: Record<string, string> = {
  BEST_PG: '🏆',
  BEST_SG: '🏆',
  BEST_SF: '🏆',
  BEST_PF: '🏆',
  BEST_CENTER: '🏆',
  FINALS_MVP: '🏆',
  OVERALL_MVP: '🏆',
  OVERALL_DPOY: '🏆',
};

export default async function PublicAwardsPage({ searchParams }: { searchParams: { tournament_id?: string } }) {
  const supabase = createClient();

  const { data: tournaments } = await supabase.from('tournaments').select('id, name').order('created_at', { ascending: false });
  const activeTournamentId = searchParams.tournament_id || tournaments?.[0]?.id;

  const { data: awards } = await supabase
    .from('awards')
    .select('id, award_type, admin_notes, publish_notes, published_at, winner_player_id, winner:players!awards_winner_player_id_fkey(gamertag, slug, photo_path)')
    .eq('status', 'PUBLISHED')
    .eq('tournament_id', activeTournamentId)
    .order('published_at', { ascending: true });

  // Note: we removed team_id from players table globally. A player doesn't have a team.
  // The player belongs to a team via tournament_rosters for this tournament.
  // We can fetch the player's team for this tournament to display on the award card.
  const winnerIds = awards?.map((a: any) => a.winner_player_id).filter(Boolean) || [];
  let playerTeams = new Map<string, string>();

  if (activeTournamentId && winnerIds.length > 0) {
    const { data: rosters } = await supabase
      .from('tournament_rosters')
      .select('player_id, team:teams(name)')
      .eq('tournament_id', activeTournamentId)
      .in('player_id', winnerIds);

    (rosters ?? []).forEach((r: any) => {
      playerTeams.set(r.player_id, r.team?.name);
    });
  }

  const activeTournamentName = tournaments?.find(t => t.id === activeTournamentId)?.name ?? 'Awards';

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="section-header">
          <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">2K Veterans League Awards</p>
          <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase title-glow">
            {activeTournamentName}
          </h1>
        </div>

        <div className="mt-6">
          <TournamentSelect
            tournaments={tournaments ?? []}
            activeId={activeTournamentId}
            basePath="/awards"
          />
        </div>
      </div>

      {!activeTournamentId ? (
        <p className="text-white/40 font-mono uppercase tracking-widest text-sm">No tournaments found.</p>
      ) : (awards ?? []).length === 0 ? (
        <div className="card p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,160,23,0.04),transparent_50%)]" />
          <p className="text-white/40 text-sm font-mono uppercase tracking-widest relative z-10">
            No awards published yet for this tournament. Admins are reviewing candidates.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(awards ?? []).map((a: any) => {
            const teamName = playerTeams.get(a.winner_player_id);
            const playerSlug = a.winner?.slug || a.winner?.gamertag?.toLowerCase();
            return (
              <div key={a.id} className="relative card p-8 transition-all duration-500 group overflow-hidden hover:border-flag-gold/40 hover:shadow-[0_8px_32px_rgba(212,160,23,0.12)] hover:-translate-y-1">
                {/* Gold accent top stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-flag-gold/60 via-flag-gold to-flag-gold/60 opacity-60 group-hover:opacity-100 transition-opacity" />

                {/* Subtle glow */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-flag-gold/[0.03] rounded-full blur-3xl group-hover:bg-flag-gold/[0.06] transition-colors" />
                
                <div className="flex flex-col items-center text-center gap-2 mb-6 relative z-10">
                  <span className="text-5xl mb-2 transform group-hover:scale-110 transition-transform duration-500">{TROPHY[a.award_type] ?? '🏆'}</span>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-flag-gold/40 to-transparent mb-2" />
                  <h2 className="text-lg text-white font-display tracking-[0.15em] uppercase group-hover:text-flag-gold transition-colors">
                    {a.award_type?.replace(/_/g, ' ') || 'Unknown Award'}
                  </h2>
                  <p className="text-[9px] font-mono text-white/40 uppercase tracking-[0.3em]">2K Veterans League</p>
                </div>

                <div className="relative z-10 bg-white/[0.03] backdrop-blur-sm rounded-2xl p-6 border border-white/[0.06] group-hover:border-flag-gold/20 transition-colors">
                  {a.winner ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="relative">
                        {a.winner.photo_path ? (
                          <img src={a.winner.photo_path} alt={a.winner.gamertag} className="w-20 h-20 object-cover rounded-full border-2 border-flag-gold/30 bg-navy-900 shadow-md" />
                        ) : (
                          <div className="w-20 h-20 rounded-full border-2 border-flag-gold/30 bg-navy-900 shadow-md flex items-center justify-center overflow-hidden p-3">
                            <img src="/logo2.png" alt={a.winner.gamertag} className="w-full h-full object-contain opacity-50" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-flag-gold w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-md text-white font-bold">✓</div>
                      </div>
                      <div>
                        <Link href={`/${playerSlug}`} className="block text-2xl text-white font-display tracking-[0.12em] mb-1 uppercase hover:text-flag-gold transition-colors">
                          {a.winner.gamertag}
                        </Link>
                        {teamName ? (
                          <p className="text-xs text-white/40 font-mono tracking-widest uppercase">{teamName}</p>
                        ) : (
                          <p className="text-xs text-white/30 font-mono tracking-widest uppercase italic">Free Agent</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center py-4">
                      <p className="text-3xl text-white/20 font-display tracking-wide mb-1 uppercase">—</p>
                      <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">TBD</p>
                    </div>
                  )}
                </div>

                {a.publish_notes && a.admin_notes && (
                  <div className="mt-6 text-xs text-white/40 italic border-t border-white/[0.06] pt-4 text-center px-4 relative z-10 leading-relaxed font-serif">
                    "{a.admin_notes}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

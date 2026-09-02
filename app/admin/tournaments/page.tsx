import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import TournamentStatusToggle from '@/components/admin/TournamentStatusToggle';
import BackButton from '@/components/BackButton';
import TournamentAdminActions from '@/components/admin/TournamentAdminActions';
import { slugify } from '@/lib/format';

export default async function AdminTournamentsPage() {
  const supabase = createClient();
  
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, format, start_date, end_date, championship_award_name, logo_url')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <BackButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-white/90">TOURNAMENTS</h1>
          <p className="text-white/40 text-sm mt-1">Manage tournament statuses and settings.</p>
        </div>
        <Link href="/admin/tournaments/create" className="btn-primary">
          CREATE TOURNAMENT
        </Link>
      </div>

      <div className="space-y-4">
        {(tournaments ?? []).length === 0 && <p className="relative group p-6 rounded-2xl border border-white/[0.06] bg-navy-900/70/80 text-white/40 text-sm">No tournaments yet.</p>}
        {(tournaments ?? []).map((t) => (
          <div key={t.id} className="relative group p-6 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-surface-900/80 to-surface-950/80 backdrop-blur-xl shadow-lg hover:border-white/10 transition-all duration-300 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div>
                <p className="text-2xl text-white font-display uppercase tracking-widest mb-1.5 drop-shadow-sm">{t.name}</p>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-white/30 font-bold uppercase tracking-widest bg-navy-900/60 px-2 py-1 rounded-xl border border-white/[0.06]">{t.format.replace('_', ' ')}</span>
                  <Link href={`/admin/bracket?t=${slugify(t.name)}`} className="text-[10px] font-mono font-bold text-white/30 hover:text-white hover:border-white uppercase tracking-widest border border-white/[0.06] rounded-full px-3 py-1 transition-colors shadow-sm">
                    Manage Bracket
                  </Link>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <TournamentStatusToggle tournamentId={t.id} currentStatus={t.status} />
              </div>
            </div>

            {/* Championship Award Name + Delete */}
            <TournamentAdminActions
              tournamentId={t.id}
              tournamentName={t.name}
              currentChampionshipName={t.championship_award_name ?? ''}
              currentLogoUrl={t.logo_url ?? ''}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

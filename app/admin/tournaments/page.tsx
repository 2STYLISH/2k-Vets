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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div className="section-header !mb-0 !pb-0 !border-b-0">
          <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">Admin / Tournaments</p>
          <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase">TOURNAMENTS</h1>
          <p className="text-white/40 text-sm mt-4 max-w-2xl">Manage tournament statuses and settings.</p>
        </div>
        <Link href="/admin/tournaments/create" className="btn-primary">
          CREATE TOURNAMENT
        </Link>
      </div>

      <div className="space-y-4 mt-6">
        {(tournaments ?? []).length === 0 && <p className="surface-elevated p-8 text-center rounded-xl border border-white/10 text-white/40 font-mono text-[10px] uppercase tracking-widest font-bold">No tournaments yet.</p>}
        {(tournaments ?? []).map((t) => (
          <div key={t.id} className="surface-elevated rounded-xl border border-white/10 p-6 flex flex-col gap-5 hover:border-white/20 transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <p className="text-2xl text-white font-display uppercase tracking-widest mb-2">{t.name}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[9px] font-mono text-white/50 font-bold uppercase tracking-widest bg-[#111827] px-2.5 py-1 rounded-full border border-white/10">{t.format.replace('_', ' ')}</span>
                  <Link href={`/admin/bracket?t=${slugify(t.name)}`} className="text-[9px] font-mono font-bold text-white/50 hover:text-white hover:border-white/30 uppercase tracking-widest bg-[#111827] px-2.5 py-1 rounded-full border border-white/10 transition-colors">
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

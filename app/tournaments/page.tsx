import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';

export default async function TournamentsPage() {
  const supabase = createClient();
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, format, start_date, end_date')
    .order('created_at', { ascending: false });

  const activeLeagues = (tournaments ?? []).filter(t => ['SEEDING', 'IN_PROGRESS'].includes(t.status));
  const archivedLeagues = (tournaments ?? []).filter(t => ['COMPLETED', 'CANCELLED'].includes(t.status));

  function getStatusBadge(status: string) {
    switch (status) {
      case 'DRAFT':
      case 'SEEDING':
        return <span className="text-[9px] bg-white/[0.06] text-white/50 border border-white/[0.06] px-3 py-1 rounded-lg font-mono uppercase tracking-widest font-bold">Draft / Seeding</span>;
      case 'IN_PROGRESS':
        return <span className="text-[9px] bg-flag-red/10 text-flag-red border border-flag-red/20 px-3 py-1 rounded-lg font-mono uppercase tracking-widest font-bold shadow-sm">Live</span>;
      case 'COMPLETED':
        return <span className="text-[9px] bg-white/[0.06] text-white/40 border border-white/[0.06] px-3 py-1 rounded-lg font-mono uppercase tracking-widest">Completed</span>;
      case 'CANCELLED':
        return <span className="text-[9px] bg-flag-red/10 text-flag-red-400 border border-flag-red/30 px-3 py-1 rounded-lg font-mono uppercase tracking-widest">Cancelled</span>;
      default:
        return null;
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <div className="section-header">
        <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">Pro-Am Leagues</p>
        <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase title-glow">TOURNAMENTS</h1>
      </div>

      {/* Active Leagues */}
      <section>
        <div className="flex items-center gap-3 mb-6 pb-3 border-b border-white/[0.06]">
          <h2 className="text-2xl font-display text-white uppercase tracking-[0.1em]">ACTIVE LEAGUES</h2>
          <span className="text-[10px] font-mono bg-white/[0.05] text-white/50 px-2.5 py-1 rounded-lg border border-white/[0.06]">{activeLeagues.length}</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {activeLeagues.length === 0 && <p className="text-white/40 font-mono text-sm uppercase">No active leagues right now.</p>}
          {activeLeagues.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`} className="block relative group card p-8 hover:border-flag-red/30 hover:shadow-[0_12px_40px_rgba(206,17,38,0.08)] hover:-translate-y-1 transition-all duration-500 overflow-hidden">
              {/* Accent stripe top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-flag-red opacity-60 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10 flex justify-between items-start mb-6">
                <p className="text-2xl font-display text-white uppercase tracking-[0.1em] group-hover:text-flag-red transition-colors">{t.name}</p>
                {getStatusBadge(t.status)}
              </div>
              <div className="relative z-10 flex flex-wrap gap-6 mt-4 pt-4 border-t border-white/[0.06]">
                <div>
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1 font-bold">FORMAT</p>
                  <p className="text-sm font-mono text-white/70 uppercase">{t.format.replace(/_/g, ' ')}</p>
                </div>
                {t.start_date && (
                  <div>
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1 font-bold">KICKOFF</p>
                    <p className="text-sm font-mono text-white/70 uppercase">{new Date(t.start_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Archived Leagues */}
      <section>
        <div className="flex items-center gap-3 mb-6 pb-3 border-b border-white/[0.06]">
          <h2 className="text-xl font-display text-white/40 uppercase tracking-[0.1em]">COMPLETED LEAGUES</h2>
          <span className="text-[10px] font-mono bg-white/[0.05] text-white/40 px-2.5 py-1 rounded-lg border border-white/[0.06]">{archivedLeagues.length}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archivedLeagues.length === 0 && <p className="text-white/40 font-mono text-sm uppercase">No archived leagues.</p>}
          {archivedLeagues.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`} className="flex justify-between items-center card p-5 hover:border-white/15 hover:-translate-y-0.5 transition-all group">
              <div>
                <p className="text-sm font-display text-white group-hover:text-flag-gold transition-colors tracking-[0.1em] uppercase truncate max-w-[180px]">{t.name}</p>
                <p className="text-[10px] font-mono text-white/40 uppercase mt-1 tracking-wide">{t.format.replace(/_/g, ' ')}</p>
              </div>
              <div>
                {getStatusBadge(t.status)}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

import { slugify } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const supabase = createClient();
  const q = searchParams.q || '';
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 12;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('players')
    .select('id, gamertag, slug, photo_path, position, bio', { count: 'exact' });

  if (q) {
    query = query.ilike('gamertag', `%${q}%`);
  }

  const { data: players, count } = await query
    .order('gamertag', { ascending: true })
    .range(offset, offset + limit - 1);

  const totalItems = count ?? 0;
  const totalPages = Math.ceil(totalItems / limit);

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-0">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="section-header">
          <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">2K Veterans League</p>
          <h1 className="text-3xl md:text-5xl font-display text-white tracking-widest uppercase">
            Players
          </h1>
          <p className="text-white/50 font-mono text-sm mt-2 uppercase tracking-widest font-bold">
            {totalItems} Players Total
          </p>
        </div>

        {/* Search */}
        <form className="relative w-full md:w-[300px]" action="/players" method="GET">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search players..."
            className="w-full bg-[#1f2937] border border-white/10 rounded px-10 py-3 text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:border-flag-red transition-all placeholder:text-white/30"
          />
        </form>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players?.map((player) => (
          <Link
            key={player.id}
            href={`/${player.slug || slugify(player.gamertag)}`}
            className="group surface-elevated rounded-xl p-6 flex flex-col items-center text-center gap-4 hover:border-flag-gold hover:-translate-y-1 transition-all overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-flag-gold/50 transition-colors" />
            <div className="w-24 h-24 rounded-full border border-white/10 bg-[#111827] flex items-center justify-center shrink-0 overflow-hidden shadow-lg group-hover:border-flag-gold transition-colors p-1">
              {player.photo_path ? (
                <img src={player.photo_path} alt={player.gamertag} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-3xl font-display text-white/20 uppercase">{player.gamertag.charAt(0)}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-display text-white uppercase tracking-widest group-hover:text-flag-gold transition-colors leading-tight">
                {player.gamertag}
              </h2>
              {player.position && (
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] mt-2 font-bold">
                  {player.position}
                </p>
              )}
            </div>
          </Link>
        ))}
        {players?.length === 0 && (
          <div className="col-span-full py-12 text-center text-white/40 font-mono text-sm uppercase">
            No players found.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-12">
          <Link
            href={`/players?q=${encodeURIComponent(q)}&page=${Math.max(1, page - 1)}`}
            className={`px-6 py-3 rounded font-mono text-[10px] uppercase tracking-widest transition-colors ${page <= 1 ? 'pointer-events-none opacity-30 bg-[#1f2937] text-white/30' : 'bg-[#111827] text-white/50 border border-white/10 hover:text-white hover:bg-white/5'}`}
          >
            Previous
          </Link>
          <span className="font-mono text-[10px] text-white/40 tracking-widest uppercase px-4 font-bold">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/players?q=${encodeURIComponent(q)}&page=${Math.min(totalPages, page + 1)}`}
            className={`px-6 py-3 rounded font-mono text-[10px] uppercase tracking-widest transition-colors ${page >= totalPages ? 'pointer-events-none opacity-30 bg-[#1f2937] text-white/30' : 'bg-[#111827] text-white/50 border border-white/10 hover:text-white hover:bg-white/5'}`}
          >
            Next
          </Link>
        </div>
      )}

    </div>
  );
}

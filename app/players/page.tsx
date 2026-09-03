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
        <div>
          <h1 className="text-3xl md:text-5xl font-display text-white tracking-widest title-glow uppercase">
            Players
          </h1>
          <p className="text-white/50 font-mono text-sm mt-2 uppercase tracking-widest">
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
            className="w-full bg-navy-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-flag-red focus:ring-1 focus:ring-flag-red transition-all"
          />
        </form>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players?.map((player) => (
          <Link
            key={player.id}
            href={`/${player.slug || player.gamertag.toLowerCase()}`}
            className="group card p-4 flex items-center gap-4 hover:border-flag-gold/40 hover:shadow-lg transition-all"
          >
            <div className="w-16 h-16 rounded-full border border-white/10 bg-navy-900 flex items-center justify-center shrink-0 overflow-hidden">
              {player.photo_path ? (
                <img src={player.photo_path} alt={player.gamertag} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-display text-white/20 uppercase">{player.gamertag.charAt(0)}</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-display text-white uppercase tracking-widest group-hover:text-flag-gold transition-colors">
                {player.gamertag}
              </h2>
              {player.position && (
                <p className="text-xs font-mono text-white/40 uppercase tracking-widest mt-1">
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
        <div className="flex items-center justify-center gap-2 mt-8">
          <Link
            href={`/players?q=${encodeURIComponent(q)}&page=${Math.max(1, page - 1)}`}
            className={`px-4 py-2 rounded-lg border border-white/10 font-mono text-sm transition-colors ${page <= 1 ? 'pointer-events-none opacity-50 bg-navy-900 text-white/30' : 'bg-navy-800 text-white hover:bg-navy-700 hover:border-white/20'}`}
          >
            PREV
          </Link>
          <span className="font-mono text-sm text-white/50 px-4">
            {page} / {totalPages}
          </span>
          <Link
            href={`/players?q=${encodeURIComponent(q)}&page=${Math.min(totalPages, page + 1)}`}
            className={`px-4 py-2 rounded-lg border border-white/10 font-mono text-sm transition-colors ${page >= totalPages ? 'pointer-events-none opacity-50 bg-navy-900 text-white/30' : 'bg-navy-800 text-white hover:bg-navy-700 hover:border-white/20'}`}
          >
            NEXT
          </Link>
        </div>
      )}

    </div>
  );
}

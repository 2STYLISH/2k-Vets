import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const supabase = createClient();
  const q = searchParams.q || '';
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 10;
  const offset = (page - 1) * limit;

  // 1. Get unique teams (by slug) matching search query
  let query = supabase
    .from('teams')
    .select('id, name, short_name, logo_url, logo_path, slug', { count: 'exact' });

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data: allTeams, count } = await query
    .order('name', { ascending: true });

  // Deduplicate by slug
  const uniqueTeamsMap = new Map<string, any>();
  for (const team of allTeams || []) {
    if (team.slug && !uniqueTeamsMap.has(team.slug)) {
      uniqueTeamsMap.set(team.slug, team);
    }
  }

  const uniqueTeams = Array.from(uniqueTeamsMap.values());
  const totalItems = uniqueTeams.length;
  const totalPages = Math.ceil(totalItems / limit);
  
  // Paginate in memory since we deduplicated
  const paginatedTeams = uniqueTeams.slice(offset, offset + limit);

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-0">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-display text-white tracking-widest title-glow uppercase">
            Teams
          </h1>
          <p className="text-white/50 font-mono text-sm mt-2 uppercase tracking-widest">
            {totalItems} Teams Total
          </p>
        </div>

        {/* Search */}
        <form className="relative w-full md:w-[300px]" action="/teams" method="GET">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search teams..."
            className="w-full bg-navy-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-flag-red focus:ring-1 focus:ring-flag-red transition-all"
          />
        </form>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedTeams.map((team) => (
          <Link
            key={team.slug}
            href={`/teams/${team.slug}`}
            className="group card p-4 flex items-center gap-4 hover:border-flag-red/50 hover:shadow-lg transition-all"
          >
            <div className="w-16 h-16 rounded-xl border border-white/10 bg-navy-900 flex items-center justify-center shrink-0 overflow-hidden">
              {team.logo_url || team.logo_path ? (
                <img src={team.logo_url || team.logo_path} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-display text-white/20 uppercase">{team.short_name || team.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-display text-white uppercase tracking-widest group-hover:text-flag-gold transition-colors">
                {team.name}
              </h2>
              {team.short_name && (
                <p className="text-xs font-mono text-white/40 uppercase tracking-widest mt-1">
                  {team.short_name}
                </p>
              )}
            </div>
          </Link>
        ))}
        {paginatedTeams.length === 0 && (
          <div className="col-span-full py-12 text-center text-white/40 font-mono text-sm uppercase">
            No teams found.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Link
            href={`/teams?q=${encodeURIComponent(q)}&page=${Math.max(1, page - 1)}`}
            className={`px-4 py-2 rounded-lg border border-white/10 font-mono text-sm transition-colors ${page <= 1 ? 'pointer-events-none opacity-50 bg-navy-900 text-white/30' : 'bg-navy-800 text-white hover:bg-navy-700 hover:border-white/20'}`}
          >
            PREV
          </Link>
          <span className="font-mono text-sm text-white/50 px-4">
            {page} / {totalPages}
          </span>
          <Link
            href={`/teams?q=${encodeURIComponent(q)}&page=${Math.min(totalPages, page + 1)}`}
            className={`px-4 py-2 rounded-lg border border-white/10 font-mono text-sm transition-colors ${page >= totalPages ? 'pointer-events-none opacity-50 bg-navy-900 text-white/30' : 'bg-navy-800 text-white hover:bg-navy-700 hover:border-white/20'}`}
          >
            NEXT
          </Link>
        </div>
      )}

    </div>
  );
}

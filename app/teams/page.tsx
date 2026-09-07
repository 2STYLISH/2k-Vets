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
        <div className="section-header">
          <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">2K Veterans League</p>
          <h1 className="text-3xl md:text-5xl font-display text-white tracking-widest uppercase">
            Teams
          </h1>
          <p className="text-white/50 font-mono text-sm mt-2 uppercase tracking-widest font-bold">
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
            className="w-full bg-[#1f2937] border border-white/10 rounded px-10 py-3 text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:border-flag-red transition-all placeholder:text-white/30"
          />
        </form>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedTeams.map((team) => (
          <Link
            key={team.slug}
            href={`/teams/${team.slug}`}
            className="group surface-elevated rounded-xl flex items-center overflow-hidden hover:border-flag-red hover:-translate-y-1 transition-all border border-white/10"
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#111827] border-r border-white/10 flex items-center justify-center shrink-0 p-4">
              {team.logo_url || team.logo_path ? (
                <img src={team.logo_url || team.logo_path} alt={team.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-3xl font-display text-white/20 uppercase">{team.short_name || team.name.charAt(0)}</span>
              )}
            </div>
            <div className="p-6 flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-display text-white uppercase tracking-widest group-hover:text-flag-red transition-colors truncate">
                {team.name}
              </h2>
              {team.short_name && (
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] mt-2 font-bold">
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
        <div className="flex items-center justify-center gap-3 mt-12">
          <Link
            href={`/teams?q=${encodeURIComponent(q)}&page=${Math.max(1, page - 1)}`}
            className={`px-6 py-3 rounded font-mono text-[10px] uppercase tracking-widest transition-colors ${page <= 1 ? 'pointer-events-none opacity-30 bg-[#1f2937] text-white/30' : 'bg-[#111827] text-white/50 border border-white/10 hover:text-white hover:bg-white/5'}`}
          >
            Previous
          </Link>
          <span className="font-mono text-[10px] text-white/40 tracking-widest uppercase px-4 font-bold">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/teams?q=${encodeURIComponent(q)}&page=${Math.min(totalPages, page + 1)}`}
            className={`px-6 py-3 rounded font-mono text-[10px] uppercase tracking-widest transition-colors ${page >= totalPages ? 'pointer-events-none opacity-30 bg-[#1f2937] text-white/30' : 'bg-[#111827] text-white/50 border border-white/10 hover:text-white hover:bg-white/5'}`}
          >
            Next
          </Link>
        </div>
      )}

    </div>
  );
}

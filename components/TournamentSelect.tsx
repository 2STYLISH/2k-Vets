'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { slugify } from '@/lib/format';

export default function TournamentSelect({
  tournaments,
  activeId,
  basePath,
}: {
  tournaments: { id: string; name: string }[];
  activeId: string;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('tournament_id', newId);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 card p-4 w-full sm:w-auto">
      <p className="text-sm font-mono text-white uppercase tracking-[0.12em] shrink-0 font-bold">Select Tournament:</p>
      <div className="relative w-full sm:w-64">
        <select
          value={activeId}
          onChange={handleChange}
          className="w-full appearance-none bg-navy-900 border border-white/[0.08] rounded-xl px-4 py-2.5 pr-10 text-white text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-flag-red focus:ring-2 focus:ring-flag-red/25 transition-all shadow-sm hover:border-white/15 cursor-pointer"
        >
          {tournaments.map((t) => (
            <option key={t.id} value={slugify(t.name)} className="bg-navy-900 text-white">
              {t.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/30">
          ▼
        </div>
      </div>
    </div>
  );
}

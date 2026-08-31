'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function TournamentFilter({ tournaments, activeId, basePath = '/teams' }: {
  tournaments: { id: string, name: string }[];
  activeId: string;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      value={activeId}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('t', e.target.value);
        router.push(`${basePath}?${params.toString()}`);
      }}
      className="bg-navy-900 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-flag-red focus:ring-1 focus:ring-navy uppercase tracking-widest shadow-sm cursor-pointer hover:border-navy-400 transition-colors"
    >
      {tournaments.map((t) => (
        <option key={t.id} value={t.id} className="text-white bg-navy-800">{t.name}</option>
      ))}
    </select>
  );
}

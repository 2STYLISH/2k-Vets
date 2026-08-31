'use client';

import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/format';

export default function TournamentDropdown({
  tournaments,
  activeTournamentSlug
}: {
  tournaments: { id: string; name: string }[];
  activeTournamentSlug: string;
}) {
  const router = useRouter();

  return (
    <div className="relative w-full max-w-xs">
      <select
        value={activeTournamentSlug}
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            router.push(`/playerstats?tab=tournaments&t=${val}`);
          } else {
            router.push(`/playerstats?tab=tournaments`);
          }
        }}
        className="w-full appearance-none bg-navy-900 border border-white/[0.08] text-white text-sm font-mono uppercase tracking-widest rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-flag-red/50 focus:border-flag-red/50 transition-colors cursor-pointer"
      >
        <option value="" disabled>Select Tournament</option>
        {tournaments.map((t) => (
          <option key={t.id} value={slugify(t.name)}>
            {t.name}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-white/50">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

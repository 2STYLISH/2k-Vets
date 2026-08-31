import Link from '@/components/HiddenLink';

const SECTIONS = [
  {
    href: '/admin/players',
    title: 'PLAYERS',
    desc: 'Manage the global player registry. Create, update, or delete all registered players.',
    icon: '👤',
  },
  {
    href: '/admin/teams',
    title: 'TEAMS & ROSTERS',
    desc: 'Create teams and add players — everything else depends on this existing first.',
    icon: '👥',
  },
  {
    href: '/admin/games',
    title: 'GAMES & SCREENSHOTS',
    desc: 'Upload box-score screenshots, run AI extraction, review and verify stats.',
    icon: '🎮',
  },
  {
    href: '/admin/schedule',
    title: 'SCHEDULE',
    desc: 'Create and manage games — regular season, playoffs, tournament, exhibition.',
    icon: '📅',
  },
  {
    href: '/admin/stats',
    title: 'PLAYER STATS',
    desc: 'View per-player season averages for all teams. Includes unverified game data.',
    icon: '📊',
  },
  {
    href: '/admin/awards',
    title: 'AWARDS',
    desc: 'Candidate rankings auto-update after every verified game. Admin picks the winner.',
    icon: '🥇',
  },
  {
    href: '/admin/bracket',
    title: 'BRACKET',
    desc: 'Seed teams, generate brackets, verify series results, manual overrides.',
    icon: '🏆',
  },
  {
    href: '/admin/tournaments',
    title: 'MANAGE TOURNAMENTS',
    desc: 'Manage tournament settings, change status, or create new tournaments.',
    icon: '⚙️',
  },
];

export default function AdminHomePage() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-white/[0.06]">
        <div className="section-header">
          <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">Admin Dashboard</p>
          <h1 className="text-4xl text-white font-display tracking-[0.12em]">CONTROL ROOM</h1>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="relative group card p-6 hover:border-white/15 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex items-start gap-5"
          >
            {/* Hover accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-navy scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

            <div className="relative z-10 w-12 h-12 shrink-0 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-white/[0.06] group-hover:border-white/15 transition-all duration-300 shadow-sm">
              <span className="opacity-80 group-hover:opacity-100 transition-opacity">
                {s.icon}
              </span>
            </div>
            
            <div className="relative z-10 flex-1 pt-0.5">
              <p className="text-sm text-white font-display tracking-[0.12em] mb-1.5 group-hover:text-flag-red transition-colors">
                {s.title}
              </p>
              <p className="text-xs text-white/40 leading-relaxed font-body">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

'use client';

import Link from '@/components/HiddenLink';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { checkAdminStatus } from '@/lib/actions/auth';

const LINKS = [
  { href: '/schedule', label: 'Schedule' },
  { href: '/playerstats', label: 'Stats' },
  { href: '/awards', label: 'Awards' },
  { href: '/tournaments', label: 'Tournaments' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ gamertag: string; slug: string | null }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function verifyAuth() {
      try {
        const { username, isAdmin } = await checkAdminStatus();
        setUsername(username);
        setIsAdmin(isAdmin);
      } catch (err) {
        console.error('Navbar auth check failed:', err);
        setIsAdmin(false);
        setUsername(null);
      }
    }
    verifyAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') verifyAuth();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('players').select('gamertag, slug').ilike('gamertag', `%${query}%`).limit(8);
      setResults(data ?? []);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearchSelect(player: { gamertag: string; slug: string | null }) {
    const href = `/${player.slug || player.gamertag.toLowerCase()}`;
    setQuery(''); setResults([]); setSearchOpen(false); setMobileMenuOpen(false);
    router.push(href);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAdmin(false); setUsername(null);
    router.push('/'); router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 bg-navy-900/80 backdrop-blur-2xl border-b border-white/[0.06]">
      <div className="accent-stripe w-full" />
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-white/10 bg-navy-800 flex items-center justify-center group-hover:border-flag-red/50 transition-colors shadow-sm">
            <Image src="/bg-kingpins.png" alt="2K Veterans League Logo" fill className="object-cover" />
          </div>
          <span className="hidden sm:block text-lg font-display text-white tracking-[0.12em] uppercase group-hover:text-flag-red transition-colors">
            2K VETERANS LEAGUE
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link key={l.href} href={l.href}
                className={`relative px-5 py-2 rounded-lg text-xs font-body font-medium uppercase tracking-[0.12em] transition-all duration-200 ${active ? 'bg-flag-red text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right */}
        <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
          <div ref={searchRef} className="relative max-w-[260px] w-full">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)}
                placeholder="Search player…"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-flag-red/30 focus:border-flag-red/40 transition-all"
              />
            </div>
            {searchOpen && results.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-navy-900/95 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden z-50 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
                {results.map((p) => (
                  <button key={p.gamertag} onMouseDown={() => handleSearchSelect(p)}
                    className="w-full text-left px-4 py-3 text-sm text-white/70 hover:bg-white/[0.06] hover:text-flag-gold transition-colors flex items-center gap-2.5"
                  >
                    <span className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[9px] font-mono text-white/40 uppercase">{p.gamertag.charAt(0)}</span>
                    <span className="font-medium">{p.gamertag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)}
              className="w-9 h-9 rounded-xl border-2 border-white/10 bg-white/[0.04] hover:border-flag-red/40 hover:bg-white/[0.08] transition-all duration-200 flex items-center justify-center shadow-sm"
              title={username ?? 'Account'}>
              {username ? (
                <span className="text-xs font-display text-white uppercase">{username.charAt(0)}</span>
              ) : (
                <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              )}
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-navy-900/95 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden z-50 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
                {username ? (
                  <>
                    <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.03]">
                      <p className="text-[9px] font-mono text-white/40 uppercase tracking-[0.2em]">Signed in as</p>
                      <p className="text-sm text-white truncate mt-0.5 font-semibold">{username}</p>
                    </div>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 w-full text-left px-4 py-3 text-sm text-white/60 hover:bg-white/[0.06] hover:text-flag-gold transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                        </svg>
                        Admin Panel
                      </Link>
                    )}
                    <button onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="flex items-center gap-2.5 w-full text-left px-4 py-3 text-sm text-white/60 hover:text-flag-red hover:bg-flag-red/10 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                      </svg>
                      Logout
                    </button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 w-full text-left px-4 py-3.5 text-sm text-white/70 hover:text-flag-gold hover:bg-white/[0.06] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                    Login
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-3 md:hidden">
          <button onClick={() => setProfileOpen(!profileOpen)}
            className="w-9 h-9 rounded-xl border-2 border-white/10 bg-white/[0.04] hover:border-flag-red/40 transition-colors flex items-center justify-center shadow-sm">
            {username ? <span className="text-xs font-display text-white uppercase">{username.charAt(0)}</span>
              : <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>}
          </button>
          <button className="w-9 h-9 rounded-xl border-2 border-white/10 bg-white/[0.04] hover:border-flag-red/40 transition-colors flex items-center justify-center shadow-sm text-white/60"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-navy-900/95 backdrop-blur-2xl animate-fade-in">
          <div className="p-4 space-y-3">
            <div className="relative w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player…"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-flag-red/30 focus:border-flag-red/40"
              />
              {query && results.length > 0 && (
                <div className="absolute top-full mt-1.5 left-0 right-0 bg-navy-900/95 border border-white/[0.08] rounded-xl overflow-hidden z-50 shadow-lg">
                  {results.map((p) => (
                    <button key={p.gamertag} onClick={() => handleSearchSelect(p)}
                      className="w-full text-left px-4 py-3 text-sm text-white/70 hover:bg-white/[0.06] hover:text-flag-gold transition-colors">{p.gamertag}</button>
                  ))}
                </div>
              )}
            </div>
            <nav className="flex flex-col gap-1">
              {LINKS.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + '/');
                return (
                  <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-xl text-sm font-body font-medium uppercase tracking-[0.1em] transition-all ${active ? 'bg-flag-red text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                      }`}>{l.label}</Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

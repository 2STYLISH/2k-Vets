'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { loginWithUsername } from '@/lib/actions/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setError('');
    setLoading(true);

    const result = await loginWithUsername(username, password);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') await handleLogin();
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl border-2 border-white/[0.08] bg-navy-900 flex items-center justify-center mx-auto mb-5 shadow-md overflow-hidden p-2">
            <Image src="/logo.png" alt="2K Veterans League" width={48} height={48} className="object-contain" />
          </div>
          <h1 className="text-3xl text-white font-display tracking-[0.15em]">ADMIN ACCESS</h1>
          <p className="text-white/40 text-sm mt-2 font-body">League control room — authorized personnel only</p>
        </div>

        {/* Card */}
        <div className="card p-7 space-y-5">
          {/* Accent stripe */}
          <div className="accent-stripe -mt-7 -mx-7 mb-5 rounded-t-2xl" />

          <div>
            <label className="block text-xs font-mono text-white/50 uppercase tracking-[0.15em] mb-2 font-semibold">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-white/50 uppercase tracking-[0.15em] mb-2 font-semibold">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input-field"
            />
          </div>

          {error && (
            <div className="bg-flag-red/15 border border-flag-red/30 rounded-xl px-4 py-3">
              <p className="text-flag-red-300 text-sm font-body">{error}</p>
            </div>
          )}

          <button
            id="login-submit"
            onClick={handleLogin}
            disabled={loading || !username || !password}
            className="btn-primary w-full mt-2"
          >
            {loading ? 'SIGNING IN…' : 'SIGN IN'}
          </button>
        </div>
      </div>
    </div>
  );
}

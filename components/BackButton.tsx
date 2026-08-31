'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(pathname.startsWith('/admin') ? '/admin' : '/');
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 hover:text-flag-red transition-colors group font-mono uppercase tracking-[0.12em]"
    >
      <span className="inline-block group-hover:-translate-x-1 transition-transform duration-200" aria-hidden>←</span>
      Back
    </button>
  );
}

'use client';

import { usePathname } from 'next/navigation';

export default function BackgroundManager() {
  const pathname = usePathname();
  
  const isHome = pathname === '/';
  const bgUrl = isHome ? "url('/bg-home.png')" : "url('/bg-other.png')";

  return (
    <>
      {/* Base background image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-[-2]" 
        style={{ backgroundImage: bgUrl }}
      />
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 z-[-1] bg-navy-900/40 pointer-events-none" />
      {/* Subtle diagonal stripes for texture */}
      <div 
        className="fixed inset-0 z-[-1] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,1) 40px,
              rgba(255,255,255,1) 41px
            )
          `,
        }}
      />
    </>
  );
}

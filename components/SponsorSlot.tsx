'use client';

import { useState } from 'react';

export default function SponsorSlot({ src, alt = 'Sponsor' }: { src: string; alt?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="sponsor-slot">
      <div className="sponsor-label">Sponsor</div>
      <div className="aspect-[3/4] bg-white/[0.03] flex items-center justify-center p-4">
        {!failed && (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain"
            onError={() => setFailed(true)}
          />
        )}
        {failed && (
          <span className="text-[10px] text-white/20 font-mono uppercase tracking-widest">
            Your Ad Here
          </span>
        )}
      </div>
    </div>
  );
}

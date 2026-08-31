'use client';

import { useState } from 'react';

function SponsorImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="sponsor-slot">
      <div className="sponsor-label">Sponsor</div>
      <div className="flex-1 bg-navy-900/60 p-2 flex items-center justify-center">
        {!failed && (
          <img
            src={src}
            alt="Sponsor"
            className="w-full h-auto block"
            onError={() => setFailed(true)}
          />
        )}
        {failed && (
          <span className="text-[9px] text-white/15 font-mono uppercase tracking-widest text-center leading-relaxed">
            Your Ad<br />Here
          </span>
        )}
      </div>
    </div>
  );
}

export default function SponsorRails() {
  return (
    <>
      {/* Desktop Edge Rails (hidden on < 1440px) */}
      <div className="sponsor-edge-rail left-0">
        <SponsorImage src="/sponsors/sponsor-left-1.png" />
      </div>
      <div className="sponsor-edge-rail right-0">
        <SponsorImage src="/sponsors/sponsor-right-1.png" />
      </div>

      {/* Mobile Inline Sponsors (hidden on >= 1440px) */}
      <div className="flex md:hidden flex-col sm:flex-row gap-4 mt-6">
        <div className="flex-1">
          <SponsorImage src="/sponsors/sponsor-left-1.png" />
        </div>
        <div className="flex-1">
          <SponsorImage src="/sponsors/sponsor-right-1.png" />
        </div>
      </div>
    </>
  );
}

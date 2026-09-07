'use client';

import { useState } from 'react';

function SponsorImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-col surface-elevated rounded-xl overflow-hidden border border-white/10 w-full mb-6">
      <div className="bg-[#111827] px-4 py-2 border-b border-white/10 text-center">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">Sponsor</span>
      </div>
      <div className="flex-1 bg-[#1f2937] p-4 flex items-center justify-center min-h-[250px]">
        {!failed && (
          <img
            src={src}
            alt="Sponsor"
            className="w-full h-auto max-w-[200px] block object-contain"
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
      <div className="hidden min-[1440px]:flex flex-col fixed top-[20vh] w-[200px] left-4 z-40">
        <SponsorImage src="/sponsors/sponsor-left-1.png" />
      </div>
      <div className="hidden min-[1440px]:flex flex-col fixed top-[20vh] w-[200px] right-4 z-40">
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

'use client';

import { useState, useEffect, useCallback } from 'react';

const SPONSORS = [
  '/sponsors/sponsor-1.png',
];

const INTERVAL_MS = 3500;

export default function SponsorSlideshow() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const next = useCallback(() => {
    if (SPONSORS.length <= 1) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(prev => (prev + 1) % SPONSORS.length);
      setFading(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (SPONSORS.length <= 1) return;
    const timer = setInterval(next, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [next]);

  const handleLoad = (index: number) => setLoaded(prev => ({ ...prev, [index]: true }));
  const handleError = (index: number) => setFailed(prev => ({ ...prev, [index]: true }));

  return (
    <div className="relative w-full h-[120px] md:h-[160px] surface-elevated rounded-xl border border-white/10 overflow-hidden flex items-center justify-center p-6 bg-[#1f2937]">
      {SPONSORS.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${
            i === current 
              ? (fading ? 'opacity-0 scale-95' : 'opacity-100 scale-100 z-10') 
              : 'opacity-0 scale-95 pointer-events-none z-0'
          }`}
          aria-hidden={i !== current}
        >
          {!failed[i] ? (
            <img
              src={src}
              alt={`Sponsor ${i + 1}`}
              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${loaded[i] ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => handleLoad(i)}
              onError={() => handleError(i)}
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-white/20">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold">SPONSOR {i + 1}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


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
    <div className="sponsor-inline-stage">
      {SPONSORS.map((src, i) => (
        <div
          key={src}
          className={`sponsor-slide${i === current ? ' active' : ''}${fading && i === current ? ' fading' : ''}`}
          aria-hidden={i !== current}
        >
          {!failed[i] ? (
            <img
              src={src}
              alt={`Sponsor ${i + 1}`}
              className={`sponsor-img${loaded[i] ? ' img-loaded' : ''}`}
              onLoad={() => handleLoad(i)}
              onError={() => handleError(i)}
              draggable={false}
            />
          ) : (
            <div className="sponsor-placeholder">
              <span>SPONSOR {i + 1}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

// We support up to 4 sponsors right now. You can add or remove from this list.
const SPONSORS = [
  '/sponsors/sponsor-1.png',
  '/sponsors/sponsor-2.png',
  '/sponsors/sponsor-3.png',
  '/sponsors/sponsor-4.png',
];

function SponsorLogo({ src, index }: { src: string; index: number }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="footer-sponsor-logo">
      {!failed ? (
        <img
          src={src}
          alt={`Sponsor ${index + 1}`}
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <div className="footer-sponsor-placeholder">
          <span>SPONSOR {index + 1}</span>
        </div>
      )}
    </div>
  );
}

export default function Footer() {
  const pathname = usePathname();

  // Do not render the footer on any admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="footer-container">
      <div className="footer-sponsors-section">
        <div className="footer-sponsors-header">
          <div className="footer-sponsors-line" />
          <span className="footer-sponsors-title title-glow">SUPPORTED BY</span>
          <div className="footer-sponsors-line" />
        </div>

        <div className="footer-marquee-container">
          <div className="footer-marquee-content">
            {SPONSORS.map((src, i) => (
              <SponsorLogo key={`${src}-${i}`} src={src} index={i} />
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p className="footer-copyright">© {new Date().getFullYear()} 2K Veterans League. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

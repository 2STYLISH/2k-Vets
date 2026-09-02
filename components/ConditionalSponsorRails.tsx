'use client';

import { usePathname } from 'next/navigation';
import SponsorRails from './SponsorRails';

export default function ConditionalSponsorRails() {
  const pathname = usePathname();
  
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  
  return <SponsorRails />;
}

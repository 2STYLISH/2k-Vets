'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, MouseEvent, TouchEvent } from 'react';

export default function HiddenLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const router = useRouter();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (onClick) onClick();
    router.push(href);
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`cursor-pointer ${className || ''}`}
      style={{ touchAction: 'manipulation' }}
    >
      {children}
    </a>
  );
}


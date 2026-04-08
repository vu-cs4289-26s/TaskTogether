'use client';

import { useEffect, useState } from 'react';
import { getInitials, getAvatarColor } from '@/types/households';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type AvatarProps = {
  src?: string | null;
  name: string;
  userKey?: string | null;
  size?: AvatarSize;
  className?: string;
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-4xl',
};

export default function Avatar({
  src,
  name,
  userKey,
  size = 'md',
  className = '',
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const initials = getInitials(name || '');
  const color = getAvatarColor(userKey ?? name);
  const sizeClass = SIZE_CLASSES[size];
  const showImage = !!src && !imgFailed;

  if (showImage) {
    return (
      <img
        src={src as string}
        alt={name}
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-divider flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full text-white flex items-center justify-center font-bold border border-divider flex-shrink-0 ${className}`}
      style={{ backgroundColor: color }}
      aria-label={name}
    >
      {initials || '?'}
    </div>
  );
}

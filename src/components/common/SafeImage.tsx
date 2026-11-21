import { useState } from 'react';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  fallbackIcon?: string;
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackText,
  fallbackIcon = 'business',
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    const initials =
      fallbackText ||
      alt
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('');

    return (
      <div
        aria-label={alt}
        className={`flex items-center justify-center bg-surface-container text-primary font-headline-sm font-bold select-none ${className}`}
      >
        {initials ? (
          <span className="text-xs tracking-tight">{initials}</span>
        ) : (
          <span className="material-symbols-outlined text-[20px]">{fallbackIcon}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

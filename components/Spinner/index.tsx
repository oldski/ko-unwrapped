'use client';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'primary' | 'accent' | 'vibrant';
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
  xl: 'w-16 h-16 border-4',
};

export default function Spinner({ size = 'md', className = '', variant = 'accent' }: SpinnerProps) {
  const variantClass = {
    primary: 'border-[var(--color-primary)]',
    accent: 'border-[var(--color-accent)]',
    vibrant: 'border-[var(--color-vibrant)]',
  }[variant];

  return (
    <div
      className={`${sizeMap[size]} ${variantClass} border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

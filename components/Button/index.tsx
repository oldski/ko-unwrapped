'use client';
import { motion } from 'framer-motion';
import { ReactNode, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isActive?: boolean;
  fullWidth?: boolean;
  animate?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isActive = false,
  fullWidth = false,
  animate = true,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {

  // Size configurations
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  // Variant configurations using theme colors
  const getVariantClasses = () => {
    if (isActive) {
      return 'bg-[var(--color-primary)] text-[var(--color-text-primary)] border-[var(--color-accent)] shadow-layered-sm';
    }

    switch (variant) {
      case 'primary':
        return 'bg-[var(--color-primary)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-primary)]/80 hover:border-[var(--color-accent)]';

      case 'secondary':
        return 'bg-[var(--color-bg-2)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-primary)]/20 hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]';

      case 'accent':
        return 'bg-[var(--color-accent)] text-[var(--color-text-primary)] border-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 hover:border-[var(--color-vibrant)]';

      case 'success':
        return 'bg-[var(--color-vibrant)] text-black border-[var(--color-vibrant)] hover:bg-[var(--color-vibrant)]/80 hover:border-[var(--color-accent)]';

      case 'danger':
        return 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-500';

      case 'ghost':
        return 'bg-transparent text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-primary)]/20 hover:text-[var(--color-text-primary)]';

      default:
        return 'bg-[var(--color-primary)] text-[var(--color-text-primary)] border-[var(--color-border)]';
    }
  };

  const baseClasses = `
    ${sizeClasses[size]}
    ${getVariantClasses()}
    ${fullWidth ? 'w-full' : ''}
    rounded-lg
    font-semibold
    border-2
    transition-all
    duration-300
    disabled:opacity-50
    disabled:cursor-not-allowed
    flex
    items-center
    justify-center
    gap-2
    ${className}
  `;

  const buttonContent = (
    <>
      {leftIcon && <span>{leftIcon}</span>}
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
      {rightIcon && <span>{rightIcon}</span>}
    </>
  );

  if (animate && !disabled) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={baseClasses}
        disabled={disabled || loading}
        {...(props as any)}
      >
        {buttonContent}
      </motion.button>
    );
  }

  return (
    <button
      className={baseClasses}
      disabled={disabled || loading}
      {...props}
    >
      {buttonContent}
    </button>
  );
}

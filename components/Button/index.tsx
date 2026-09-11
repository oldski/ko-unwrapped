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

  /*
   * Variants on the ink/surface family.
   *
   * The active state used --color-primary, which is a visualiser token and
   * stays fixed cyan whatever the artwork, so every tab bar and period picker
   * in the app ignored the album palette. Fills that hold text use
   * surface-signal with ink-on-signal, which the palette guarantees together.
   */
  const getVariantClasses = () => {
    if (isActive) {
      return 'bg-[var(--surface-signal)] text-[var(--ink-on-signal)] border-[var(--ink-signal)] shadow-layered-sm';
    }

    switch (variant) {
      case 'primary':
        return 'bg-[var(--surface-signal)] text-[var(--ink-on-signal)] border-[var(--line)] hover:border-[var(--ink-signal)]';

      case 'secondary':
        return 'bg-[var(--surface-panel)] text-[var(--ink-muted)] border-[var(--line)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink-primary)] hover:border-[var(--ink-signal)]';

      case 'accent':
        return 'bg-[var(--surface-signal)] text-[var(--ink-on-signal)] border-[var(--ink-signal)] hover:border-[var(--ink-primary)]';

      case 'success':
        return 'bg-emerald-500 text-black border-emerald-500 hover:bg-emerald-400';

      case 'danger':
        return 'bg-rose-600 text-white border-rose-600 hover:bg-rose-500';

      case 'ghost':
        return 'bg-transparent text-[var(--ink-muted)] border-transparent hover:bg-[var(--surface-raised)] hover:text-[var(--ink-primary)]';

      default:
        return 'bg-[var(--surface-panel)] text-[var(--ink-primary)] border-[var(--line)]';
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

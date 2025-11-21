'use client';

import { useRef, useEffect, ReactNode } from 'react';
import { gsap } from '@/lib/gsap';
import { useAmbientTheme } from '@/components/ColorThemeProvider';

// SVG Pattern generators
const patterns = {
  dots: (color: string, opacity: number) => `
    <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="2" cy="2" r="1" fill="${color}" opacity="${opacity}"/>
    </svg>
  `,
  grid: (color: string, opacity: number) => `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
    </svg>
  `,
  waves: (color: string, opacity: number) => `
    <svg width="100" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 10 Q 25 0, 50 10 T 100 10" fill="none" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
    </svg>
  `,
  noise: (color: string, opacity: number) => `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="200" height="200" filter="url(#noise)" fill="${color}" opacity="${opacity}"/>
    </svg>
  `,
  lines: (color: string, opacity: number) => `
    <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 30 L60 30 M30 0 L30 60" stroke="${color}" stroke-width="1" opacity="${opacity}"/>
    </svg>
  `,
};

type PatternType = keyof typeof patterns | false;
type AnimationVariant = 'lift' | 'float' | 'tilt' | 'glow' | 'scale' | 'slide' | 'minimal';
type SizeVariant = 'compact' | 'default' | 'expanded';
type OpacityPreset = 'subtle' | 'medium' | 'bold' | 'solid';
type WeightVariant = 'light' | 'medium' | 'heavy';

interface AnimatedCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: AnimationVariant;
  pattern?: PatternType;
  opacity?: OpacityPreset;
  weight?: WeightVariant;
  size?: SizeVariant;
  disabled?: boolean;
  enableHoverEffect?: boolean;
}

interface HeaderProps {
  title: string;
  description?: string;
  icon?: string;
  children?: ReactNode;
}

interface ContentProps {
  children: ReactNode;
  className?: string;
}

interface StatProps {
  label: string;
  value: string | number;
  trend?: string;
  icon?: string;
  className?: string;
}

interface AnimatedCardComponent extends React.FC<AnimatedCardProps> {
  Header: React.FC<HeaderProps>;
  Content: React.FC<ContentProps>;
  Stat: React.FC<StatProps>;
}

const AnimatedCardBase: React.FC<AnimatedCardProps> = ({
  children,
  onClick,
  className = '',
  variant = 'lift',
  pattern = 'dots',
  opacity = 'medium',
  weight = 'medium',
  size = 'default',
  disabled = false,
  enableHoverEffect = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const patternRef = useRef<HTMLDivElement>(null);
  const { variant: themeVariant } = useAmbientTheme();

  // Opacity preset mappings
  const opacityValues: Record<OpacityPreset, number> = {
    subtle: 0.15,
    medium: 0.5,
    bold: 0.8,
    solid: 0.95,
  };

  const glassOpacity = opacityValues[opacity];

  // Weight configurations
  const weightConfig = {
    light: {
      borderWidth: '1px',
      borderOpacity: 0.15,
      shadowBase: '0 2px 4px rgba(0, 0, 0, 0.05)',
      shadowHover: '0 8px 16px color-mix(in srgb, var(--color-primary) 15%, transparent)',
      backdropBlur: 'blur(8px)',
      patternOpacity: 0.3,
    },
    medium: {
      borderWidth: '1px',
      borderOpacity: 0.3,
      shadowBase: '0 4px 8px rgba(0, 0, 0, 0.1)',
      shadowHover: '0 20px 40px color-mix(in srgb, var(--color-primary) 30%, transparent)',
      backdropBlur: 'blur(12px) saturate(110%)',
      patternOpacity: 0.6,
    },
    heavy: {
      borderWidth: '2px',
      borderOpacity: 0.5,
      shadowBase: '0 8px 16px rgba(0, 0, 0, 0.15)',
      shadowHover: '0 24px 48px color-mix(in srgb, var(--color-primary) 40%, transparent)',
      backdropBlur: 'blur(16px) saturate(120%) contrast(110%)',
      patternOpacity: 0.8,
    },
  };

  const currentWeight = weightConfig[weight];

  // Detect if theme is dark or light based on textPrimary
  const isDarkTheme = () => {
    if (typeof window === 'undefined') return true;
    const textPrimary = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-text-primary')
      .trim();
    return textPrimary.toLowerCase().includes('fff') || textPrimary.toLowerCase().includes('white');
  };

  // Get gradient style: radial from corner or linear tl-to-br
  const getGradientStyle = () => {
    // Alternate between radial (from corner) and linear (tl-to-br)
    return themeVariant % 2 === 0 ? 'radial-corner' : 'linear-tlbr';
  };

  const gradientStyle = getGradientStyle();

  // Get pattern color based on theme variant
  const getPatternConfig = () => {
    const configs = [
      { color: 'var(--color-primary)', opacity: 0.15 },
      { color: 'var(--color-secondary)', opacity: 0.12 },
      { color: 'var(--color-accent)', opacity: 0.18 },
      { color: 'var(--color-vibrant)', opacity: 0.1 },
      { color: 'var(--color-complementary-1)', opacity: 0.14 },
      { color: 'var(--color-complementary-2)', opacity: 0.16 },
    ];
    return configs[(themeVariant - 1) % configs.length];
  };

  // Size variants
  const sizeClasses = {
    compact: 'p-4 rounded-lg',
    default: 'p-6 rounded-xl',
    expanded: 'p-8 rounded-2xl',
  };

  // Generate background pattern
  const getBackgroundPattern = () => {
    if (!pattern) return 'none';
    const patternConfig = getPatternConfig();
    const patternSvg = patterns[pattern](patternConfig.color, patternConfig.opacity);
    const base64 = btoa(patternSvg);
    return `url("data:image/svg+xml;base64,${base64}")`;
  };

  // Gradient background with auto-adaptation
  const getGradientBackground = () => {
    const dark = isDarkTheme();
    const baseColor1 = dark ? 'var(--color-bg-1)' : 'var(--color-bg-3)';
    const baseColor2 = dark ? 'var(--color-darker)' : 'var(--color-lighter)';
    const accentColor = 'var(--color-primary)';
    const secondaryColor = 'var(--color-secondary)';

    // For proper transparency, we mix the accent colors with the base,
    // then apply opacity to the entire gradient using color-mix with transparent
    const mixRatio1 = 60; // How much accent color to mix in (increased for more vibrancy)
    const mixRatio2 = 45; // How much secondary color to mix in (increased for more vibrancy)

    if (gradientStyle === 'radial-corner') {
      // Radial gradient starting from top-left corner
      return `radial-gradient(circle at 0% 0%,
        color-mix(in srgb, color-mix(in srgb, ${accentColor} ${mixRatio1}%, ${baseColor1}) ${glassOpacity * 100}%, transparent),
        color-mix(in srgb, color-mix(in srgb, ${secondaryColor} ${mixRatio2}%, ${baseColor2}) ${glassOpacity * 100}%, transparent))`;
    } else {
      // Linear gradient from top-left to bottom-right
      return `linear-gradient(to bottom right,
        color-mix(in srgb, color-mix(in srgb, ${accentColor} ${mixRatio1}%, ${baseColor1}) ${glassOpacity * 100}%, transparent),
        color-mix(in srgb, color-mix(in srgb, ${secondaryColor} ${mixRatio2}%, ${baseColor2}) ${glassOpacity * 100}%, transparent))`;
    }
  };

  // GSAP Animations with weight-based adjustments
  useEffect(() => {
    if (!cardRef.current || disabled) return;

    const card = cardRef.current;
    const animations: gsap.core.Tween[] = [];

    // Entrance animation (lighter weights = more playful)
    const entranceDistance = weight === 'light' ? 30 : weight === 'medium' ? 20 : 15;
    gsap.fromTo(
      card,
      { opacity: 0, y: entranceDistance },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
    );

    // Variant-specific looping animations (reduced for heavy weight)
    const animationIntensity = weight === 'heavy' ? 0.6 : weight === 'medium' ? 0.8 : 1;

    switch (variant) {
      case 'float':
        animations.push(
          gsap.to(card, {
            y: -8 * animationIntensity,
            duration: 3,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          })
        );
        break;

      case 'glow':
        animations.push(
          gsap.to(card, {
            boxShadow: `0 0 ${30 * animationIntensity}px color-mix(in srgb, var(--color-primary) 40%, transparent)`,
            duration: 2,
            ease: 'power1.inOut',
            yoyo: true,
            repeat: -1,
          })
        );
        break;

      case 'scale':
        animations.push(
          gsap.to(card, {
            scale: 1 + (0.02 * animationIntensity),
            duration: 4,
            ease: 'power1.inOut',
            yoyo: true,
            repeat: -1,
          })
        );
        break;
    }

    // Pattern animation
    if (pattern && patternRef.current) {
      gsap.to(patternRef.current, {
        backgroundPosition: '20px 20px',
        duration: 20,
        ease: 'none',
        repeat: -1,
      });
    }

    return () => {
      animations.forEach((anim) => anim.kill());
    };
  }, [variant, pattern, disabled, weight]);

  // Hover effects
  const handleMouseEnter = () => {
    if (!cardRef.current || !enableHoverEffect || disabled) return;

    const card = cardRef.current;

    switch (variant) {
      case 'lift':
        gsap.to(card, {
          y: -12,
          boxShadow: currentWeight.shadowHover,
          duration: 0.3,
          ease: 'power2.out',
        });
        break;

      case 'tilt':
        gsap.to(card, {
          rotateX: 5,
          rotateY: 5,
          scale: 1.03,
          duration: 0.4,
          ease: 'power2.out',
        });
        break;

      case 'scale':
        gsap.to(card, {
          scale: 1.05,
          duration: 0.3,
          ease: 'power2.out',
        });
        break;

      case 'slide':
        gsap.to(card, {
          x: 8,
          duration: 0.3,
          ease: 'power2.out',
        });
        break;

      default:
        gsap.to(card, {
          scale: 1.02,
          duration: 0.3,
          ease: 'power2.out',
        });
    }
  };

  const handleMouseLeave = () => {
    if (!cardRef.current || !enableHoverEffect || disabled) return;

    const card = cardRef.current;
    const animationIntensity = weight === 'heavy' ? 0.6 : weight === 'medium' ? 0.8 : 1;

    gsap.to(card, {
      y: variant === 'float' ? -8 * animationIntensity : 0,
      x: 0,
      scale: 1,
      rotateX: 0,
      rotateY: 0,
      boxShadow: variant === 'glow'
        ? `0 0 ${20 * animationIntensity}px color-mix(in srgb, var(--color-primary) 20%, transparent)`
        : currentWeight.shadowBase,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  // 3D tilt effect with mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || variant !== 'tilt' || disabled) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    gsap.to(card, {
      rotateY: x * 20,
      rotateX: -y * 20,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  return (
    <div
      ref={cardRef}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className={`
        relative overflow-hidden
        ${sizeClasses[size]}
        ${onClick && !disabled ? 'cursor-pointer' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{
        backdropFilter: currentWeight.backdropBlur,
        WebkitBackdropFilter: currentWeight.backdropBlur,
        background: getGradientBackground(),
        border: `${currentWeight.borderWidth} solid color-mix(in srgb, var(--color-border) ${currentWeight.borderOpacity * 100}%, transparent)`,
        boxShadow: currentWeight.shadowBase,
        transformStyle: variant === 'tilt' ? 'preserve-3d' : undefined,
        willChange: 'transform',
      }}
    >
      {/* Pattern Layer */}
      {pattern && (
        <div
          ref={patternRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: getBackgroundPattern(),
            backgroundSize: pattern === 'noise' ? '200px 200px' : 'auto',
            backgroundPosition: '0 0',
            opacity: currentWeight.patternOpacity,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Compound Components

const Header: React.FC<HeaderProps> = ({ title, description, icon, children }) => {
  if (children) {
    return <div className="mb-6">{children}</div>;
  }

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-[var(--color-vibrant-safe)] flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {title}
      </h2>
      {description && (
        <p className="text-[var(--color-text-secondary)] text-sm mt-1">
          {description}
        </p>
      )}
    </div>
  );
};

const Content: React.FC<ContentProps> = ({ children, className = '' }) => {
  return <div className={className}>{children}</div>;
};

const Stat: React.FC<StatProps> = ({ label, value, trend, icon, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
      <p className="text-4xl font-black text-[var(--color-vibrant-safe)] flex items-center gap-2">
        {icon && <span className="text-3xl">{icon}</span>}
        {value}
      </p>
      {trend && (
        <p className="text-xs text-[var(--color-accent)]">{trend}</p>
      )}
    </div>
  );
};

// Attach compound components
const AnimatedCard = AnimatedCardBase as AnimatedCardComponent;
AnimatedCard.Header = Header;
AnimatedCard.Content = Content;
AnimatedCard.Stat = Stat;

export default AnimatedCard;
'use client';

import AnimatedCard from './index';

/**
 * AnimatedCard Examples
 *
 * This component demonstrates all the variants and configurations
 * available for the AnimatedCard component.
 */

export const AnimatedCardExamples = () => {
  return (
    <div className="min-h-screen p-8 space-y-12">
      {/* Weight x Opacity Matrix */}
      <section>
        <h2 className="text-3xl font-bold mb-6 text-[var(--color-text-primary)]">
          Weight × Opacity Combinations
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Weight controls overall presence (border, shadow, blur), Opacity controls color intensity
        </p>

        <div className="space-y-6">
          {/* Subtle Opacity Row */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">
              Opacity: Subtle (15%)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnimatedCard variant="lift" opacity="subtle" weight="light">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Light + Subtle</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Nearly transparent, ethereal
                </p>
              </AnimatedCard>

              <AnimatedCard variant="lift" opacity="subtle" weight="medium">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Medium + Subtle</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Balanced visibility
                </p>
              </AnimatedCard>

              <AnimatedCard variant="lift" opacity="subtle" weight="heavy">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Heavy + Subtle</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Solid structure, light tint
                </p>
              </AnimatedCard>
            </div>
          </div>

          {/* Medium Opacity Row */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">
              Opacity: Medium (50%)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnimatedCard variant="lift" opacity="medium" weight="light">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Light + Medium</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Visible but delicate
                </p>
              </AnimatedCard>

              <AnimatedCard variant="lift" opacity="medium" weight="medium">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Medium + Medium</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Default - balanced
                </p>
              </AnimatedCard>

              <AnimatedCard variant="lift" opacity="medium" weight="heavy">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Heavy + Medium</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Strong presence
                </p>
              </AnimatedCard>
            </div>
          </div>

          {/* Bold Opacity Row */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">
              Opacity: Bold (80%)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnimatedCard variant="lift" opacity="bold" weight="light">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Light + Bold</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Vibrant but gentle
                </p>
              </AnimatedCard>

              <AnimatedCard variant="lift" opacity="bold" weight="medium">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Medium + Bold</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Clear and prominent
                </p>
              </AnimatedCard>

              <AnimatedCard variant="lift" opacity="bold" weight="heavy">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Heavy + Bold</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Maximum impact
                </p>
              </AnimatedCard>
            </div>
          </div>

          {/* Solid Opacity Row */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">
              Opacity: Solid (95%)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnimatedCard variant="lift" opacity="solid" weight="light">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Light + Solid</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Nearly opaque, delicate structure
                </p>
              </AnimatedCard>

              <AnimatedCard variant="lift" opacity="solid" weight="medium">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Medium + Solid</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Solid and balanced
                </p>
              </AnimatedCard>

              <AnimatedCard variant="lift" opacity="solid" weight="heavy">
                <h4 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Heavy + Solid</h4>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Critical data, maximum clarity
                </p>
              </AnimatedCard>
            </div>
          </div>
        </div>
      </section>

      {/* Animation Variants */}
      <section>
        <h2 className="text-3xl font-bold mb-6 text-[var(--color-text-primary)]">
          Animation Variants
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatedCard variant="lift" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Lift</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Elevates on hover with shadow increase
            </p>
          </AnimatedCard>

          <AnimatedCard variant="float" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Float</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Gentle up/down breathing animation
            </p>
          </AnimatedCard>

          <AnimatedCard variant="tilt" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Tilt</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              3D rotation following mouse position
            </p>
          </AnimatedCard>

          <AnimatedCard variant="glow" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Glow</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Pulsing shadow effect
            </p>
          </AnimatedCard>

          <AnimatedCard variant="scale" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Scale</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Subtle breathing scale animation
            </p>
          </AnimatedCard>

          <AnimatedCard variant="slide" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Slide</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Slides horizontally on hover
            </p>
          </AnimatedCard>

          <AnimatedCard variant="minimal" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Minimal</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Subtle scale on hover only
            </p>
          </AnimatedCard>
        </div>
      </section>

      {/* Pattern Variants */}
      <section>
        <h2 className="text-3xl font-bold mb-6 text-[var(--color-text-primary)]">
          Background Patterns
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatedCard variant="lift" pattern="dots" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Dots</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Subtle dotted pattern background
            </p>
          </AnimatedCard>

          <AnimatedCard variant="lift" pattern="grid" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Grid</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Grid line pattern background
            </p>
          </AnimatedCard>

          <AnimatedCard variant="lift" pattern="waves" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Waves</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Wavy pattern background
            </p>
          </AnimatedCard>

          <AnimatedCard variant="lift" pattern="noise" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Noise</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Fractal noise texture
            </p>
          </AnimatedCard>

          <AnimatedCard variant="lift" pattern="lines" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Lines</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Crosshatch line pattern
            </p>
          </AnimatedCard>

          <AnimatedCard variant="lift" pattern={false} opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant)]">No Pattern</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Clean glass morphism only
            </p>
          </AnimatedCard>
        </div>
      </section>

      {/* Size Variants */}
      <section>
        <h2 className="text-3xl font-bold mb-6 text-[var(--color-text-primary)]">
          Size Variants
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatedCard variant="lift" size="compact" opacity="bold" weight="medium">
            <h3 className="text-lg font-bold text-[var(--color-vibrant-safe)]">Compact</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Smaller padding, rounded-lg
            </p>
          </AnimatedCard>

          <AnimatedCard variant="lift" size="default" opacity="bold" weight="medium">
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Default</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Standard padding, rounded-xl
            </p>
          </AnimatedCard>

          <AnimatedCard variant="lift" size="expanded" opacity="bold" weight="medium">
            <h3 className="text-2xl font-bold text-[var(--color-vibrant-safe)]">Expanded</h3>
            <p className="text-[var(--color-text-secondary)] mt-3">
              Generous padding, rounded-2xl
            </p>
          </AnimatedCard>
        </div>
      </section>

      {/* Real-World Use Cases */}
      <section>
        <h2 className="text-3xl font-bold mb-6 text-[var(--color-text-primary)]">
          Real-World Use Cases
        </h2>

        {/* Stats Cards */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">
            Stat Cards (Light + Bold for visibility over visualizations)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatedCard variant="float" pattern="dots" size="compact" opacity="bold" weight="light">
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-text-secondary)]">Total Streams</p>
                <p className="text-4xl font-black text-[var(--color-vibrant-safe)]">1,234</p>
                <p className="text-xs text-[var(--color-accent)]">↑ 12% from last week</p>
              </div>
            </AnimatedCard>

            <AnimatedCard variant="glow" pattern="waves" size="compact" opacity="bold" weight="light">
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-text-secondary)]">Top Genre</p>
                <p className="text-2xl font-bold text-[var(--color-vibrant-safe)]">Indie Rock</p>
                <p className="text-xs text-[var(--color-accent)]">45% of plays</p>
              </div>
            </AnimatedCard>

            <AnimatedCard variant="scale" pattern="grid" size="compact" opacity="bold" weight="light">
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-text-secondary)]">Listening Time</p>
                <p className="text-4xl font-black text-[var(--color-vibrant-safe)]">127h</p>
                <p className="text-xs text-[var(--color-accent)]">This month</p>
              </div>
            </AnimatedCard>
          </div>
        </div>

        {/* Critical Data Card */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">
            Critical Data (Heavy + Solid for maximum clarity)
          </h3>
          <AnimatedCard
            variant="lift"
            pattern={false}
            size="expanded"
            opacity="solid"
            weight="heavy"
            onClick={() => console.log('Critical card clicked')}
          >
            <div className="space-y-4">
              <h3 className="text-3xl font-black text-[var(--color-vibrant-safe)]">
                Your Music Journey
              </h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                Discover your listening patterns, explore your top tracks, and dive deep
                into your musical preferences. Heavy weight with solid opacity ensures
                readability over any background visualization.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]">
                <div>
                  <p className="text-2xl font-bold text-[var(--color-vibrant-safe)]">152</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Artists</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--color-vibrant-safe)]">1.2K</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Tracks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--color-vibrant-safe)]">24</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Genres</p>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Ambient Info */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">
            Ambient Info (Light + Subtle for non-intrusive presence)
          </h3>
          <AnimatedCard variant="float" pattern="dots" opacity="subtle" weight="light">
            <p className="text-sm text-[var(--color-text-secondary)]">
              This card floats above the visualization without demanding attention.
              Perfect for ambient information or secondary content.
            </p>
          </AnimatedCard>
        </div>
      </section>

      {/* Interactive Examples */}
      <section>
        <h2 className="text-3xl font-bold mb-6 text-[var(--color-text-primary)]">
          Interactive States
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatedCard
            variant="lift"
            opacity="bold"
            weight="medium"
            onClick={() => alert('Card clicked!')}
          >
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Clickable</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Click me to trigger an action
            </p>
          </AnimatedCard>

          <AnimatedCard
            variant="lift"
            opacity="bold"
            weight="medium"
            disabled
          >
            <h3 className="text-xl font-bold text-[var(--color-vibrant-safe)]">Disabled</h3>
            <p className="text-[var(--color-text-secondary)] mt-2">
              This card is disabled
            </p>
          </AnimatedCard>
        </div>
      </section>

      {/* Theme Adaptation Note */}
      <section>
        <AnimatedCard variant="glow" pattern="noise" opacity="medium" weight="medium" size="expanded">
          <h2 className="text-2xl font-bold mb-4 text-[var(--color-vibrant-safe)]">
            🎨 Auto Theme Adaptation
          </h2>
          <p className="text-[var(--color-text-secondary)] leading-relaxed mb-4">
            These cards automatically adapt to your ColorThemeProvider:
          </p>
          <ul className="space-y-2 text-[var(--color-text-secondary)]">
            <li>• Gradient styles alternate based on AmbientTheme variant (1-6)</li>
            <li>• Pattern colors cycle through your theme palette</li>
            <li>• Background colors adapt to dark/light themes automatically</li>
            <li>• Play different songs to see the cards transform!</li>
          </ul>
        </AnimatedCard>
      </section>
    </div>
  );
};

export default AnimatedCardExamples;
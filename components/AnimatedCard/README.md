# AnimatedCard Component

A flexible, animated card component with glass morphism, SVG patterns, and GSAP-powered animations. Automatically responds to your ColorThemeProvider and syncs visual style with the current AmbientTheme variant (1-6).

## Features

- **7 Animation Variants**: lift, float, tilt, glow, scale, slide, minimal
- **5 SVG Patterns**: dots, grid, waves, noise, lines (or none)
- **4 Opacity Presets**: subtle, medium, bold, solid (15% to 95%)
- **3 Weight Variants**: light, medium, heavy (controls presence and structure)
- **3 Size Variants**: compact, default, expanded
- **Glass Morphism**: Named opacity presets with dynamic gradients
- **Theme-Aware**: Auto-responds to AmbientThemeContext (1-6 variants)
- **Auto-Adaptation**: Detects dark/light themes and adjusts colors automatically
- **GSAP Animations**: Smooth transitions matching your app's easing style
- **Fully Accessible**: Disabled state, keyboard support, proper cursor states

## Installation

The component is already set up in your project at `components/AnimatedCard/index.tsx`.

## Basic Usage

```tsx
import AnimatedCard from '@/components/AnimatedCard';

export default function MyPage() {
  return (
    <AnimatedCard opacity="bold" weight="medium">
      <h3>My Content</h3>
      <p>This is a simple animated card</p>
    </AnimatedCard>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Content to render inside the card |
| `onClick` | `() => void` | `undefined` | Click handler (makes card interactive) |
| `className` | `string` | `''` | Additional CSS classes to apply |
| `variant` | `AnimationVariant` | `'lift'` | Animation style (see variants below) |
| `pattern` | `PatternType \| false` | `'dots'` | SVG background pattern |
| `opacity` | `OpacityPreset` | `'medium'` | Named opacity preset |
| `weight` | `WeightVariant` | `'medium'` | Visual weight/presence |
| `size` | `SizeVariant` | `'default'` | Card size preset |
| `disabled` | `boolean` | `false` | Disables interactions and animations |
| `enableHoverEffect` | `boolean` | `true` | Enable/disable hover animations |

## Opacity Presets

Control the color intensity of the card background:

| Preset | Value | Use Case |
|--------|-------|----------|
| `subtle` | 15% | Background ambiance, non-intrusive info |
| `medium` | 50% | **Default** - Balanced visibility |
| `bold` | 80% | Important content, clear readability |
| `solid` | 95% | Critical data, maximum clarity |

```tsx
<AnimatedCard opacity="subtle">Ethereal presence</AnimatedCard>
<AnimatedCard opacity="medium">Balanced default</AnimatedCard>
<AnimatedCard opacity="bold">Clear and prominent</AnimatedCard>
<AnimatedCard opacity="solid">Maximum opacity</AnimatedCard>
```

## Weight Variants

Control the overall presence and structure of the card:

| Weight | Border | Shadow | Blur | Pattern | Animation | Use Case |
|--------|--------|--------|------|---------|-----------|----------|
| `light` | 1px thin | Subtle | 8px | 30% | Full intensity | Floating info, minimal UI |
| `medium` | 1px | Moderate | 12px + saturate | 60% | **Default** - 80% intensity | Standard content |
| `heavy` | 2px thick | Strong | 16px + saturate + contrast | 80% | 60% intensity | Critical data, modals |

```tsx
<AnimatedCard weight="light">Delicate, floating</AnimatedCard>
<AnimatedCard weight="medium">Balanced presence</AnimatedCard>
<AnimatedCard weight="heavy">Solid, demands attention</AnimatedCard>
```

### Weight × Opacity Combinations

The power comes from combining these two properties:

```tsx
{/* Light structure but bold color - great for stats over busy backgrounds */}
<AnimatedCard weight="light" opacity="bold">
  <p className="text-4xl font-bold">1,234</p>
  <p className="text-sm">Total Plays</p>
</AnimatedCard>

{/* Heavy structure with solid opacity - maximum clarity for critical info */}
<AnimatedCard weight="heavy" opacity="solid">
  <h2>Important Dashboard</h2>
  <p>Critical data that must be readable</p>
</AnimatedCard>

{/* Light + Subtle - ambient presence that doesn't distract */}
<AnimatedCard weight="light" opacity="subtle">
  <p className="text-sm">Background info</p>
</AnimatedCard>
```

## Animation Variants

### `lift`
Elevates the card on hover with increased shadow. Perfect for clickable cards and CTAs.

```tsx
<AnimatedCard variant="lift" onClick={handleClick}>
  <h3>Click me!</h3>
</AnimatedCard>
```

### `float`
Gentle vertical breathing animation. Great for hero sections and featured content.

```tsx
<AnimatedCard variant="float">
  <h3>Featured Track</h3>
</AnimatedCard>
```

### `tilt`
3D rotation that follows mouse position. Eye-catching for interactive elements.

```tsx
<AnimatedCard variant="tilt">
  <h3>Explore</h3>
</AnimatedCard>
```

### `glow`
Pulsing shadow effect. Ideal for highlighting important stats or notifications.

```tsx
<AnimatedCard variant="glow">
  <h3>New Achievement!</h3>
</AnimatedCard>
```

### `scale`
Subtle breathing scale animation. Works well for stat cards and metrics.

```tsx
<AnimatedCard variant="scale">
  <p className="text-4xl font-bold">1,234</p>
  <p>Total Plays</p>
</AnimatedCard>
```

### `slide`
Slides horizontally on hover. Good for navigation cards or menu items.

```tsx
<AnimatedCard variant="slide" onClick={navigate}>
  <h3>View More →</h3>
</AnimatedCard>
```

### `minimal`
Subtle scale on hover only. Best for dense layouts or secondary content.

```tsx
<AnimatedCard variant="minimal">
  <p>Minimal interaction</p>
</AnimatedCard>
```

**Note**: Heavy weight cards have reduced animation intensity (60%) to maintain their solid, grounded feel.

## SVG Patterns

### Available Patterns

- `dots` - Subtle dotted pattern (default)
- `grid` - Grid line pattern
- `waves` - Wavy pattern
- `noise` - Fractal noise texture
- `lines` - Crosshatch lines
- `false` - No pattern (clean glass only)

```tsx
<AnimatedCard pattern="waves">
  <h3>With Waves</h3>
</AnimatedCard>

<AnimatedCard pattern={false}>
  <h3>No Pattern</h3>
</AnimatedCard>
```

**Note**: Pattern colors and opacity automatically adapt based on:
- Current AmbientTheme variant (1-6) - cycles through theme colors
- Card weight - heavier cards show more prominent patterns

## Size Variants

```tsx
{/* Compact: p-4, rounded-lg */}
<AnimatedCard size="compact">
  <p className="text-sm">Compact card</p>
</AnimatedCard>

{/* Default: p-6, rounded-xl */}
<AnimatedCard size="default">
  <p>Default card</p>
</AnimatedCard>

{/* Expanded: p-8, rounded-2xl */}
<AnimatedCard size="expanded">
  <p className="text-lg">Expanded card</p>
</AnimatedCard>
```

## Gradient Styles & Theme Integration

The card automatically responds to your `ColorThemeProvider` and `AmbientThemeContext`:

### Gradient Alternation
- **Odd variants (1, 3, 5)**: Linear gradient from top-left to bottom-right
- **Even variants (2, 4, 6)**: Radial gradient from top-left corner

### Auto Dark/Light Adaptation
The component detects your theme's `--color-text-primary`:
- If white → Dark theme → Uses `--color-bg-1`, `--color-darker`
- If black → Light theme → Uses `--color-bg-3`, `--color-lighter`

### Pattern Color Cycling
Patterns cycle through your theme palette based on variant:
1. Primary
2. Secondary
3. Accent
4. Vibrant
5. Complementary 1
6. Complementary 2

**Example**: When `AmbientThemeContext.variant = 2`:
- Radial gradient from corner
- Pattern uses secondary color
- Automatically adapts to current theme brightness

## Real-World Examples

### Stat Cards Over Busy Visualizations

Use `light` weight + `bold` opacity for visibility without heaviness:

```tsx
<div className="grid grid-cols-3 gap-4">
  <AnimatedCard
    variant="float"
    pattern="dots"
    size="compact"
    opacity="bold"
    weight="light"
  >
    <p className="text-sm text-[var(--color-text-secondary)]">Total Streams</p>
    <p className="text-4xl font-black text-[var(--color-vibrant)]">1,234</p>
    <p className="text-xs text-[var(--color-accent)]">↑ 12%</p>
  </AnimatedCard>

  {/* More stat cards... */}
</div>
```

### Critical Dashboard Content

Use `heavy` weight + `solid` opacity for maximum clarity:

```tsx
<AnimatedCard
  variant="lift"
  pattern={false}
  size="expanded"
  opacity="solid"
  weight="heavy"
>
  <h2 className="text-3xl font-black text-[var(--color-vibrant)]">
    Your Music Journey
  </h2>
  <p className="text-[var(--color-text-secondary)]">
    Heavy weight with solid opacity ensures readability over any background.
  </p>
  <div className="grid grid-cols-3 gap-4 pt-4">
    {/* Stats grid */}
  </div>
</AnimatedCard>
```

### Ambient Background Info

Use `light` weight + `subtle` opacity for non-intrusive presence:

```tsx
<AnimatedCard
  variant="float"
  pattern="dots"
  opacity="subtle"
  weight="light"
>
  <p className="text-sm text-[var(--color-text-secondary)]">
    This floats above without demanding attention
  </p>
</AnimatedCard>
```

### Navigation Cards

Use `medium` weight + `bold` opacity with `lift` variant:

```tsx
<AnimatedCard
  variant="lift"
  pattern="grid"
  opacity="bold"
  weight="medium"
  onClick={() => router.push('/feature')}
>
  <h3 className="text-2xl font-bold text-[var(--color-vibrant)]">
    Discover New Music
  </h3>
  <p className="text-[var(--color-text-secondary)]">
    Explore personalized recommendations
  </p>
</AnimatedCard>
```

## Styling & Customization

### Using className Override

```tsx
<AnimatedCard
  className="max-w-md mx-auto mt-8"
  variant="lift"
  opacity="bold"
  weight="medium"
>
  <h3>Custom positioned card</h3>
</AnimatedCard>
```

### Color Variables Available

The component uses your ColorThemeProvider variables and adapts automatically:

- `--color-primary`, `--color-secondary`, `--color-accent`
- `--color-vibrant`, `--color-complementary-1`, `--color-complementary-2`
- `--color-bg-1`, `--color-bg-2`, `--color-bg-3`
- `--color-darker`, `--color-lighter`
- `--color-text-primary`, `--color-text-secondary`
- `--color-border`

## Performance Considerations

- Uses `will-change: transform` for GPU acceleration
- GSAP animations are hardware-accelerated
- Pattern SVGs are base64-encoded for efficiency
- Animations clean up on unmount to prevent memory leaks
- Heavy weight cards have reduced animation intensity for better performance

## Accessibility

- Proper cursor states (`cursor-pointer` when clickable)
- Disabled state with visual feedback (50% opacity)
- Can be fully controlled via keyboard when clickable
- Respects user motion preferences (via GSAP)
- High contrast borders on heavy weight cards

## Recommended Combinations

| Use Case | Variant | Pattern | Opacity | Weight | Size |
|----------|---------|---------|---------|--------|------|
| Stats over visualization | float/scale | dots/grid | bold | light | compact |
| Hero feature card | tilt | waves/noise | bold | medium | expanded |
| Critical dashboard | lift | false | solid | heavy | expanded |
| Navigation item | lift | grid | bold | medium | default |
| Background info | float | dots | subtle | light | compact |
| Modal/overlay | minimal | false | solid | heavy | expanded |
| Notification | glow | dots | bold | medium | compact |

## Examples Page

View all variants and configurations:

```tsx
import AnimatedCardExamples from '@/components/AnimatedCard/examples';

export default function ExamplesPage() {
  return <AnimatedCardExamples />;
}
```

Or visit `/test-cards` in your app.

## Tips

1. **Choose opacity based on background**: Use `bold` or `solid` over busy visualizations, `subtle` for calm backgrounds
2. **Match weight to importance**: `light` for ambient, `medium` for standard, `heavy` for critical
3. **Combine wisely**: `light + bold` gives visibility without visual heaviness
4. **Pattern selection**: Use `false` for text-heavy content, patterns for visual interest
5. **Animation + weight**: Heavy cards have subtler animations by design - this is intentional
6. **Size appropriately**: `compact` for grids/stats, `expanded` for featured content
7. **Disable when loading**: Use `disabled` prop during data fetching

## Migration from Old API

If you were using numeric `glassOpacity`:

```tsx
// Old (still works but deprecated)
<AnimatedCard glassOpacity={0.1} />

// New - use named presets
<AnimatedCard opacity="subtle" />   // 0.15
<AnimatedCard opacity="medium" />   // 0.5
<AnimatedCard opacity="bold" />     // 0.8
<AnimatedCard opacity="solid" />    // 0.95
```

## Browser Support

- Modern browsers with CSS backdrop-filter support
- Graceful degradation on older browsers (no blur effect)
- GSAP ensures smooth animations across all browsers
- Auto-detection of dark/light themes via CSS variables
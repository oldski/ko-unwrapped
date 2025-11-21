# useMouseShadow Hook

A performant mouse-driven layered shadow effect that creates interactive 3D depth for card components.

## Usage

```tsx
import { useRef } from 'react';
import useMouseShadow from '@/hooks/useMouseShadow';

function MyCard() {
  const cardRef = useRef<HTMLDivElement>(null);

  // Basic usage with defaults
  useMouseShadow(cardRef);

  return <div ref={cardRef}>Card content</div>;
}
```

## Options

```tsx
useMouseShadow(cardRef, {
  colorVar: '--color-vibrant',  // CSS variable for shadow color
  intensity: 15,                 // Shadow movement intensity (default: 20)
  enabled: true,                 // Enable/disable effect (default: true)
});
```

## Examples

### Different color variations
```tsx
// Use primary color
useMouseShadow(cardRef, { colorVar: '--color-primary' });

// Use accent color
useMouseShadow(cardRef, { colorVar: '--color-accent' });

// Use background color
useMouseShadow(cardRef, { colorVar: '--color-bg-3' });
```

### Adjust intensity
```tsx
// Subtle effect
useMouseShadow(cardRef, { intensity: 10 });

// Dramatic effect
useMouseShadow(cardRef, { intensity: 30 });
```

### Conditional usage
```tsx
const [isEnabled, setIsEnabled] = useState(true);
useMouseShadow(cardRef, { enabled: isEnabled });
```

## Performance Guidelines

- ✅ **Use on 2-4 key cards** - Perfect for hero sections, featured content
- ⚠️ **Avoid on lists** - Don't use on every item in a scrolling list
- ✅ **Works with theme colors** - Automatically updates when colors change
- ✅ **Optimized** - Cached calculations, no frame drops

## Best Practices

1. **Choose prominent cards**: Apply to main content cards (Now Playing, On This Day, Stats Summary)
2. **Vary intensity**: Use different intensities to create hierarchy
3. **Match your theme**: Use color variables that complement your design
4. **Test performance**: If you notice lag, reduce the number of instances

## Example: NowPlaying Component

```tsx
import { useRef } from 'react';
import useMouseShadow from '@/hooks/useMouseShadow';

export default function NowPlaying() {
  const cardRef = useRef<HTMLDivElement>(null);

  // More dramatic effect for the hero card
  useMouseShadow(cardRef, {
    colorVar: '--color-vibrant',
    intensity: 25
  });

  return (
    <div ref={cardRef} className="...">
      {/* Your content */}
    </div>
  );
}
```
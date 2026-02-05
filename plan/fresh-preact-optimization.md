# Fresh & Preact Optimization Plan

## Completed
- ✅ Step 1: Move data fetching to route handlers and pass to islands as props

## Remaining Optimizations

### Step 2: Remove CarouselWrapper Island
**Current issue**: `CarouselWrapper` exists only for a fade-in animation, creating an unnecessary island boundary.

**Solution**:
- Merge `CarouselWrapper` into `Carousel` island
- Move fade-in animation to CSS or keep in combined component
- Update `routes/index.tsx` to use `Carousel` directly

**Benefits**:
- One less island to hydrate
- Simpler component tree
- Reduced JavaScript bundle size

**Files to modify**:
- `islands/CarouselWrapper.tsx` - Delete this file
- `islands/Carousel.tsx` - Add fade-in logic here
- `routes/index.tsx` - Import `Carousel` instead of `CarouselWrapper`

---

### Step 3: Convert Appropriate State to Preact Signals
**Current issue**: All state uses `useState`, which is less efficient than signals for fine-grained reactivity. Signals prevent unnecessary re-renders.

**Solution**: Replace `useState` with signals from `@preact/signals` for:
- `islands/Carousel.tsx` - `currentIndex` signal
- `islands/Nav.tsx` - `isWorkOpen` and `isSmallScreen` signals
- `islands/WorkModal.tsx` - `isClosing`, `isOpening`, `hoveredHref`, `mousePosition` signals
- `islands/WorkModalMobile.tsx` - `isClosing`, `isOpening` signals

**Example conversion**:
```typescript
// Before
const [currentIndex, setCurrentIndex] = useState(0);

// After
import { signal } from "@preact/signals";
const currentIndex = signal(0);

// Usage
currentIndex.value = 5; // set
const index = currentIndex.value; // get
```

**Benefits**:
- Fine-grained reactivity (only affected DOM nodes update)
- Better performance with less re-renders
- Smaller bundle size (signals are lightweight)
- Can pass signals down without causing parent re-renders

---

### Step 4: Optimize Static Components
**Current issue**: Need to verify all non-interactive components are in `/components` and properly optimized.

**Audit checklist**:
- ✅ `Button.tsx` - Verify it's truly static (has onClick, but receives it as prop)
- ✅ `Image.tsx` - Static ✓
- ✅ `PageHeader.tsx` - Static ✓
- ✅ `LandingPageTitle.tsx` - Check if used
- ✅ `SectionTitle.tsx` - Check if used
- ✅ `Subsection.tsx` - Check if used

**Optimizations**:
1. Ensure `jsxPrecompileSkipElements` in `deno.json` includes all necessary elements
2. Remove unused components
3. Consider using `f-client-nav={false}` on links that don't need client-side navigation

**Files to audit**:
- All files in `components/` directory
- Check usage with grep/search

---

### Step 5: Add Partial Hydration Hints
**Current issue**: Islands hydrate immediately, even if not needed right away.

**Solution**: Add Fresh partial hydration attributes:

**For WorkModal islands**:
```tsx
// Only hydrate when user clicks "Work" button
<WorkModal f-partial="click" ... />
<WorkModalMobile f-partial="click" ... />
```

**For Navigation links**:
```tsx
// Disable client-side navigation for simple page loads
<a href="/about" f-client-nav={false}>About</a>
```

**Benefits**:
- Faster initial page load
- Islands only hydrate when needed
- Reduced JavaScript execution on page load

**Files to modify**:
- `islands/Nav.tsx` - Add `f-partial` to modals, `f-client-nav={false}` to links
- Consider adding to other interactive elements

---

## Additional Optimizations to Consider

### 6. Extract WorkPreview Type to Shared Types File
**Current issue**: `WorkPreview` interface is duplicated in multiple files.

**Solution**:
- Create `types/work-preview.ts`
- Export interface from there
- Import in all files that need it

**Files affected**:
- `routes/_app.tsx`
- `islands/Nav.tsx`
- `islands/WorkModal.tsx`
- `islands/WorkModalMobile.tsx`
- `routes/api/work-previews.ts`

---

### 7. Deduplicate Work Preview Fetching Logic
**Current issue**: Work preview fetching logic is duplicated in `_app.tsx` and `routes/api/work-previews.ts`.

**Solution**:
- Create `services/work-preview-service.ts`
- Export `fetchWorkPreviews` function
- Use in both `_app.tsx` handler and API route

**Benefits**:
- DRY principle
- Single source of truth
- Easier to maintain

---

### 8. Consider Using CSS Animations Instead of JS State
**Current issue**: Fade-in animations use JavaScript state (`isFadingIn`, `isClosing`, `isOpening`).

**Solution**:
- Use CSS animations with `@keyframes`
- Use Tailwind's `animate-*` utilities
- Reduce JavaScript state management

**Example**:
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn 500ms ease-in;
}
```

**Benefits**:
- Better performance (GPU-accelerated)
- Less JavaScript execution
- Simpler component logic

---

### 9. Evaluate Screen Size Detection Strategy
**Current issue**: `Nav.tsx` uses `useEffect` with resize listener for `isSmallScreen`.

**Solution Options**:
1. Use CSS media queries with `display: none/block`
2. Use `window.matchMedia` with signals
3. Server-side User-Agent detection (less reliable)

**Recommended**: CSS media queries
```tsx
// Desktop modal - hidden on mobile
<div class="hidden md:block">
  <WorkModal ... />
</div>

// Mobile modal - hidden on desktop
<div class="block md:hidden">
  <WorkModalMobile ... />
</div>
```

**Benefits**:
- No JavaScript needed
- No flash of wrong component
- Better performance

---

### 10. Image Loading Optimization
**Current issue**: Images use `loading="lazy"` but could be further optimized.

**Solutions**:
1. Use responsive images with `srcset`
2. Add `decoding="async"` for better rendering
3. Consider modern formats (WebP/AVIF) with fallbacks
4. Add proper `width` and `height` to prevent layout shift

**Example**:
```tsx
<img
  src={image.url}
  srcset={`${image.formats?.small?.url} 640w, ${image.formats?.medium?.url} 1024w`}
  sizes="(max-width: 640px) 100vw, 1024px"
  width={image.width}
  height={image.height}
  loading="lazy"
  decoding="async"
  alt={image.alternativeText}
/>
```

---

## Priority Order
1. **High Priority**: Step 2 (Remove CarouselWrapper) - Easy win
2. **High Priority**: Step 3 (Signals) - Significant performance improvement
3. **Medium Priority**: Step 6 & 7 (Type extraction and deduplication) - Code quality
4. **Medium Priority**: Step 9 (CSS-based screen detection) - Remove unnecessary JS
5. **Low Priority**: Step 5 (Partial hydration) - Nice to have
6. **Low Priority**: Step 8 (CSS animations) - Marginal improvement
7. **Low Priority**: Step 10 (Image optimization) - Nice to have

---

## Expected Performance Improvements
- **Reduced JavaScript bundle size**: ~10-15% (removing CarouselWrapper, using signals)
- **Faster initial render**: No loading states, server-side data
- **Fewer re-renders**: Signals provide fine-grained reactivity
- **Better LCP (Largest Contentful Paint)**: Images loaded server-side
- **Better TBT (Total Blocking Time)**: Less JavaScript execution

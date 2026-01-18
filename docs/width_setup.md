# Width Setup Specification - Shared Constant Approach

## Overview

This document specifies the implementation of a shared constant for managing content width across the application, ensuring consistency between CSS-based layouts (app-shell) and Chakra UI components (Footer, Container, etc.).

## Goals

1. Single source of truth for max content width
2. Consistency across CSS and React components
3. Easy to maintain and update globally
4. Fully responsive (mobile + laptop)

## Implementation Steps

### Step 1: Create Layout Constants File

**File**: `src/app/constants/layout.ts`

```typescript
/**
 * Layout constants for the application
 */

/** Maximum width for main content areas (app shell, footer, containers) */
export const MAX_CONTENT_WIDTH = "1100px";

/** Responsive horizontal padding for containers */
export const CONTAINER_PADDING = {
  base: 4,  // 1rem on mobile
  md: 6,    // 1.5rem on desktop
};
```

### Step 2: Update globals.css to Use CSS Variable

**File**: `src/app/globals.css`

```css
/* Add at the top of the file, after html/body rules */
:root {
  --max-content-width: 1100px;
}

/* Update .app-shell class */
.app-shell {
  width: 100%;
  max-width: var(--max-content-width); /* Changed from 1100px */
  margin: 0 auto;
  padding: 0 1.5rem 3rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}
```

### Step 3: Update Footer Component

**File**: `src/app/components/Footer.tsx`

```typescript
"use client";

import { Box, Container, HStack, Image, Link, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { MAX_CONTENT_WIDTH, CONTAINER_PADDING } from "@/constants/layout"; // Add import

export default function Footer() {
  return (
    <Box as="footer" borderTopWidth="1px" borderTopColor="border.muted" mt={10}>
      <Container
        maxW={MAX_CONTENT_WIDTH}  // Changed from "6xl"
        px={CONTAINER_PADDING}     // Changed from {{ base: 4, md: 6 }}
        py={6}
      >
        <Stack
          direction={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "center" }}
          justify="space-between"
          gap={4}
        >
          {/* Rest remains unchanged */}
        </Stack>
      </Container>
    </Box>
  );
}
```

### Step 4: Apply to Other Container Components (Optional)

For any other components using `Container` or `Box` for main content areas:

```typescript
import { MAX_CONTENT_WIDTH, CONTAINER_PADDING } from "@/constants/layout";

<Container maxW={MAX_CONTENT_WIDTH} px={CONTAINER_PADDING}>
  {/* content */}
</Container>
```

## Benefits

1. **Single Source of Truth**: Change `MAX_CONTENT_WIDTH` once, affects entire app
2. **Type Safety**: Import from TypeScript constant, get autocomplete and type checking
3. **CSS-JS Bridge**: CSS variable ensures alignment between CSS and Chakra components
4. **Maintainable**: Easy to update width globally or add new layout constants
5. **Responsive**: Works seamlessly on mobile and desktop (maxW is a maximum, not fixed)

## Testing Checklist

- [ ] Footer aligns with main content on desktop (1100px+ screens)
- [ ] Footer and app-shell have same max-width
- [ ] Mobile layout remains responsive (< 768px)
- [ ] Tablet layout works correctly (768px - 1100px)
- [ ] No horizontal scrolling on any screen size
- [ ] Padding scales correctly on mobile vs desktop
- [ ] All pages using Container component are consistent

## Future Enhancements

Consider adding more layout constants:

```typescript
export const LAYOUT = {
  maxContentWidth: "1100px",
  maxWideWidth: "1400px",      // For full-width sections
  maxNarrowWidth: "800px",      // For article/form content
  spacing: {
    section: { base: 8, md: 12 },
    container: { base: 4, md: 6 },
  },
} as const;
```

## Migration Notes

- This approach replaces hardcoded values with shared constants
- Existing functionality remains unchanged
- No breaking changes to user experience
- Can be applied incrementally across the codebase

# Width Setup Specification - Chakra-Native Approach

## Overview

This document specifies the implementation of consistent content width using Chakra UI design tokens, ensuring consistency between CSS-based layouts (app-shell) and Chakra UI components (Footer, Container, etc.).

## Philosophy

Stay as close as possible to Chakra UI conventions by:
1. Using Chakra's size tokens ("6xl") instead of hardcoded pixels
2. Leveraging Chakra's design system for maintainability
3. Keeping CSS in sync with Chakra token values

## Chakra Size Tokens Reference

- 5xl: 1024px
- **6xl: 1152px** ← We'll use this
- 7xl: 1280px

Current app-shell uses 1100px, which is closest to 6xl (1152px).

## Goals

1. Single source of truth using Chakra design tokens
2. Consistency across CSS and React components
3. Easy to maintain through Chakra's design system
4. Fully responsive (mobile + laptop)

## Implementation Steps

### Step 1: Create Layout Constants File

**File**: `src/app/constants/layout.ts`

```typescript
/**
 * Layout constants for the application
 * Uses Chakra UI size tokens for consistency
 */

/** Maximum width for main content areas - uses Chakra's 6xl token (1152px) */
export const MAX_CONTENT_WIDTH = "6xl";

/** Responsive horizontal padding for containers */
export const CONTAINER_PADDING = {
  base: 4,  // 1rem on mobile
  md: 6,    // 1.5rem on desktop
};
```

### Step 2: Update globals.css to Match Chakra Token

**File**: `src/app/globals.css`

```css
/* Add at the top of the file, after html/body rules */
:root {
  --max-content-width: 1152px; /* Matches Chakra's 6xl token */
}

/* Update .app-shell class */
.app-shell {
  width: 100%;
  max-width: var(--max-content-width); /* Changed from 1100px to 1152px */
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
        maxW={MAX_CONTENT_WIDTH}  // Now uses "6xl" token
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

1. **Chakra-Native**: Uses Chakra's design token system ("6xl") instead of hardcoded pixels
2. **Single Source of Truth**: Change `MAX_CONTENT_WIDTH` once, affects entire app
3. **Type Safety**: Import from TypeScript constant, get autocomplete and type checking
4. **Design System Consistency**: Aligns with Chakra UI best practices
5. **CSS-JS Bridge**: CSS variable (1152px) ensures alignment with Chakra token value
6. **Maintainable**: Easy to update width globally or change to different token (5xl, 7xl, etc.)
7. **Responsive**: Works seamlessly on mobile and desktop (maxW is a maximum, not fixed)

## Testing Checklist

- [ ] Footer aligns with main content on desktop (1152px+ screens)
- [ ] Footer and app-shell have same max-width (1152px / 6xl)
- [ ] Mobile layout remains responsive (< 768px)
- [ ] Tablet layout works correctly (768px - 1152px)
- [ ] No horizontal scrolling on any screen size
- [ ] Padding scales correctly on mobile vs desktop
- [ ] All pages using Container component are consistent
- [ ] Content width increased from 1100px to 1152px looks acceptable

## Future Enhancements

Consider adding more layout constants using Chakra tokens:

```typescript
export const LAYOUT = {
  maxContentWidth: "6xl",      // 1152px - main content
  maxWideWidth: "7xl",         // 1280px - full-width sections
  maxNarrowWidth: "4xl",       // 896px - article/form content
  spacing: {
    section: { base: 8, md: 12 },
    container: { base: 4, md: 6 },
  },
} as const;
```

## Migration Notes

- This approach uses Chakra design tokens for better consistency
- App-shell width increases from 1100px to 1152px (52px wider)
- Existing functionality remains unchanged
- No breaking changes to user experience
- Can be applied incrementally across the codebase
- Maintains Chakra UI best practices and conventions

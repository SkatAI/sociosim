# Playwright E2E Testing Guide

This guide explains how to run and develop E2E tests for SocioSim using Playwright.

## Quick Start

### 1. Install Playwright Browsers (one-time setup)

```bash
npx playwright install --with-deps chromium firefox webkit
```

Verify installation:
```bash
npx playwright --version  # Should show 1.56.1
```

### 2. Start Supabase

Tests require a running Supabase instance:

```bash
make supa-start
```

Or manually:
```bash
supabase start
```

### 3. Run Tests

**Run all tests:**
```bash
npm run test:e2e
# or
make test-e2e
```

**Run in UI mode (recommended for development):**
```bash
npm run test:e2e:ui
# or
make test-e2e-ui
```

The UI mode opens an interactive browser where you can see tests execute, pause, step through, and inspect elements.

**Run with visible browser:**
```bash
npm run test:e2e:headed
# or
make test-e2e-headed
```

**Debug a specific test:**
```bash
npm run test:e2e:debug -- -g "should log in with valid credentials"
# or
make test-e2e-debug
```

### 4. View Test Results

After tests complete, view the HTML report:

```bash
npm run test:e2e:report
# or
make test-e2e-report
```

This opens `playwright-report/index.html` which shows:
- All test results
- Screenshots on failure
- Video recordings on failure
- Network traces for debugging

## Test Structure

```
e2e/
├── fixtures/
│   └── auth.fixture.ts           # Authentication fixture with authenticatedPage
├── page-objects/
│   ├── base.page.ts              # Base class for all page objects
│   ├── login.page.ts             # Login page interactions
│   ├── register.page.ts          # Registration page
│   ├── dashboard.page.ts         # Dashboard interactions
│   ├── profile.page.ts           # Profile update form
│   ├── interview.page.ts         # Interview/chat interface
│   ├── reset-password.page.ts    # Password reset flows
│   └── header.component.ts       # Header navigation component
├── tests/
│   ├── auth/
│   │   ├── connexion.spec.ts     # Login tests (8 tests)
│   │   ├── inscription.spec.ts   # Registration tests (9 tests)
│   │   └── reinitialisation-mdp.spec.ts  # Password reset (7 tests)
│   ├── profile/
│   │   └── mise-a-jour-profil.spec.ts    # Profile update (9 tests)
│   ├── entretiens/
│   │   └── nouvel-entretien.spec.ts      # New interview (8 tests)
│   └── navigation/
│       ├── header-interactions.spec.ts   # Header menu tests (10 tests)
│       └── routes-protegees.spec.ts      # Protected route access (8 tests)
├── setup/
│   ├── global-setup.ts           # Creates test users before tests
│   └── global-teardown.ts        # Cleanup after tests
└── utils/                         # Utilities (for future use)
```

## Key Features

### Custom Fixtures

The `authenticatedPage` fixture automatically logs in before tests:

```typescript
import { test, expect } from "@/e2e/fixtures/auth.fixture";

test("should access dashboard", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/dashboard");
  // User is already authenticated as 'student'
});
```

Authenticate as different roles:

```typescript
test("teacher can update settings", async ({ page, authenticateAs }) => {
  const { userId } = await authenticateAs("teacher");
  await page.goto("/settings");
  // User authenticated as teacher
});
```

### Page Object Models

Encapsulate page interactions in reusable classes:

```typescript
import { LoginPage } from "@/e2e/page-objects/login.page";

test("login flow", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("student.test@sociosim.local", "TestPassword123!");
  await loginPage.waitForURL("/dashboard");
});
```

### Test Users

Three test users are automatically created:

| Email | Password | Role |
|-------|----------|------|
| student.test@sociosim.local | TestPassword123! | student |
| teacher.test@sociosim.local | TestPassword123! | teacher |
| admin.test@sociosim.local | TestPassword123! | admin |

These are created during global setup via `e2e/setup/global-setup.ts`.

### Error Capture

Tests automatically capture on failure:

- **Screenshots**: Full page screenshot
- **Videos**: Recording of browser activity
- **Traces**: Network activity, console logs, DOM snapshots
- **Console Errors**: Logged to output

View captured artifacts in the HTML report.

## Test Suites

### Authentication Tests (24 tests)

**connexion.spec.ts** - Login flow:
- Valid credentials redirect to dashboard
- Invalid credentials show error
- Success messages for signup/password reset
- Password visibility toggle
- Form validation
- Form clearing on reload
- Submit button state

**inscription.spec.ts** - Registration flow:
- Create account with valid data
- Empty field validation
- Email format validation
- Password length validation
- Password mismatch validation
- Password visibility toggle
- Links to login
- Form clearing on reload
- Submit button state

**reinitialisation-mdp.spec.ts** - Password reset flow:
- Navigate to reset password page
- Request reset with valid email
- Error for non-existent email
- Error for empty email
- Invalid/expired token handling
- Mismatched password validation
- Password length validation
- Password visibility toggle
- Links to login

### Profile Tests (9 tests)

**mise-a-jour-profil.spec.ts**:
- Load profile with pre-filled data
- Update first name
- Update last name
- Update both names together
- Save button state (disabled until changes)
- Update email with verification message
- Error for empty required fields
- Header avatar updates after name change
- Navigate back to dashboard
- Email format validation

### Interview Tests (8 tests)

**nouvel-entretien.spec.ts**:
- Display agent cards on dashboard
- Start new interview with agent
- Show interview page with agent name
- Empty state for new interviews
- Send message and display in chat
- Handle Enter key to send
- Handle Shift+Enter for newline
- Disable input during streaming

### Navigation Tests (18 tests)

**header-interactions.spec.ts**:
- Display user avatar for authenticated users
- Open popover menu on avatar click
- Display user information in popover
- Navigate to profile via menu
- Navigate to dashboard via menu
- Logout and redirect to login
- Show role for teacher user
- Show role for admin user
- Don't show role for student user
- Maintain authentication across pages

**routes-protegees.spec.ts**:
- Redirect to login from /dashboard
- Redirect to login from /profile
- Redirect to login from /interview
- Allow access to /login
- Allow access to /register
- Allow access to /reset-password
- Allow access to home page

## Writing Tests

### Test Template

```typescript
import { test, expect } from "@/e2e/fixtures/auth.fixture";
import { SomePage } from "@/e2e/page-objects/some.page";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // Capture console and page errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });

    page.on("pageerror", (error) => {
      console.error(`[Page Error]: ${error.message}`);
    });
  });

  test("should do something specific", async ({ authenticatedPage }) => {
    const page = new SomePage(authenticatedPage);
    await page.goto();

    // Act
    await page.clickButton();

    // Assert
    expect(authenticatedPage).toHaveURL("/expected-url");
  });
});
```

### Best Practices

1. **Use Page Objects**: Encapsulate selectors and interactions in POM classes
2. **Descriptive Names**: Test names should clearly state what they test
3. **Single Responsibility**: Each test should verify one thing
4. **Use Fixtures**: Use `authenticatedPage` instead of manually logging in
5. **Avoid Fixed Waits**: Use `waitForURL`, `waitForSelector`, etc. instead of `waitForTimeout`
6. **Test in French**: Test descriptions and messages should be in French

## Browser Support

Tests run on multiple browsers:

```bash
npm run test:e2e:chromium  # Chrome/Chromium only
npm run test:e2e:firefox   # Firefox only
npm run test:e2e:webkit    # Safari/WebKit only
```

All three browsers run by default in `npm run test:e2e`.

## Configuration

**File**: `playwright.config.ts`

Key settings:
- **Base URL**: http://localhost:3000
- **Locale**: fr-FR (French)
- **Timeout**: 60s per test, 10s per action
- **Parallel**: Tests run in parallel for speed
- **Screenshot**: On failure only
- **Video**: On failure only
- **Trace**: On failure (network, DOM snapshots)

## Debugging

### Step Through Tests

```bash
npm run test:e2e:debug -- -g "test name"
```

Then use the Playwright Inspector to step through and inspect elements.

### View Test Execution

```bash
npm run test:e2e:headed
```

Shows the browser during test execution.

### UI Mode

```bash
npm run test:e2e:ui
```

Interactive UI where you can:
- Play/pause tests
- Step through one action at a time
- Inspect elements
- See network activity
- View console logs

## Troubleshooting

### "Supabase not running"

Start Supabase:
```bash
make supa-start
```

### "Cannot find module '@/e2e/...'"

Path aliases require TypeScript. Run lint to check:
```bash
make lint
```

### Tests timeout waiting for element

The element might not be visible or might use different selectors. Debug with:
```bash
npm run test:e2e:ui
```

Pause and inspect the element in browser dev tools.

### Screenshot shows blank page

Tests might be running too fast before content loads. Add:
```typescript
await page.waitForLoadState("networkidle");
```

## Environment Variables

**File**: `.env.test` (committed to repo)

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
```

## Advanced Usage

### Run Specific Test File

```bash
npx playwright test e2e/tests/auth/connexion.spec.ts
```

### Run Tests Matching Pattern

```bash
npx playwright test -g "should log in"
```

### Run with Custom Config

```bash
npx playwright test --config=playwright.config.ts
```

### Generate Code with Codegen

```bash
npm run test:e2e:codegen
```

Opens a browser where you can interact with the app and Playwright generates test code automatically.

## CI/CD

Tests are designed to run locally. CI/CD integration can be added to GitHub Actions by modifying `.github/workflows/ci.yml`. See the implementation plan for details.

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Assertion Reference](https://playwright.dev/docs/test-assertions)
- [API Reference](https://playwright.dev/docs/api/class-test)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

**Total Test Count**: ~59 tests across 7 test suites covering all critical user flows.

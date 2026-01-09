# Session Management Analysis - SocioSim

**Date:** 2026-01-09  
**Issue:** Intermittent login/logout/reset-password hangs  
**Environment:** Local (Mac + Docker) and Production (Digital Ocean)  
**Symptom:** Buttons hang forever, no console errors, Network tab shows nothing  

---

## Analysis

The most consistent explanation is that some Supabase auth calls **never resolve**, leaving UI stuck behind `isAuthLoading` gates. When this happens, the Network tab shows nothing because the call never reaches the HTTP layer (or the app never reaches the call site). The behavior is intermittent and can show up after password reset flows or long sessions.

Key observations:
- The app blocks rendering on `useAuthUser` until `supabase.auth.getSession()` resolves.
- When `getSession()` or `signOut()` hangs, there are no errors and no network requests.
- Multiple direct auth calls across the app can create inconsistent state and make failures harder to diagnose.

---

## Likely Causes (High Confidence)

1. **Hung auth promises**
   - `getSession()`, `signInWithPassword()`, or `signOut()` sometimes never resolve.
   - This creates infinite spinners because the UI waits on these promises.

2. **UI gating on a single async chain**
   - The app often blocks all UI on `isAuthLoading`.
   - One hung promise means the entire UI appears frozen.

3. **Inconsistent auth state sources**
   - Some pages call `supabase.auth.*` directly instead of using a single auth context.
   - This can lead to race conditions and confusing UI state.

---

## Plan for Reliable Fixes

### 1) Make auth calls resilient to hangs
- Wrap every auth call with a **hard timeout**.
- On timeout, **fallback to logged‑out state** rather than blocking UI.

### 2) Centralize all auth interactions
- Only one module/hook should call Supabase auth directly.
- All components read state from that source.

### 3) Decouple rendering from auth readiness
- Render UI shell immediately; avoid blocking pages on `isAuthLoading`.
- Show lightweight "checking session" states in-place rather than full-page spinners.

### 4) Add structured instrumentation
- Add timestamped logs around every auth call.
- Log elapsed time and explicit timeout events.

### 5) Stabilize logout UX
- Trigger local sign‑out immediately and redirect without waiting on a network call.
- Avoid any UI waiting for signOut to complete.

### 6) Harden password reset flows
- Ensure all reset endpoints and UI flows use timeouts.
- Guarantee loading state is cleared in `catch/finally`.

---

## Success Criteria

- No page remains stuck in a spinner indefinitely.
- Logout always succeeds immediately in the UI.
- Auth calls either resolve or fail within a bounded time.
- Clear logs identify which auth call timed out.

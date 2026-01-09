# Post-mortem: Concurrent Supabase Auth Calls Causing Hangs

Date: 2026-01-09  
Incident Type: Client auth deadlock / UI hang  
Severity: High (user-visible auth failures)  
Status: Resolved  

---

## Summary

Users experienced intermittent hangs during login, logout, and password reset flows. The UI would show spinners indefinitely, buttons appeared clickable but had no effect, and the Network tab showed no requests. The root cause was a concurrency issue in client-side auth flows: a supabase.auth.getSession() call was executed inside an onAuthStateChange handler during sign-in, triggering a lock inside Supabase's GoTrue client and causing the promise to never resolve.

This led to stalled UI state and blocked subsequent calls that depended on auth tokens.

---

## Impact

- User-facing behavior
  - Login and logout sometimes never completed.
  - Reset-password flows could get stuck on submit.
  - Protected pages appeared accessible or inaccessible inconsistently.
  - UI would remain in loading state indefinitely.
- Scope
  - Observed in local dev and production.
  - Intermittent, difficult to reproduce without a reset-password flow.

---

## Detection

Symptoms were reported directly by the user:
- Buttons visually clickable but no effect.
- Console showed no errors.
- Network tab had no requests.

Investigation revealed that auth calls were hanging before reaching network, and debug logs showed a mismatch between onAuthStateChange events and getSession responses.

---

## Root Cause

The Supabase GoTrue client uses an internal lock to manage auth state changes. We introduced a concurrent auth call by doing this:

- onAuthStateChange fired with event "SIGNED_IN".
- Inside that handler, we called supabase.auth.getSession() as a "consistency check".
- The GoTrue client was already in the middle of updating session state.
- The additional getSession() call waited on the same lock, causing a deadlock.
- The promise never resolved, so:
  - UI stayed in loading state.
  - Follow-up queries (role fetch) never executed.
  - No network requests were made.

This explains why local DB performance was not the issue and why the Network tab showed nothing.

---

## Contributing Factors

- UI gating: Many pages wait for isAuthLoading before rendering; a hung auth call blocks the entire UI.
- Auth state fragmentation: Some pages used direct auth calls rather than a single source of truth.
- Reset-password flow timing: That flow increases the chance of overlapping auth events.
- Lack of hard timeouts: There was no global timeout guard for session loading or role fetching.

---

## Resolution

We implemented two changes:

1. Removed the concurrent getSession() call inside onAuthStateChange.
   - This eliminated the lock contention.
2. Added resilience to auth operations.
   - Timeouts around session load and role fetch prevent infinite spinners.
   - A local auth reset is performed on timeout to recover cleanly.

After these changes, the reset-password + login + logout flow no longer hangs.

---

## What Went Well

- Logging exposed the exact sequence of auth events.
- The issue was reproduced in local dev, enabling rapid iteration.

---

## What Went Wrong

- We introduced a debug "consistency check" that inadvertently created a lock cycle.
- The system had no safeguard against hung auth promises.
- The issue was silent (no errors, no network activity), making it hard to diagnose.

---

## Action Items

Immediate (Done)
- [x] Remove getSession() call from onAuthStateChange.
- [x] Add timeout wrappers for getSession and role fetch.
- [x] Add explicit logging around auth state changes.

Short Term
- [ ] Consolidate all auth usage through a single hook/service.
- [ ] Avoid full-page gating on isAuthLoading; render UI shell immediately.
- [ ] Limit role fetch to SIGNED_IN events only.

Medium Term
- [ ] Add an auth operation queue (serialize auth calls to avoid concurrency).
- [ ] Add structured telemetry for auth timings and timeouts.
- [ ] Add a regression test for "auth call hangs without network."

---

## Lessons Learned

- Concurrency in auth flows can deadlock the client even without network involvement.
- "No network requests" does not mean "no code path"; it can indicate a lock inside the SDK.
- Debugging auth requires carefully scoped instrumentation and strict serialization of auth calls.

---

## Appendix: Key Logs

Example of the failing sequence:

```
[AuthProvider] Auth state change: {event: "SIGNED_IN", hasSession: true, userId: "..."}
[AuthProvider] Fetching role for user: ...
[AuthProvider] Resetting local auth state: auth.getSession consistency timed out after 2000ms
```

After the fix, the flow completes without timeouts and no stalls occur.

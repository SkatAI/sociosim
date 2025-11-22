# Architecture Flow

## 1. Creating a New Interview

User Flow: User clicks "Create Interview" button on dashboard

Code Path:

```
Dashboard → router.push("/interview") → InterviewPage → useInterviewSession()
```


What happens in useInterviewSession(userId, null):

1. API: POST /api/sessions with { userId } (no interviewId)
2. Sessions API Route (/src/app/api/sessions/route.ts):

```typescript
// Create new interview
const interview = await interviewDb.createInterview();

// Create ADK session
const adkSession = await adkClient.createSession("app", userId, interview.id);

// Create database session record
const session = await interviewDb.createSession(adkSession.session_id);

// Link all three in junction table
await interviewDb.linkUserInterviewSession(userId, interview.id, session.id);

// Return BOTH IDs
return {
sessionId: session.id,        // Database UUID
adkSessionId: adkSession.session_id,  // ADK string
interviewId: interview.id
}
```

3. Hook stores:

```json
{
sessionId: "uuid-123",           // For database FK operations
adkSessionId: "adk-session-456", // For ADK API calls
interviewId: "uuid-789"
}
```

## 2. Resuming an Existing Interview

User Flow: User clicks on interview card in dashboard

Code Path:

```
Dashboard → router.push(`/interview/${interviewId}`) → InterviewResumePage →
useInterviewSession(userId, interviewId)
```

What happens in useInterviewSession(userId, interviewId):

1. API: POST /api/sessions with { userId, interviewId }
2. Sessions API Route:

```typescript
// Verify interview exists
const { data: interview } = await supabase
.from("interviews")
.select("id")
.eq("id", interviewId)
.single();

// Create NEW ADK session (resume mode)
const adkSession = await adkClient.createSession("app", userId, interviewId);

// Create NEW database session record
const session = await interviewDb.createSession(adkSession.session_id);

// Link user + existing interview + new session
await interviewDb.linkUserInterviewSession(userId, interviewId, session.id);

return { sessionId, adkSessionId, interviewId, isResume: true }
```

3. Hook loads existing messages:

```typescript
const messagesResponse = await fetch(`/api/interviews/${interviewId}/messages`);
setMessages(messagesData.messages); // All previous messages
```

4. Messages API (/src/app/api/interviews/[id]/messages/route.ts):
// Uses interviewDb.getInterviewMessages(interviewId)
// 2-step query:
// 1. Get all session IDs for this interview from junction table
// 2. Get all messages for those sessions

## 3. Sending a Chat Message

User Flow: User types message and clicks send

Code Path:
InterviewPage → POST /api/chat → ADK service → Database storage

What happens in POST /api/chat:

```typescript
// Request body: { message, userId, sessionId, interviewId }

// Stream from ADK
for await (const event of adkClient.streamMessage({
app_name: "app",
user_id: userId,
session_id: sessionId,  // ADK session ID
new_message: { role: "user", parts: [{ text: message }] }
})) {
// Accumulate response and extract tokens
assistantResponse += event.content;
tokenUsage = extractTokens(event);
}

// Store in database (after stream completes)
await interviewDb.storeMessage(sessionId, "user", message);
await interviewDb.storeMessage(sessionId, "assistant", assistantResponse,
tokenUsage);
await interviewDb.updateInterviewUsage(interviewId, tokenUsage.input,
tokenUsage.output);
```

Key Point:
- sessionId in fetch body = Database UUID (session.id)
- session_id to ADK = ADK session ID (adkSession.session_id)
- Chat API uses database sessionId for FK storage

## 4. Loading Dashboard

User Flow: User navigates to /dashboard


Code Path:
```
DashboardPage → Query through junction table → Display interviews
```


```
Query Pattern:
// Step 1: Get user's interview IDs via junction table
const { data: userInterviewData } = await supabase
.from("user_interview_session")
.select("interview_id")
.eq("user_id", authSession.user.id);

const interviewIds = userInterviewData.map(row => row.interview_id);
```

// Step 2: Load interviews with joined data

```
const { data: interviews } = await supabase
.from("interviews")
.select(`
    *,
    interview_usage(total_input_tokens, total_output_tokens),
    messages(content, role, created_at)
`)
.in("id", interviewIds)
.order("updated_at", { ascending: false });
```

// Step 3: Filter to only interviews with messages

```
const filtered = interviews.filter(i => i.messages.length > 0);
```

## 5. Cleanup on Unmount

What happens when user closes interview:

// useInterviewSession cleanup

```typescript
return () => {
fetch(`/api/sessions?userId=${userId}&sessionId=${adkSessionId}`, {
    method: "DELETE"
});
}
```

```
// DELETE /api/sessions
await adkClient.deleteSession("app", userId, sessionId);  // ADK cleanup
await interviewDb.updateSessionStatus(sessionId, "ended"); // DB update
```

```
// DELETE /api/sessions
await adkClient.deleteSession("app", userId, sessionId);  // ADK cleanup
await interviewDb.updateSessionStatus(sessionId, "ended"); // DB update
```


# Type Safety with Zod

All database operations use Zod schemas (/src/lib/schemas.ts):

// Define schema
export const InterviewSchema = z.object({
id: z.string().uuid(),
status: InterviewStatusSchema,
started_at: z.string().datetime(),
// ...
});

// Derive TypeScript type
export type Interview = z.infer<typeof InterviewSchema>;

// Validate database responses
const interview = validateInterview(data);

Benefits:
- Runtime validation of database responses
- Type safety without manual type definitions
- Single source of truth for data models
- Catch schema mismatches early


---
# Key Architectural Decisions

✅ Two Session IDs

- Database sessionId (UUID): Used for FK relationships in messages table
- ADK adkSessionId (string): Used for ADK API calls
- Hook and API responses return both

✅ One Interview, Many Sessions

- Each "resume" creates a new session
- All sessions for an interview are linked via junction table
- Messages from all sessions are loaded when resuming
- Allows tracking of conversation continuity across sessions

✅ No user_id on interviews

- Interviews are independent entities
- Connection happens via junction table
- Enables future features (e.g., shared interviews, teacher access)

✅ Messages belong to sessions (not interviews)

- messages.session_id is required FK
- Each message knows which session it came from
- Query all interview messages by joining through sessions

✅ Centralized schemas

- Zod schemas in one file
- No hardcoded types scattered across codebase
- Validation helpers ensure runtime safety

---
# File Organization

src/lib/
├── schemas.ts              # Zod schemas (single source of truth)
├── interviewDatabase.ts    # Database operations
├── adkClient.ts           # ADK service client
├── supabaseClient.ts      # Browser Supabase client
└── supabaseServiceClient.ts # Server Supabase client (admin)

src/app/api/
├── sessions/route.ts      # Create/delete sessions
├── chat/route.ts          # Send messages, stream responses
└── interviews/[id]/messages/route.ts  # Get all messages for interview

src/hooks/
└── useInterviewSession.ts # Manages session lifecycle

src/app/
├── dashboard/page.tsx     # List user's interviews
├── interview/page.tsx     # New interview
└── interview/[id]/page.tsx # Resume interview

---
# Data Flow Diagram

User Action
    ↓
Frontend Component
    ↓
API Route (/api/sessions or /api/chat)
    ↓
    ├─→ ADK Client (external service)
    │   └─→ Returns streaming events
    └─→ Database Functions (interviewDatabase.ts)
        └─→ Supabase (PostgreSQL)
            ├─→ Validate with Zod
            └─→ Return typed data

The architecture is now clean, type-safe, and supports the many-to-many
relationship pattern while keeping complexity minimal.

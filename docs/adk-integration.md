# ADK Agent Service Integration Guide

This guide explains how the SocioSim BFF (Backend For Frontend) integrates with the separate ADK Agent Service to provide conversational interviews.

## Architecture Overview

```
Browser (SocioSim UI on port 3000)
    ↓ HTTPS/WebSocket
Sociosim BFF (Next.js on port 3000)
    ↓ HTTP/SSE
ADK Agent Service (Python on port 8000)
    ↓ REST API
Google Gemini 2.5 Flash Lite (or some other model)
```

## Services

### Sociosim BFF (This Repository)

- **Language:** TypeScript + Next.js 16
- **Port:** 3000
- **Purpose:** Frontend application & API gateway
- **Key files:**
  - `src/lib/adkClient.ts` - TypeScript client for ADK service
  - `src/types/adk.ts` - Type definitions
  - `src/app/api/chat/route.ts` - Chat endpoint
  - `src/app/api/sessions/route.ts` - Session management

### ADK Agent Service (Separate Repository)

- **Language:** Python 3.11+
- **Port:** 8000
- **Framework:** Google ADK CLI (FastAPI)
- **Location:** `../adk-agent/`
- **Purpose:** Runs the interview agent with Gemini API
- **Key files:**
  - `app/app.py` - Agent configuration
  - `app/agents/chat_agent.py` - Oriane persona
  - `docs/bff-contract.md` - API contract specification

## Setup

### Prerequisites

1. **Sociosim BFF:**

```bash
npm install
supabase start
cp .env.local.example .env.local
```

2. **ADK Agent Service:**

```bash
cd ../adk-agent
uv python pin 3.11
uv venv
source .venv/bin/activate
uv pip install -e .
cp .env.local.example .env.local
# Add your GOOGLE_API_KEY
```

### Running Both Services

**Terminal 1 - Sociosim BFF:**

```bash
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - ADK Agent Service:**
```bash
cd ../adk-agent
python scripts/run_with_cors.py
# Runs on http://localhost:8000 with CORS enabled
```

For development testing, both services can run on localhost. The BFF automatically calls the ADK service at `http://localhost:8000` (configurable via `NEXT_PUBLIC_ADK_BASE_URL`).

## API Contracts

### Session Management

#### Create Session

**Request:**
```bash
POST /api/sessions
Content-Type: application/json

{
  "userId": "user-123",
  "interviewId": "interview-456"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session-789",
  "interviewId": "interview-456",
  "createdAt": "2025-11-21T12:00:00Z"
}
```

**Status Codes:**
- `201` - Session created
- `400` - Missing required fields
- `409` - Session already exists
- `500` - Server error

#### Delete Session

**Request:**
```bash
DELETE /api/sessions?userId=user-123&sessionId=session-789
```

**Response:**
```json
{ "success": true, "sessionId": "session-789" }
```

**Status Codes:**
- `204` - Deleted successfully
- `400` - Missing query parameters
- `404` - Session not found
- `500` - Server error

### Chat Endpoint

#### Send Message (Streaming)

**Request:**
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Bonjour, peux-tu me parler de ton parcours universitaire ?",
  "userId": "user-123",
  "sessionId": "session-789",
  "interviewId": "interview-456",
  "streaming": true
}
```

**Response:** Server-Sent Events (SSE) stream

```
data: {
  "type": "message",
  "event": {
    "author": "assistant",
    "content": {
      "role": "assistant",
      "parts": [{"text": "Bonjour! Merci de votre intérêt..."}]
    }
  },
  "interviewId": "interview-456"
}

data: {
  "type": "done",
  "event": {
    "total_input_tokens": 150,
    "total_output_tokens": 85
  },
  "interviewId": "interview-456"
}
```

**Status Codes:**
- `200` - Stream started successfully
- `400` - Missing or invalid parameters
- `500` - Server error

#### Send Message (Batch, Non-Streaming)

**Request:**
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Bonjour!",
  "userId": "user-123",
  "sessionId": "session-789",
  "streaming": false
}
```

**Response:**
```json
{
  "success": true,
  "response": "Bonjour! Comment ça va?",
  "tokens": {
    "input": 150,
    "output": 85
  },
  "interviewId": "interview-456"
}
```

## TypeScript Client Usage

### Basic Example

```typescript
import { AdkClient } from "@/lib/adkClient";

const client = new AdkClient();

// Create a session
const session = await client.createSession("app", "user-123", "interview-456");

// Send a message and stream responses
for await (const event of client.streamMessage({
  app_name: "app",
  user_id: "user-123",
  session_id: session.session_id,
  new_message: {
    role: "user",
    parts: [{ text: "Bonjour!" }]
  }
})) {
  if (event.hasOwnProperty("content")) {
    // It's an event with a message
    console.log(event.content.parts[0].text);
  } else if (event.hasOwnProperty("total_input_tokens")) {
    // It's the final response with token counts
    console.log("Tokens:", event.total_input_tokens, event.total_output_tokens);
  }
}

// Clean up
await client.deleteSession("app", "user-123", session.session_id);
```

### In Next.js Component

```typescript
"use client";

import { useState } from "react";

export function ChatInterface() {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userId: "current-user-id",
          sessionId: "current-session-id",
          streaming: true
        })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.type === "message" && data.event.content.parts) {
              setMessages(prev => [...prev, data.event.content.parts[0].text]);
            }
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {messages.map((msg, i) => <p key={i}>{msg}</p>)}
      <button onClick={() => sendMessage("Hello!")}>Send</button>
    </div>
  );
}
```

## Error Handling

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad request (missing fields) | Check request format |
| 404 | Session not found | Create session first via POST /api/sessions |
| 409 | Session already exists | Can proceed with existing session |
| 422 | Validation error | Check message format |
| 500 | Server error | Check ADK service logs |

### Error Response Format

```json
{
  "error": "Session not found. Create a session first."
}
```

## Environment Variables

### Sociosim BFF (.env.local)

```env
# ADK Agent Service URL
NEXT_PUBLIC_ADK_BASE_URL=http://localhost:8000

# Supabase (auto-filled by `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### ADK Agent Service (.env.local)

```env
# Google Gemini API
GOOGLE_API_KEY=your_key_here

# CORS for BFF
BFF_ORIGINS=http://localhost:3000

# Server configuration
ADK_HOST=127.0.0.1
ADK_PORT=8000
```

## CORS Configuration

For development, both services run on localhost, so CORS is configured automatically.

**ADK Service CORS Setup:**
```bash
# In adk-agent/.env.local
BFF_ORIGINS=http://localhost:3000

# Run with CORS enabled
python scripts/run_with_cors.py
```

For production, use a reverse proxy (nginx, Cloudflare) instead of application-level CORS.

## Testing

### Test Session Creation

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "interviewId": "test-interview"}'
```

### Test Chat Message

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bonjour!",
    "userId": "test-user",
    "sessionId": "test-interview",
    "streaming": false
  }'
```

### Test Streaming

```bash
curl -N --http1.1 http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "Comment ca va?",
    "userId": "test-user",
    "sessionId": "test-interview",
    "streaming": true
  }'
```

## Database Integration (Future)

Currently, the ADK integration stores sessions only in the ADK service (in-memory). To persist conversations:

1. **Create interviews table** in Supabase:
   ```sql
   CREATE TABLE interviews (
     id uuid PRIMARY KEY,
     student_id uuid REFERENCES users(id),
     adk_session_id text,
     started_at timestamptz DEFAULT now(),
     status text DEFAULT 'in_progress'
   );
   ```

2. **Create messages table**:
   ```sql
   CREATE TABLE messages (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     interview_id uuid REFERENCES interviews(id),
     role text,
     content text,
     created_at timestamptz DEFAULT now()
   );
   ```

3. **Store messages** after each chat request (see commented code in `src/app/api/sessions/route.ts`)

## Performance Considerations

- **Streaming vs. Batch:** Use streaming (`streaming: true`) for better UX with long responses
- **Token Costs:** Monitor `total_input_tokens` and `total_output_tokens` in responses (each costs money)
- **Timeouts:** Set client-side timeout to 60+ seconds (model inference can be slow)
- **Session Reuse:** Keep sessions alive for multi-turn conversations (no need to recreate)
- **Caching:** Consider caching common agent responses in Supabase

## Troubleshooting

### ADK Service Connection Refused

```
Error: Failed to process chat request: fetch failed
```

**Solutions:**
1. Ensure ADK service is running: `python scripts/run_with_cors.py`
2. Check `NEXT_PUBLIC_ADK_BASE_URL` in `.env.local`
3. Verify port 8000 is not blocked by firewall

### CORS Errors

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**
1. Ensure ADK service runs with CORS: `python scripts/run_with_cors.py`
2. Verify `BFF_ORIGINS` includes your BFF URL in ADK `.env.local`
3. For production, use reverse proxy instead

### Session Not Found (404)

```json
{ "error": "404 Session not found" }
```

**Solutions:**
1. Create session first: `POST /api/sessions`
2. Use the returned `sessionId` in subsequent chat requests
3. Sessions expire after inactivity (currently in-memory)

### Timeout (60+ seconds with no response)

**Likely causes:**
1. ADK service is processing (normal - can take 10-30 seconds)
2. Gemini API is slow
3. Network latency

**Solutions:**
1. Increase client-side timeout
2. Use streaming to show partial responses
3. Monitor ADK logs: `tail -f ../adk-agent/logs/dev.log`

## Documentation References

- **ADK Service:** `../adk-agent/README.md`
- **ADK API Contract:** `../adk-agent/docs/bff-contract.md`
- **ADK Integration Guide:** `../adk-agent/docs/bff-integration-guide.md`
- **Sociosim README:** `../README.md`

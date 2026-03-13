# Plan: Migrate adk-agent from Gemini API to OpenRouter

> Status: **deferred** — saved for future implementation.

## Context

The adk-agent service uses Google ADK (`google-adk`) which calls the Gemini API directly. Under concurrent load, we hit 503 rate-limit errors:

```
google.genai.errors.ServerError: 503 UNAVAILABLE.
'This model is currently experiencing high demand. Please try again later.'
```

We want to switch to OpenRouter as the LLM provider, matching the pattern already used in the cauldron service. OpenRouter pools capacity across providers and handles rate limiting/retries.

## Key constraints

- **Google ADK is tightly coupled to Gemini** — there's no way to point it at OpenRouter. The ADK framework must be fully replaced.
- **The BFF (sociosim) must not change.** The adk-agent must keep the same HTTP API contract:
  - `POST /apps/{app}/users/{user}/sessions` — create session
  - `DELETE /apps/{app}/users/{user}/sessions/{session}` — delete session
  - `POST /run_sse` — streaming chat (SSE with `data: {json}` lines)
  - `POST /run` — non-streaming chat
  - Events use: `content.parts[].text`, `usageMetadata.promptTokenCount/candidatesTokenCount`

## Approach

Replace Google ADK's agent/app layer with a lightweight FastAPI service that:

1. Uses the **OpenAI SDK** pointed at OpenRouter (`https://openrouter.ai/api/v1`)
2. Reimplements the same HTTP endpoints with the same request/response format
3. Keeps existing persona loading from Postgres (unchanged)
4. Keeps existing middleware (auth, logging, CORS)

### Why OpenAI SDK (not LangChain)

- Minimal dependency footprint
- OpenRouter is OpenAI-compatible — just change base URL + API key
- No framework churn risk
- Cauldron uses LangChain but that's overkill for a simple chat agent with no tool calling

## Files to modify (in `adk-agent/`)

### 1. `pyproject.toml` — Update dependencies
- Remove: `google-adk>=0.5.0`, `google-cloud-aiplatform>=1.66.0`
- Add: `openai>=1.0.0`
- Keep: `fastapi`, `uvicorn`, `pydantic`, `psycopg2-binary`

### 2. `app/config/models.py` — Update model config
- Change `DEFAULT_MODEL_NAME` to `"google/gemini-2.5-flash"` (OpenRouter model ID)
- Remove `model_generation_kwargs()` (Google-specific)
- Add OpenRouter env vars: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`
- Keep `ModelConfig` dataclass with `temperature`, `top_p`, `top_k`

### 3. `app/llm/client.py` — New file: OpenRouter client
- Create OpenAI client pointed at `https://openrouter.ai/api/v1`
- `async def chat_completion(messages, model_config) -> (text, usage)` for batch
- `async def stream_chat_completion(messages, model_config) -> AsyncGenerator` for SSE
- Map OpenAI usage format (`prompt_tokens`/`completion_tokens`) to ADK format (`promptTokenCount`/`candidatesTokenCount`)

### 4. `app/agents/chat_agent.py` — Simplify
- Remove `build_adk_agent()` method and all ADK imports
- Keep: `PersonaSpec`, `load_persona_registry()`, persona resolution logic
- Rename `_instruction_for_context()` → `get_system_prompt(agent_id)`
- The agent becomes a simple prompt resolver, not an ADK wrapper

### 5. `app/session_store.py` — New file: in-memory session store
- Replicate ADK's in-memory session management
- `create_session(app_name, user_id, state) -> session`
- `get_session(app_name, user_id, session_id) -> session`
- `delete_session(app_name, user_id, session_id)`
- Store conversation history per session (list of messages)
- Session format must match BFF expectations: `{id, userId, state, lastUpdateTime}`

### 6. `app/api_server.py` — Rewrite routes (keep same URLs)
- Remove `get_fast_api_app()` from google.adk
- Build FastAPI app directly
- Reimplement endpoints with identical request/response shapes:
  - `POST /apps/{app_name}/users/{user_id}/sessions`
  - `DELETE /apps/{app_name}/users/{user_id}/sessions/{session_id}`
  - `POST /run_sse` — streaming, emit SSE in ADK event format
  - `POST /run` — non-streaming, return event array
  - `GET /agents` — keep as-is
- Keep existing middleware: auth (`X-BFF-Secret`), request logging, CORS

### 7. `app/app.py` — Simplify initialization
- Remove ADK App/Agent instantiation
- Initialize `ChatAgent` (persona registry) and session store
- Export the FastAPI app

### 8. `.env.local.example` — Update env vars
- Remove: `GOOGLE_API_KEY`
- Add: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=google/gemini-2.5-flash`
- Keep: Postgres vars, `BFF_SHARED_SECRET`, CORS vars

### 9. `Dockerfile` / `docker-compose.yaml`
- Remove google-adk CLI entrypoint (`adk api_server`)
- Use standard `uvicorn app.api_server:app` instead

## SSE Event Format (must match current ADK output)

The BFF parses SSE events like:
```
data: {"content": {"parts": [{"text": "Hello"}]}, "author": "interview_agent", "usageMetadata": {"promptTokenCount": 100, "candidatesTokenCount": 50}}
```

The new service must emit events in this exact shape. The OpenAI streaming response (`choices[0].delta.content`) must be wrapped into this format.

## What stays unchanged

- `app/config/postgres.py` — Postgres persona loading
- `app/config/cors.py` — CORS config
- Persona registry & prompt resolution logic
- All sociosim (BFF) code — zero changes needed

## Verification

1. `docker compose up` in adk-agent
2. Create a session via curl: `POST /apps/app/users/test/sessions`
3. Send a message via curl: `POST /run_sse` — verify SSE event format matches
4. Test from sociosim UI: start an interview, send messages, verify streaming works
5. Run adk-agent tests: `make test`
6. Verify token usage is recorded correctly in the interviews dashboard

## Short-term mitigations (while this migration is deferred)

- **Upgrade Google AI Studio tier** for higher RPM/TPM limits
- **Add retry with exponential backoff** in the BFF's `adkClient.ts` for 503 errors
- **Switch to Vertex AI** (same models, separate/higher quotas, requires GCP project)

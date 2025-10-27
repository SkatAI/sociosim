# Features

A web application where sociology students practice interviewing people using AI avatars instead.
This is a demo, POC application, low volume expected. simple UI with light design and interactions.

## Accounts

- student account : select avatar, access interview template / instructions, continue past interviews, start new interview, see teacher comments
- teacher account : reviews interviews. adds comments. interview analysis.
- admin account: manages users, avatars prompts, LLM endpoints (changes from paying to free, openAI to Gemini etc, hosted vs local)

## LLMs

- stream api calls to LLM endpoints
- handle LLM memory over an interview : all messages, recap
- Context strategy: start simple = sliding window + running recap; add message summarization every N turns to cap tokens.
- Rate limiting & quotas per user to control cost (per minute + per day).
- Timeouts/retries + circuit breakers around provider calls.
- Token budgets per role (e.g., teacher analysis can be larger; student chat smaller).
- Caching avatar system prompts.

## Data schema

- avatars : image, name, description
- prompts : avatar, system, guardrails, ...
- themes : title, desc, prompts
- interviews : date, avatar, student, + avatar tuning (bavard, méfiant, coopératif)
  - messages (author, questions, answers, text)
    - [TBD] each message has feedback thread : comments by teacher as tableau de codage et analyse de l’entretien.
- users
  - students
  - teachers
  - admins
- feedback
- sessions
- LLM call cost & tokens

- interview belong to avatar and student + optionnaly a theme
- interview belongs to avatar, student
- interview is composed of messages
- messages have author, author role (student, avatar), is_question, is_answer, the text
- Versioning: prompt versions per avatar; freeze version per interview for reproducibility.

### Schema

- users (id, role: student/teacher/admin)
- avatars (id, name, img_url, prompt_version, system_prompt, traits)
- interviews (id, student_id, teacher_id NULLABLE, avatar_id, title, status, started_at, submitted_at, reviewed_at, prompt_version_used)
- messages (id, interview_id, author_id, role ENUM(student, avatar, teacher), is_question, text, created_at, token_count)
- feedback_threads (id, message_id, teacher_id, created_at)
- feedback_comments (id, thread_id, teacher_id, text, created_at)
- llm_calls (id, interview_id, provider, model, tokens_in, tokens_out, ms, cost_est)
- feature_flags / settings (provider, model, enabled, org-wide or per-avatar)

## Front end

- header : help, faq, user account creation and management (login, register, manage account)
- Consent screen (students know AI is used; data retention policy).
- index page: mutiple (2, 3, 4) avatars with image and short text
- dashboard :
  - student logged in: dashboard previous interviews (avatar, title, summary, date, teacher reviewed)
  - teacher logged in: new interviews, new replies and previous interviews
- interview as student: top: avatar, title; center : left / right chat; right column: collapsable with instructions / teacher comments (on previous interviews)
- Moderation (lightweight: provider moderation API; at least on user input). User can flag messages as inappropriate.
- interview as teacher: top: avatar, title, student info; subtop: recap of interview; center interview with messages, each message can have feedback; left column: list of questions for navigation;
- feedback and analysis: tableau de codage et analyse de l’entretien.
- footer: university logo, legal links, contact

## RGPD

- PII minimization + data retention TTL (auto-delete after X months).
- Export/erase interview on request (GDPR-ish).

## Testing

- E2E tests (Playwright: basic flows—login, create interview, stream, comment).

**later** : Not included in this version

- [TBD] student belong to teacher / teacher sees his students
- [TBD] each message has notes by student
- avatar or interview [TBD] follows a theory : title, desc, prompts (Bourdieu, Latour, Crozier). The theory helps generate a avatar
- student can reply to teacher feedback : an interview message has a thread instead of just a comment
- AI can annotate, give feedback on interview.
- overall feedback on interviews: analyse par prof et AI.
- avatar tuning : personnalité et mode d'expression (bavard, méfiant, coopératif)
- Accessibility
- i18n
- Voice/“avatar” expectations (optional but common)

# Application context

- low volume, low traffic : a few students / teachers
- French language, no i18n
- production version hosted in the EU servers. sovereignty is a priority.
- RGPD compliant
- demo version can be hosted on GCP, scaleway or digital ocean
- short timeline, low workload, one developper. I want to develop all that in a few days.

# RLS

student ↔ their interviews; teacher ↔ assigned students; admin ↔ all.

Enforce in DB with Supabase RLS

# Admin panel (tiny)

- Provider/model select + save to settings.
- Avatar CRUD (name, image, system prompt, style, guardrails).
- View token/cost dashboard.

# MVP test plan (fast)

- Student logs in → creates interview → streams 5–10 turns → submits.
- Teacher opens interview → leaves per-message comments → marks “reviewed.”
- Admin switches model → new interviews use new prompt/model (old ones unchanged).
- Export interview (JSON/markdown) works.
- RLS verified: students can’t read others; teachers only theirs.

# Tech stack

- supabase for auth, db (postgres), storage etc
- Monorepo
- next.js (routing, state, SSR or SSG), TypeScript
- chakra UI
- SSE (Server-Sent Events)
- docker with github actions for deployment
- cheaper models for dev
- infrequent LLM providers switch done by admin via config
- Database stores each message part of an interview
- LLM context: tbd. let's start with in memory
- responsive design
- sequential storage of interview messages

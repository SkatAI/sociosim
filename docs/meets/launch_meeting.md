Since your initial document is high-level and you’re turning it into a real POC with Supabase + Next.js + React + TypeScript, your **launch meeting** should clarify what’s currently *ambiguous* in four categories: **product / tech / organization / budget-scope**.

Below is a checklist you can literally take into the meeting.

---

# 🧩 1. Product / Functional Clarifications

| Topic                     | Why it matters                  | Questions to clarify                                                                                                                              |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core user journey**     | Avoid over-engineering          | What is the *one* end-to-end flow we must demo (student logs in → selects personality → chats → teacher views transcript)?                        |
| **Roles & permissions**   | Drives schema & auth            | Do teachers register manually, or are they pre-approved by admin? Any admin dashboard at all for the POC?                                         |
| **University-email rule** | Impacts auth config             | Which domains are valid (single domain or list)? Is the validation strict (`@univ.fr` only) or pattern-based (subdomains allowed)?                |
| **Personalities**         | Defines seed data & prompt work | How many personalities should exist at launch? Who writes/approves their system prompts? Is personality tuning (talkative etc.) mandatory for v1? |
| **Chat behaviour**        | Affects cost & dev time         | How long can a session last? Do we store full history or limit tokens? Are messages streamed or chunked?                                          |
| **Teacher feedback**      | Scope creep guard               | Is feedback text only? Can teachers edit/delete it later? Do students see it?                                                                     |
| **Export formats**        | Clarifies deliverables          | TXT only, or do they expect PDF/CSV too? Any formatting requirements (timestamps, names, etc.)?                                                   |
| **Multilingual support**  | Impacts prompt design           | Should the chat support English only, or bilingual (FR/EN)?                                                                                       |
| **Session retention**     | Storage policy                  | How long should transcripts stay in DB? Is anonymization required for compliance?                                                                 |
| **Testing expectations**  | Time budgeting                  | Do they expect formal automated tests delivered, or “light tests for POC”?                                                                        |

---

# ⚙️ 2. Technical Clarifications

| Topic                   | Why it matters       | Questions to ask                                                                                                |
| ----------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Hosting**             | Impacts setup & cost | Is Vercel confirmed for frontend + Supabase Cloud for backend? Any requirement for EU data residency?           |
| **LLM provider**        | Cost & performance   | Which API to use (OpenAI, Claude, etc.)? Who pays? Is there a monthly cap or per-token budget?                  |
| **API key handling**    | Security             | Where will secrets live (Supabase Edge Functions / Vercel env vars)?                                            |
| **Auth method**         | UX + security        | Password-based or magic-link? Any SSO with university later?                                                    |
| **Tests / CI/CD**       | Planning time        | Do they want automated deployment after every push? Which testing framework preferred (Vitest/Jest/Playwright)? |
| **Data model approval** | Avoid rework         | Should teacher feedback or session ratings be included in v1 tables?                                            |
| **Prompt storage**      | GDPR / versioning    | Are system prompts stored in DB or in code? Do we need a UI to edit them later?                                 |
| **Analytics / Logging** | Debug & cost control | Do we log message counts, token usage, errors? Where?                                                           |

---

# 🧑‍💼 3. Organizational / Process Questions

| Topic                      | Why it matters           | Questions                                                                                       |
| -------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| **Decision authority**     | Avoid scope ping-pong    | Who decides on scope trade-offs (features, UI, costs)? One product owner or a committee?        |
| **Content responsibility** | Avoid delays             | Who writes or validates the personality descriptions/prompts? (You or the sociology lead?)      |
| **Design input**           | Avoid design bottlenecks | Is there a designer or should you use a default UI kit?                                         |
| **Testing participants**   | Planning pilot           | Who will test the demo (students, teachers, internal)? When?                                    |
| **Timeline expectations**  | Manage workload          | What’s the expected delivery date for the POC (demo meeting, internal review)?                  |
| **Communication rhythm**   | Efficiency               | Weekly syncs or async updates? Where (Notion, Slack, email)?                                    |
| **Future plan**            | Avoid over-building      | Is this POC expected to evolve into a full course product later (affects how modular you code)? |

---

# 💰 4. Budget, Costs & Constraints

| Category                   | Questions                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------- |
| **LLM cost ceiling**       | What’s the monthly token/spend limit? Who owns the billing key?                     |
| **Supabase plan**          | Free tier or paid? Are we allowed to exceed quotas during testing?                  |
| **Hosting**                | Paid Vercel plan or free Hobby tier? Any custom domain?                             |
| **Time budget**            | How many hours/weeks are approved for dev? Do they include testing & documentation? |
| **Maintenance after demo** | Should you budget for bugfix window post-launch (e.g., 2 weeks)?                    |
| **Legal/compliance**       | Any requirement to host data in the EU or under university account?                 |

---

# 🧱 5. “Before I Can Start” — Minimum Info You Need Tomorrow

✅ Confirm:

1. ✅ Exact list of MVP features to build (e.g., “login → chat → transcript → teacher view”).
2. ✅ Who provides and owns personality prompts.
3. ✅ Allowed LLM provider & API key logistics.
4. ✅ Chosen hosting setup (Vercel + Supabase?).
5. ✅ Valid university domains and login method.
6. ✅ Expected launch / demo date.
7. ✅ Budget or API usage cap.
8. ✅ Decision owner (who says “done”).
9. ✅ Access to any design/logo assets (if needed).
10. ✅ Whether tests & CI/CD are part of deliverables.

---

If you’d like, I can turn this checklist into a **one-page “Launch Meeting Agenda”** doc you can share with your team tomorrow (with sections for notes).
Would you like me to draft that next?

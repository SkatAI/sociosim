# SocioSim

SocioSim is an interview simulator for social sciences designed to train students in conducting qualitative interviews.

The project provides an immersive conversational experience where students learn to listen actively, ask follow-up questions, paraphrase, and explore their interlocutor's social representations.

## Objectives

- Practice conducting semi-directive interviews
- Develop active listening skills
- Learn to ask follow-up questions without leading
- Understand interactive dynamics

## Target Users

- Sociology and social sciences students
- Mediation, research, and social support training programs

## Architecture

SocioSim is a **Next.js 16 TypeScript** application with the following components:

- **Frontend:** React 19 with Chakra UI v3 and Panda CSS (styling)
- **Backend:** Next.js API routes (BFF - Backend For Frontend)
- **Database:** Supabase PostgreSQL
- **AI Agent:** Separate ADK Agent Service (Python, runs on port 8000)

The BFF communicates with the ADK Agent Service to provide conversational interviews.

## Prerequisites

- Node.js >= 20.11.0 (see `.nvmrc`)
- npm or yarn
- Supabase CLI (for local database)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Locally

Supabase provides authentication and database services. To set up locally:

```bash
# Install Supabase CLI (if not already installed)
# See: https://supabase.com/docs/guides/cli/install

# Start Supabase locally
supabase start
```

This command will:
- Launch PostgreSQL on port 54321
- Launch Supabase Studio at http://localhost:54323
- Launch Inbucket (email testing) at http://localhost:54324
- Apply migrations from `supabase/migrations/`
- Seed sample data from `supabase/seed.sql`

The first run takes a few minutes. Credentials will be printed to the terminal.

### 3. Copy Environment Variables

```bash
cp .env.local.example .env.local
```

Supabase credentials will be automatically populated in `.env.local` after `supabase start`.

### 4. Start the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Starting Everything at Once

Use the provided Makefile to simplify setup and startup:

```bash
# First time setup (install + copy .env)
make setup

# Then start everything (Supabase + Next.js dev server)
make start
```

This runs both services concurrently. Press Ctrl+C to stop.

## Environment Variables

See `.env.local.example` for complete documentation. Key variables:

```env
# Supabase (auto-populated by `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# ADK Agent Service (AI conversations)
NEXT_PUBLIC_ADK_BASE_URL=http://localhost:8000
```

## Database

SQL migrations are in `supabase/migrations/` and are applied automatically when you run `supabase start`.

**Existing tables:**
- `users` - User profiles (student, teacher, admin roles)

**Planned tables** (for interviews):
- `avatars` - AI personas
- `interviews` - Interview sessions
- `messages` - Conversation history
- `llm_calls` - API usage tracking

## Available Scripts

```bash
make help            # Show all available targets
make setup           # Install dependencies + copy .env
make start           # Start Supabase + dev server (concurrently)
make dev             # Start Next.js dev server only
make build           # Build for production
make lint            # Run ESLint and TypeScript check
make format          # Auto-format code
make db-start        # Start Supabase
make db-stop         # Stop Supabase
make db-reset        # Reset Supabase (clears all data)
make clean           # Clean build artifacts
```

Or use npm scripts directly:

```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Run production build
npm run panda        # Watch for Panda CSS changes
npm run lint         # ESLint check
npm run typecheck    # TypeScript check
npm run lint:all     # Lint + typecheck
npm run format       # Prettier check
npm run format:fix   # Prettier auto-fix
```

## What is Panda CSS?

**Panda CSS** is a zero-runtime CSS-in-JS framework that generates typed CSS utilities at build time.

- Runs `npm run panda` in watch mode to regenerate styles when you change TypeScript files
- Generates a `styled-system/` directory with CSS utilities
- Works alongside Chakra UI components
- No runtime overhead - all CSS is generated during build
- Provides IntelliSense for styling in your IDE

## What is Inbucket?

**Inbucket** is a local email testing service that captures all emails sent by Supabase during development.

- Useful for testing email-based features (registration, password reset)
- Access it at http://localhost:54324
- No emails actually sent - all captured locally
- Stops when you run `supabase stop`

### Local SMTP Hostname Note
In local Docker setups, Supabase Auth sends emails via SMTP using the `auth.email.smtp.host`
value in `supabase/config.toml`. The hostname must match the inbucket container name.
For this project (`project_id = "sociosim"`), the inbucket container is
`supabase_inbucket_sociosim`. If the host is wrong (e.g. `supabase-inbucket`), reset/signup
emails will fail with `Error sending recovery email`. After updating, restart Supabase.

## Documentation

- `docs/cahierdescharges_sociobot.pdf` - Functional requirements (French)
- `docs/grille_entretien_final.pdf` - Interview guide template
- `docs/specs/specification_stack_and_tools.md` - Technical specifications
- `docs/adk-integration.md` - Guide to ADK Agent Service integration
- `CLAUDE.md` - Developer documentation for AI assistance
- `AGENTS.md` - Best practices for AI agent implementation

## Development Workflow

### Watch CSS Changes

Panda CSS will automatically regenerate types and utilities when you modify styles:

```bash
npm run panda
```

Or use the combined startup command:

```bash
make start  # Runs panda watch + Next.js dev server
```

### Manage Supabase

```bash
supabase status              # Check Supabase status
supabase db push             # Apply local migrations
supabase db pull             # Pull remote changes
supabase stop                # Stop local Supabase
```

Or use Make targets:

```bash
make db-reset                # Reset database (clears all data)
```

Access Supabase Studio: http://localhost:54323

## ADK Agent Service

The BFF calls a separate ADK Agent Service (Python) for AI conversations. For full integration testing:

Ensure the ADK service is running on port 8000:

```bash
# In the ../adk-agent directory:
python scripts/run_with_cors.py
```

For detailed integration information, see `docs/adk-integration.md`.

## Troubleshooting

### Supabase Won't Start

```bash
# Clear local Supabase state and try again
supabase stop
rm -rf .supabase/
supabase start
```

### Port Already in Use

Supabase uses these ports by default:
- `54321` - PostgreSQL
- `54323` - Supabase Studio
- `54324` - Inbucket (email testing)

If these ports are in use, modify `supabase/config.toml` or stop the conflicting service.

### Can't Connect to Supabase

Verify that credentials in `.env.local` match the output from `supabase start`.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Chakra UI v3](https://v3.chakra-ui.com/)
- [Panda CSS](https://panda-css.com/)

## Contributing

See `CLAUDE.md` for development guidelines.

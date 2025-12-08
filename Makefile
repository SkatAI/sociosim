SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help setup start start-logs dev build lint format clean supa-start supa-stop supa-reset docker-up docker-up-detached docker-down docker-build docker-logs

help: ## Show available make targets.
	@echo "Available make targets:"
	@grep -E '^[a-zA-Z0-9_-]+:.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS=":.*?## "}{printf "  %-16s %s\n", $$1, $$2}'

# Setup & Startup

setup: ## Install dependencies and copy environment template.
	npm install
	cp .env.local.example .env.local
	@echo "✓ Setup complete. Run 'make start' to begin development."

start: ## Start Supabase and Next.js dev server concurrently.
	@echo "Starting Supabase and Next.js dev server..."
	@echo "Supabase Studio: http://localhost:54323"
	@echo "Next.js App: http://localhost:3000"
	@echo "Press Ctrl+C to stop"
	supabase start & npm run dev

start-logs: ## Start Supabase and Next.js with logs streamed to logs/dev.log
	@mkdir -p logs
	@echo "Starting Supabase and Next.js dev server with logging..."
	@echo "Logs will be written to: logs/dev.log"
	@echo "Supabase Studio: http://localhost:54323"
	@echo "Next.js App: http://localhost:3000"
	@echo "Press Ctrl+C to stop"
	(supabase start & npm run dev 2>&1) | tee -a logs/dev.log

dev: ## Start Next.js dev server only (Supabase must be running separately).
	npm run dev

build: ## Build the application for production.
	npm run build

# Code Quality

lint: ## Run ESLint and TypeScript checks.
	npm run lint:all

format: ## Check code formatting with Prettier.
	npm run format

format-fix: ## Auto-format code with Prettier.
	npm run format:fix

# Docker
# note: explcitely passing  .env.local is required to pass env vars to docker-compose at build time. alt is to name .env.local as .env
docker-up: ## Build and run the app in Docker using .env.local for env vars.
	docker compose --env-file .env.local up --build

docker-up-detached: ## Build and run the app in Docker (detached).
	docker compose --env-file .env.local up -d

docker-down: ## Stop Docker containers.
	docker compose --env-file .env.local down

docker-build: ## Build Docker images without starting containers.
	docker compose  --env-file .env.local  build

docker-logs: ## Tail Docker logs.
	docker compose  --env-file .env.local  logs -f

# Database

supa-start: ## Start Supabase locally.
	supabase start

supa-stop: ## Stop Supabase.
	supabase stop

supa-reset: ## Reset Supabase (clears all data, re-applies migrations).
	supabase stop
	rm -rf .supabase/
	supabase start

supa-status: ## Check Supabase status.
	supabase status

supa-push: ## Push local migrations to Supabase.
	supabase db push

supa-pull: ## Pull remote database changes.
	supabase db pull

# Cleanup

clean: ## Remove build artifacts and dependencies.
	rm -rf .next node_modules dist build .turbo
	@echo "✓ Cleaned build artifacts"

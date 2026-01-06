SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help setup start start-logs dev devrun build lint format format-fix pretty clean supa-start supa-stop supa-reset supa-status supa-push supa-pull db-start db-stop db-reset docker-dev docker-dev-detached docker-up-detached docker-prod docker-prod-detached docker-down docker-logs docker-prod-build test test-ui

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

devrun: ## Start Panda watcher + Next.js dev server (alias for dev).
	@$(MAKE) dev

build: ## Build the application for production.
	npm run build

# Code Quality

lint: ## Run ESLint and TypeScript checks.
	npm run lint:all

format: ## Check code formatting with Prettier.
	npm run format

format-fix: ## Auto-format code with Prettier.
	npm run format:fix

pretty: ## Auto-format code with Prettier (alias for format-fix).
	@$(MAKE) format-fix

# Docker

docker-dev: ## Run development environment in Docker with hot reload.
	docker compose -f docker-compose.yaml up --build

docker-dev-detached: ## Run development environment in Docker with hot reload (detached).
	@$(MAKE) docker-up-detached

docker-up-detached: ## Run development environment in Docker with hot reload.
	docker compose -f docker-compose.yaml up -d

docker-prod: ## Run production build in Docker.
	docker compose -f docker-compose.prod.yaml up --build

docker-prod-detached: ## Run production build in Docker (detached).
	docker compose -f docker-compose.prod.yaml up -d

docker-down: ## Stop all Docker containers.
	docker compose -f docker-compose.yaml down
	docker compose -f docker-compose.prod.yaml down 2>/dev/null || true

docker-logs: ## Tail Docker logs.
	docker compose -f docker-compose.yaml logs -f

docker-prod-build: ## Build Docker production image without starting containers.
	docker compose -f docker-compose.prod.yaml build

# Database

supa-start: ## Start Supabase locally.
	supabase start

db-start: ## Start Supabase locally (alias for supa-start).
	@$(MAKE) supa-start

supa-stop: ## Stop Supabase.
	supabase stop

db-stop: ## Stop Supabase (alias for supa-stop).
	@$(MAKE) supa-stop

supa-reset: ## Reset Supabase (clears all data, re-applies migrations).
	supabase stop
	rm -rf .supabase/
	supabase start

db-reset: ## Reset Supabase (alias for supa-reset).
	@$(MAKE) supa-reset

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

# tests

test: ## Run all tests with coverage
	npm run test:coverage

test-ui: ## Run tests with UI
	npm run test:ui

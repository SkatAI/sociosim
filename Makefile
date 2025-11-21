SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help setup start dev build lint format clean db-start db-stop db-reset

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

# Database

db-start: ## Start Supabase locally.
	supabase start

db-stop: ## Stop Supabase.
	supabase stop

db-reset: ## Reset Supabase (clears all data, re-applies migrations).
	supabase stop
	rm -rf .supabase/
	supabase start

db-status: ## Check Supabase status.
	supabase status

db-push: ## Push local migrations to Supabase.
	supabase db push

db-pull: ## Pull remote database changes.
	supabase db pull

# Cleanup

clean: ## Remove build artifacts and dependencies.
	rm -rf .next node_modules dist build .turbo
	@echo "✓ Cleaned build artifacts"

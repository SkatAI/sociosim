SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help devrun lint pretty

help: ## Show available make targets.
	@echo "Available make targets:"
	@grep -E '^[a-zA-Z0-9_-]+:.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS=":.*?## "}{printf "  %-16s %s\n", $$1, $$2}'

devrun: ## Start Panda watch and Next dev server.
	npm run dev

lint: ## Run ESLint with repo config.
	npm run lint:all

pretty: ## Run prettier auto-fix task.
	npm run format:fix


# Supabase

sup_migrate: ## Run supbase migration up
	supabase migration up

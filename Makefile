.PHONY: deps build dev clean help

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

deps: ## Install npm dependencies
	@if [ ! -d node_modules ]; then \
		echo "Installing npm dependencies..."; \
		npm install; \
	else \
		echo "Dependencies already installed."; \
	fi

build: deps ## Build site with Vite (outputs to dist/site/)
	@echo "Building site with Vite..."
	@npx vite build

dev: deps ## Run Vite dev server with HMR
	@npx vite

clean: ## Remove build artifacts
	@rm -rf dist
	@echo "Cleaned dist/"

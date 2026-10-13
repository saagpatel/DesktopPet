.PHONY: dev build test lint clean install check

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

test:
	npm test

lint:
	npm run lint

clean:
	rm -rf node_modules dist .next .turbo

check:
	@missing=0; for tool in node npm cargo; do \
		if ! command -v $$tool >/dev/null 2>&1; then echo "Missing $$tool; install Node.js 22.23.3 and the pinned Rust toolchain first."; missing=1; fi; \
	done; test $$missing -eq 0 || exit 1
	npm run lint
	npm run typecheck
	npm test
	cd src-tauri && cargo fmt --all -- --check
	cd src-tauri && cargo clippy --locked --all-targets -- -D warnings
	cd src-tauri && cargo test --locked
	npm run build
	npm run check:performance-budget
	npm run perf:bundle:gate
	npm run perf:assets

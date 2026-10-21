# ============================================
# NetGuard Makefile
# Usage: make <target>
# ============================================

SHELL := powershell.exe
.SHELLFLAGS := -NoProfile -Command

.PHONY: help setup dev stop test lint build clean docker-logs docker-ps \
        api web migrate seed psql clickhouse nats-monitor

help:  ## Show all commands
	@echo ""
	@echo "NetGuard - Available commands:"
	@echo "-------------------------------------------"
	@echo "  make setup         # One-shot setup (deps, git, docker)"
	@echo "  make dev           # Start all services (docker + api + web)"
	@echo "  make stop          # Stop all services"
	@echo "  make test          # Run all tests"
	@echo "  make lint          # Run all linters"
	@echo "  make build         # Build all binaries"
	@echo "  make clean         # Clean build artifacts"
	@echo ""
	@echo "  Docker:"
	@echo "  make docker-ps     # List running containers"
	@echo "  make docker-logs   # Tail all docker logs"
	@echo ""
	@echo "  Services (individual):"
	@echo "  make api           # Run only API"
	@echo "  make web           # Run only Web"
	@echo ""
	@echo "  Database:"
	@echo "  make migrate       # Run DB migrations"
	@echo "  make seed          # Seed dev data"
	@echo "  make psql          # Open psql shell"
	@echo "  make clickhouse    # Open clickhouse-client"
	@echo ""

setup:  ## One-shot setup
	.\scripts\setup.ps1

dev:  ## Start all services
	.\scripts\dev.ps1

stop:  ## Stop all services
	.\scripts\stop.ps1

# ---------- Individual services ----------
api:  ## Run API only
	cd apps\api; go run ./cmd/server

web:  ## Run Web only
	cd apps\web; pnpm dev

# ---------- Quality ----------
test:  ## Run all tests
	@echo "Running Go tests..."
	cd apps\api; go test ./... -v
	cd apps\agent; go test ./... -v
	cd apps\collector; go test ./... -v
	cd apps\engine; go test ./... -v
	@echo ""
	@echo "Running Web tests..."
	cd apps\web; pnpm test

lint:  ## Run all linters
	@echo "Linting Go..."
	cd apps\api; golangci-lint run ./... || echo "golangci-lint not installed, skip"
	@echo ""
	@echo "Linting Web..."
	cd apps\web; pnpm lint || echo "ESLint not configured, skip"

# ---------- Build ----------
build:  ## Build all binaries
	@echo "Building Go binaries..."
	New-Item -ItemType Directory -Path bin -Force | Out-Null
	cd apps\api; go build -o ..\..\bin\api.exe ./cmd/server
	cd apps\agent; go build -o ..\..\bin\agent.exe ./cmd/agent
	cd apps\collector; go build -o ..\..\bin\collector.exe ./cmd\syslog
	cd apps\engine; go build -o ..\..\bin\engine.exe ./cmd/engine
	@echo ""
	@echo "Building Web..."
	cd apps\web; pnpm build
	@echo ""
	@echo "Build complete. Binaries in .\bin\"

clean:  ## Clean build artifacts
	Remove-Item -Recurse -Force bin, dist -ErrorAction SilentlyContinue
	cd apps\web; Remove-Item -Recurse -Force dist, node_modules -ErrorAction SilentlyContinue
	Get-ChildItem -Recurse -Filter "*.exe" | Remove-Item -Force -ErrorAction SilentlyContinue
	@echo "Clean done."

# ---------- Docker ----------
docker-ps:  ## List running containers
	docker compose ps

docker-logs:  ## Tail all docker logs
	docker compose logs -f --tail=100

# ---------- Database ----------
migrate:  ## Run migrations
	.\scripts\migrate.ps1

seed:  ## Seed dev data
	.\scripts\seed.ps1

psql:  ## Open psql shell
	docker exec -it netguard-postgres-1 psql -U netguard -d netguard

clickhouse:  ## Open clickhouse-client
	docker exec -it netguard-clickhouse-1 clickhouse-client --database=netguard

nats-monitor:  ## Open NATS monitoring
	Start-Process http://localhost:8222
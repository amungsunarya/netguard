# ============================================
# Stage 1: Build
# ============================================
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY *.go ./
COPY rules/ ./rules/

# Build binary statis
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o netguard-api .

# ============================================
# Stage 2: Runtime (minimal)
# ============================================
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/netguard-api .
COPY --from=builder /app/rules ./rules

RUN addgroup -S netguard && adduser -S netguard -G netguard && \
    chown -R netguard:netguard /app
USER netguard

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:8080/health || exit 1

CMD ["./netguard-api"]
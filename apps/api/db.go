package main

import (
"context"
"fmt"
"os"
"time"

"github.com/jackc/pgx/v5/pgxpool"
)

var pgPool *pgxpool.Pool

func initPostgres() error {
dsn := os.Getenv("DATABASE_URL")
if dsn == "" {
dsn = "postgres://netguard:netguard@localhost:5432/netguard?sslmode=disable"
}

ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

pool, err := pgxpool.New(ctx, dsn)
if err != nil {
return fmt.Errorf("pgxpool.New: %w", err)
}

if err := pool.Ping(ctx); err != nil {
return fmt.Errorf("postgres ping: %w", err)
}

pgPool = pool
return nil
}
package main

import (
"context"
"fmt"
"os"
"time"

"github.com/ClickHouse/clickhouse-go/v2"
"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

var chConn driver.Conn

func initClickHouse() error {
addr := os.Getenv("CLICKHOUSE_ADDR")
if addr == "" {
addr = "localhost:9000"
}

conn, err := clickhouse.Open(&clickhouse.Options{
Addr: []string{addr},
Auth: clickhouse.Auth{
Database: "netguard",
Username: "netguard",
Password: "netguard",
},
DialTimeout: 5 * time.Second,
})
if err != nil {
return fmt.Errorf("clickhouse.Open: %w", err)
}

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

if err := conn.Ping(ctx); err != nil {
return fmt.Errorf("clickhouse ping: %w", err)
}

chConn = conn
return nil
}
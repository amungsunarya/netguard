package main

import (
	"context"
	"net/http"
"runtime"
"time"
)

type ServiceHealth struct {
Name      string `json:"name"`
Status    string `json:"status"`
Uptime    string `json:"uptime"`
LatencyMs int64  `json:"latency_ms"`
Detail    string `json:"detail,omitempty"`
}

func healthDetailedHandler(w http.ResponseWriter, r *http.Request) {
start := time.Now()
ctx := r.Context()

var services []ServiceHealth

// PostgreSQL
pgStart := time.Now()
pgStatus, pgDetail := "up", ""
pgCtx, pgCancel := context.WithTimeout(ctx, 2*time.Second)
defer pgCancel()
if pgPool == nil {
pgStatus = "down"
pgDetail = "not initialized"
} else if err := pgPool.Ping(pgCtx); err != nil {
pgStatus = "down"
pgDetail = err.Error()
}
services = append(services, ServiceHealth{
Name: "PostgreSQL", Status: pgStatus,
LatencyMs: time.Since(pgStart).Milliseconds(),
Detail: pgDetail,
})

// ClickHouse
chStart := time.Now()
chStatus, chDetail := "up", ""
chCtx, chCancel := context.WithTimeout(ctx, 2*time.Second)
defer chCancel()
if chConn == nil {
chStatus = "down"
chDetail = "not initialized"
} else if err := chConn.Ping(chCtx); err != nil {
chStatus = "down"
chDetail = err.Error()
}
services = append(services, ServiceHealth{
Name: "ClickHouse", Status: chStatus,
LatencyMs: time.Since(chStart).Milliseconds(),
Detail: chDetail,
})

// API
services = append(services, ServiceHealth{
Name: "API", Status: "up",
Detail: "v0.7.0",
})

// WebSocket
wsStatus := "up"
if wsHub == nil {
wsStatus = "down"
}
services = append(services, ServiceHealth{
Name: "WebSocket", Status: wsStatus,
Detail: "clients: " + itoa(wsHub.ClientCount()),
})

// System
var m runtime.MemStats
runtime.ReadMemStats(&m)
memMB := float64(m.Alloc) / 1024 / 1024

respondJSON(w, 200, map[string]interface{}{
"status":  "ok",
"uptime":  getUptime(),
"version": "0.7.0",
"services": services,
"system": map[string]interface{}{
"memory_mb":  memMB,
"goroutines": runtime.NumGoroutine(),
"cpus":       runtime.NumCPU(),
},
"timestamp": time.Now().Format(time.RFC3339),
"latency_ms": time.Since(start).Milliseconds(),
})
}

func itoa(n int) string {
if n == 0 {
return "0"
}
digits := []byte{}
for n > 0 {
digits = append([]byte{byte('0' + n%10)}, digits...)
n /= 10
}
return string(digits)
}

var serverStartTime = time.Now()

func getUptime() string {
d := time.Since(serverStartTime)
days := int(d.Hours()) / 24
hours := int(d.Hours()) % 24
mins := int(d.Minutes()) % 60
if days > 0 {
return time.Duration(d).Round(time.Second).String() + " (" + itoa(days) + "d " + itoa(hours) + "h)"
}
return time.Duration(d).Round(time.Second).String() + " (" + itoa(hours) + "h " + itoa(mins) + "m)"
}
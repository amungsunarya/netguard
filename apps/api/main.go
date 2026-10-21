package main

import (
"context"
"encoding/json"
"fmt"
"log"
"net/http"
"os"
"strconv"
"time"
)

// ============ MODELS ============
type Device struct {
ID       int     `json:"id"`
Name     string  `json:"name"`
IP       string  `json:"ip"`
Type     string  `json:"type"`
Site     string  `json:"site"`
Status   string  `json:"status"`
CPU      float64 `json:"cpu"`
Memory   float64 `json:"memory"`
Uptime   string  `json:"uptime"`
LastSeen string  `json:"last_seen"`
}

type Alert struct {
ID          string `json:"id"`
Severity    string `json:"severity"`
Title       string `json:"title"`
Description string `json:"description"`
Source      string `json:"source"`
Status      string `json:"status"`
CreatedAt   string `json:"created_at"`
}

type LogEntry struct {
ID        string `json:"id"`
Timestamp string `json:"timestamp"`
Level     string `json:"level"`
Type      string `json:"type"`
Source    string `json:"source"`
Message   string `json:"message"`
}

type Metric struct {
Name      string  `json:"name"`
Value     float64 `json:"value"`
Timestamp string  `json:"timestamp"`
}

// ============ HELPERS ============
func enableCORS(w http.ResponseWriter) {
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(status)
json.NewEncoder(w).Encode(data)
}

// ============ PUBLIC ============
func healthHandler(w http.ResponseWriter, r *http.Request) {
pgStatus, chStatus := "ok", "ok"
if pgPool == nil {
pgStatus = "not connected"
} else {
ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
defer cancel()
if err := pgPool.Ping(ctx); err != nil {
pgStatus = "error: " + err.Error()
}
}
if chConn == nil {
chStatus = "not connected"
} else {
ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
defer cancel()
if err := chConn.Ping(ctx); err != nil {
chStatus = "error: " + err.Error()
}
}
respondJSON(w, 200, map[string]interface{}{
"status": "ok", "timestamp": time.Now().Format(time.RFC3339),
"version": "0.6.0", "postgres": pgStatus, "clickhouse": chStatus,
"ws_clients": wsHub.ClientCount(),
})
}

// ============ PROTECTED ============
func overviewHandler(w http.ResponseWriter, r *http.Request) {
stats, err := getOverviewStatsFromDB(r.Context())
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
alerts, _ := getAlertsFromDB(r.Context(), "", "open")
recent := alerts
if len(recent) > 3 { recent = recent[:3] }
stats["events_per_second"] = 1240
stats["recent_alerts"] = recent
respondJSON(w, 200, stats)
}

func devicesHandler(w http.ResponseWriter, r *http.Request) {
switch r.Method {
case "GET":
devices, err := getDevicesFromDB(r.Context())
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
respondJSON(w, 200, map[string]interface{}{"data": devices, "total": len(devices)})
case "POST":
var d Device
if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
respondJSON(w, 400, map[string]string{"error": "invalid JSON"})
return
}
if d.Name == "" || d.IP == "" {
respondJSON(w, 400, map[string]string{"error": "name dan ip wajib"})
return
}
if d.Status == "" { d.Status = "up" }
if d.Uptime == "" { d.Uptime = "-" }
if d.LastSeen == "" { d.LastSeen = "-" }
created, err := createDeviceDB(r.Context(), d)
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
// BROADCAST
wsHub.Broadcast("device_created", created)
respondJSON(w, 201, created)
default:
respondJSON(w, 405, map[string]string{"error": "method not allowed"})
}
}

func deviceHandler(w http.ResponseWriter, r *http.Request) {
idStr := r.URL.Path[len("/api/devices/"):]
id, err := strconv.Atoi(idStr)
if err != nil {
respondJSON(w, 400, map[string]string{"error": "invalid id"})
return
}
switch r.Method {
case "GET":
d, err := getDeviceByIDFromDB(r.Context(), id)
if err != nil {
respondJSON(w, 404, map[string]string{"error": "not found"})
return
}
respondJSON(w, 200, d)
case "PUT":
var d Device
if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
respondJSON(w, 400, map[string]string{"error": "invalid JSON"})
return
}
updated, err := updateDeviceDB(r.Context(), id, d)
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
// BROADCAST
wsHub.Broadcast("device_updated", updated)
respondJSON(w, 200, updated)
case "DELETE":
if err := deleteDeviceDB(r.Context(), id); err != nil {
respondJSON(w, 404, map[string]string{"error": err.Error()})
return
}
// BROADCAST
wsHub.Broadcast("device_deleted", map[string]int{"id": id})
respondJSON(w, 200, map[string]string{"message": "device deleted"})
default:
respondJSON(w, 405, map[string]string{"error": "method not allowed"})
}
}

func alertsHandler(w http.ResponseWriter, r *http.Request) {
severity := r.URL.Query().Get("severity")
status := r.URL.Query().Get("status")
alerts, err := getAlertsFromDB(r.Context(), severity, status)
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
respondJSON(w, 200, map[string]interface{}{"data": alerts, "total": len(alerts)})
}

func alertActionHandler(w http.ResponseWriter, r *http.Request) {
if r.Method != "POST" {
respondJSON(w, 405, map[string]string{"error": "method not allowed"})
return
}
path := r.URL.Path[len("/api/alerts/"):]
parts := splitPath(path)
if len(parts) != 2 {
respondJSON(w, 400, map[string]string{"error": "invalid path"})
return
}
id, action := parts[0], parts[1]

switch action {
case "ack":
if err := ackAlertDB(r.Context(), id); err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
// BROADCAST
wsHub.Broadcast("alert_acked", map[string]string{"id": id})
respondJSON(w, 200, map[string]string{"message": "alert acknowledged"})

case "block":
alert, err := getAlertByIDDB(r.Context(), id)
if err != nil {
respondJSON(w, 404, map[string]string{"error": "not found"})
return
}
if err := blockAlertDB(r.Context(), id, alert.Source); err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
// BROADCAST
wsHub.Broadcast("alert_blocked", map[string]string{"id": id, "blocked_ip": alert.Source})
respondJSON(w, 200, map[string]string{"message": "source IP blocked", "blocked_ip": alert.Source})

default:
respondJSON(w, 400, map[string]string{"error": "unknown action"})
}
}

func splitPath(p string) []string {
var parts []string
var cur string
for _, c := range p {
if c == '/' {
if cur != "" { parts = append(parts, cur); cur = "" }
} else {
cur += string(c)
}
}
if cur != "" { parts = append(parts, cur) }
return parts
}

func logsHandler(w http.ResponseWriter, r *http.Request) {
level := r.URL.Query().Get("level")
search := r.URL.Query().Get("search")
limit := 100
if l := r.URL.Query().Get("limit"); l != "" {
if n, err := strconv.Atoi(l); err == nil { limit = n }
}
if chConn == nil {
respondJSON(w, 503, map[string]string{"error": "ClickHouse not connected"})
return
}
logs, err := getLogsFromCH(r.Context(), level, search, limit)
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
respondJSON(w, 200, map[string]interface{}{"data": logs, "total": len(logs)})
}

func metricsHandler(w http.ResponseWriter, r *http.Request) {
metric := r.URL.Query().Get("metric")
if metric == "" { metric = "traffic_in" }
hours := 24
if h := r.URL.Query().Get("hours"); h != "" {
if n, err := strconv.Atoi(h); err == nil { hours = n }
}
if chConn == nil {
respondJSON(w, 503, map[string]string{"error": "ClickHouse not connected"})
return
}
metrics, err := getMetricsFromCH(r.Context(), metric, hours)
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
respondJSON(w, 200, map[string]interface{}{"data": metrics})
}

// ============ MAIN ============
func main() {
fmt.Println("Connecting to databases...")
if err := initPostgres(); err != nil {
log.Printf("WARNING: PostgreSQL: %v", err)
} else {
fmt.Println("[OK] PostgreSQL connected")
}
if err := initClickHouse(); err != nil {
log.Printf("WARNING: ClickHouse: %v", err)
} else {
fmt.Println("[OK] ClickHouse connected")
}

// Start WebSocket hub
go wsHub.run()
fmt.Println("[OK] WebSocket hub started")

mux := http.NewServeMux()

// Public
mux.HandleFunc("/health", healthHandler)
mux.HandleFunc("/api/auth/login", loginHandler)
mux.HandleFunc("/api/auth/register", registerHandler)
mux.HandleFunc("/api/auth/me", meHandler)
mux.HandleFunc("/ws", wsHandler) // WebSocket (auth optional Ã¢â‚¬â€ dev)

// Protected
mux.HandleFunc("/api/overview", requireAuth(overviewHandler))
mux.HandleFunc("/api/devices", requireAuth(devicesHandler))
mux.HandleFunc("/api/devices/", requireAuth(deviceHandler))
mux.HandleFunc("/api/alerts", requireAuth(alertsHandler))
mux.HandleFunc("/api/alerts/", requireAuth(alertActionHandler))
mux.HandleFunc("/api/alerts/test", requireAuth(func(w http.ResponseWriter, r *http.Request) {
if r.Method != "POST" {
respondJSON(w, 405, map[string]string{"error": "method not allowed"})
return
}
alert := Alert{
ID:          "A-TEST-" + time.Now().Format("150405"),
Severity:    "critical",
Title:       "Real-time Test Alert",
Description: "Alert ini dipicu dari endpoint /api/alerts/test untuk test WebSocket",
Source:      "test-source",
Status:      "open",
CreatedAt:   time.Now().Format("15:04:05"),
}
wsHub.Broadcast("alert_created", alert)
respondJSON(w, 200, map[string]interface{}{
"message": "test alert broadcasted",
"alert":   alert,
})
}))
mux.HandleFunc("/api/logs", requireAuth(logsHandler))
mux.HandleFunc("/api/metrics", requireAuth(metricsHandler))

// Rules
mux.HandleFunc("/api/rules", requireAuth(rulesHandler))
mux.HandleFunc("/api/rules/", requireAuth(ruleHandler))

// Users (admin only)
mux.HandleFunc("/api/users", requireAuth(func(w http.ResponseWriter, r *http.Request) {
claims, _ := getClaimsFromRequest(r)
if claims.Role != "admin" {
respondJSON(w, 403, map[string]string{"error": "admin only"})
return
}
if r.Method == "GET" {
listUsersHandler(w, r)
} else if r.Method == "POST" {
createUserHandler(w, r)
} else {
respondJSON(w, 405, map[string]string{"error": "method not allowed"})
}
}))
mux.HandleFunc("/api/users/", requireAuth(func(w http.ResponseWriter, r *http.Request) {
claims, _ := getClaimsFromRequest(r)
if claims.Role != "admin" {
respondJSON(w, 403, map[string]string{"error": "admin only"})
return
}
userActionHandler(w, r)
}))

// Health detailed
mux.HandleFunc("/api/health/detailed", requireAuth(healthDetailedHandler))
mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
if r.URL.Path == "/" {
respondJSON(w, 200, map[string]interface{}{
"name": "NetGuard API", "version": "0.6.0", "ws": "/ws",
})
return
}
respondJSON(w, 404, map[string]string{"error": "not found"})
})

port := ":8080"
if p := os.Getenv("API_PORT"); p != "" { port = ":" + p }

fmt.Println()
fmt.Println("Ã¢â€¢â€Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢â€”")
fmt.Println("Ã¢â€¢â€˜  NetGuard API v0.6.0 (WebSocket)          Ã¢â€¢â€˜")
fmt.Println("Ã¢â€¢â€˜  http://localhost" + port + "                    Ã¢â€¢â€˜")
fmt.Println("Ã¢â€¢â€˜  ws://localhost" + port + "/ws                   Ã¢â€¢â€˜")
fmt.Println("Ã¢â€¢Å¡Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â")

log.Fatal(http.ListenAndServe(port, mux))
}
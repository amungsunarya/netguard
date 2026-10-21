package main

import (
"context"
"fmt"
)

// ============ DEVICES ============
func getDevicesFromDB(ctx context.Context) ([]Device, error) {
rows, err := pgPool.Query(ctx, `
SELECT id, name, ip, type, site, status, cpu, memory, uptime, last_seen
FROM devices
ORDER BY id
`)
if err != nil {
return nil, err
}
defer rows.Close()

devices := []Device{}
for rows.Next() {
var d Device
if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.Site, &d.Status, &d.CPU, &d.Memory, &d.Uptime, &d.LastSeen); err != nil {
return nil, err
}
devices = append(devices, d)
}
return devices, rows.Err()
}

func getDeviceByIDFromDB(ctx context.Context, id int) (*Device, error) {
var d Device
err := pgPool.QueryRow(ctx, `
SELECT id, name, ip, type, site, status, cpu, memory, uptime, last_seen
FROM devices
WHERE id = $1
`, id).Scan(&d.ID, &d.Name, &d.IP, &d.Type, &d.Site, &d.Status, &d.CPU, &d.Memory, &d.Uptime, &d.LastSeen)
if err != nil {
return nil, err
}
return &d, nil
}

func createDeviceDB(ctx context.Context, d Device) (*Device, error) {
var id int
err := pgPool.QueryRow(ctx, `
INSERT INTO devices (name, ip, type, site, status, cpu, memory, uptime, last_seen)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id
`, d.Name, d.IP, d.Type, d.Site, d.Status, d.CPU, d.Memory, d.Uptime, d.LastSeen).Scan(&id)
if err != nil {
return nil, err
}
return getDeviceByIDFromDB(ctx, id)
}

func updateDeviceDB(ctx context.Context, id int, d Device) (*Device, error) {
_, err := pgPool.Exec(ctx, `
UPDATE devices SET
name = $1, ip = $2, type = $3, site = $4,
status = $5, cpu = $6, memory = $7, uptime = $8, last_seen = $9,
updated_at = NOW()
WHERE id = $10
`, d.Name, d.IP, d.Type, d.Site, d.Status, d.CPU, d.Memory, d.Uptime, d.LastSeen, id)
if err != nil {
return nil, err
}
return getDeviceByIDFromDB(ctx, id)
}

func deleteDeviceDB(ctx context.Context, id int) error {
tag, err := pgPool.Exec(ctx, `DELETE FROM devices WHERE id = $1`, id)
if err != nil {
return err
}
if tag.RowsAffected() == 0 {
return fmt.Errorf("device not found")
}
return nil
}

// ============ ALERTS ============
func getAlertsFromDB(ctx context.Context, severity, status string) ([]Alert, error) {
query := `SELECT id, severity, title, COALESCE(description, ''), source, status, created_at::text FROM alerts WHERE 1=1`
args := []interface{}{}
argIdx := 1

if severity != "" {
query += fmt.Sprintf(" AND severity = $%d", argIdx)
args = append(args, severity)
argIdx++
}
if status != "" {
query += fmt.Sprintf(" AND status = $%d", argIdx)
args = append(args, status)
argIdx++
}
query += " ORDER BY created_at DESC"

rows, err := pgPool.Query(ctx, query, args...)
if err != nil {
return nil, err
}
defer rows.Close()

alerts := []Alert{}
for rows.Next() {
var a Alert
if err := rows.Scan(&a.ID, &a.Severity, &a.Title, &a.Description, &a.Source, &a.Status, &a.CreatedAt); err != nil {
return nil, err
}
alerts = append(alerts, a)
}
return alerts, rows.Err()
}

func getAlertByIDDB(ctx context.Context, id string) (*Alert, error) {
var a Alert
err := pgPool.QueryRow(ctx, `
SELECT id, severity, title, COALESCE(description, ''), source, status, created_at::text
FROM alerts WHERE id = $1
`, id).Scan(&a.ID, &a.Severity, &a.Title, &a.Description, &a.Source, &a.Status, &a.CreatedAt)
if err != nil {
return nil, err
}
return &a, nil
}

func ackAlertDB(ctx context.Context, id string) error {
tag, err := pgPool.Exec(ctx, `UPDATE alerts SET status = 'acked', updated_at = NOW() WHERE id = $1`, id)
if err != nil {
return err
}
if tag.RowsAffected() == 0 {
return fmt.Errorf("alert not found")
}
return nil
}

func blockAlertDB(ctx context.Context, id, source string) error {
_, err := pgPool.Exec(ctx, `
UPDATE alerts SET status = 'resolved', updated_at = NOW()
WHERE id = $1
`, id)
if err != nil {
return err
}
fmt.Printf("[BLOCK] Source IP %s blocked (alert %s)\n", source, id)
return nil
}

// ============ OVERVIEW ============
func getOverviewStatsFromDB(ctx context.Context) (map[string]interface{}, error) {
var totalAlerts, criticalAlerts, totalDevices, devicesUp, devicesDown int

if err := pgPool.QueryRow(ctx, `SELECT COUNT(*) FROM alerts WHERE status = 'open'`).Scan(&totalAlerts); err != nil {
return nil, err
}
if err := pgPool.QueryRow(ctx, `SELECT COUNT(*) FROM alerts WHERE status = 'open' AND severity = 'critical'`).Scan(&criticalAlerts); err != nil {
return nil, err
}
if err := pgPool.QueryRow(ctx, `SELECT COUNT(*) FROM devices`).Scan(&totalDevices); err != nil {
return nil, err
}
if err := pgPool.QueryRow(ctx, `SELECT COUNT(*) FROM devices WHERE status = 'up'`).Scan(&devicesUp); err != nil {
return nil, err
}
if err := pgPool.QueryRow(ctx, `SELECT COUNT(*) FROM devices WHERE status = 'down'`).Scan(&devicesDown); err != nil {
return nil, err
}

return map[string]interface{}{
"alerts": map[string]interface{}{
"total":    totalAlerts,
"critical": criticalAlerts,
},
"devices": map[string]interface{}{
"total": totalDevices,
"up":    devicesUp,
"down":  devicesDown,
},
}, nil
}

// ============ LOGS (ClickHouse) ============
func getLogsFromCH(ctx context.Context, level, search string, limit int) ([]LogEntry, error) {
if limit <= 0 {
limit = 100
}

query := `SELECT toString(id), formatDateTime(timestamp, '%H:%i:%S'), level, type, source, message FROM logs WHERE 1=1`
args := []interface{}{}
argIdx := 1

if level != "" {
query += fmt.Sprintf(" AND level = $%d", argIdx)
args = append(args, level)
argIdx++
}
if search != "" {
query += fmt.Sprintf(" AND (message ILIKE $%d OR source ILIKE $%d)", argIdx, argIdx)
args = append(args, "%"+search+"%")
argIdx++
}
query += fmt.Sprintf(" ORDER BY timestamp DESC LIMIT %d", limit)

rows, err := chConn.Query(ctx, query, args...)
if err != nil {
return nil, err
}
defer rows.Close()

logs := []LogEntry{}
for rows.Next() {
var l LogEntry
if err := rows.Scan(&l.ID, &l.Timestamp, &l.Level, &l.Type, &l.Source, &l.Message); err != nil {
return nil, err
}
logs = append(logs, l)
}
return logs, rows.Err()
}

// ============ METRICS (ClickHouse) ============
func getMetricsFromCH(ctx context.Context, metricName string, hours int) ([]Metric, error) {
if hours <= 0 {
hours = 24
}

query := `
SELECT metric_name, formatDateTime(timestamp, '%H:%i'), value
FROM metrics
WHERE metric_name = $1
  AND timestamp > now() - INTERVAL $2 HOUR
ORDER BY timestamp
`

rows, err := chConn.Query(ctx, query, metricName, hours)
if err != nil {
return nil, err
}
defer rows.Close()

metrics := []Metric{}
for rows.Next() {
var m Metric
if err := rows.Scan(&m.Name, &m.Timestamp, &m.Value); err != nil {
return nil, err
}
metrics = append(metrics, m)
}
return metrics, rows.Err()
}
package main

import (
"encoding/json"
"fmt"
"net/http"
"strings"

"golang.org/x/crypto/bcrypt"
)

type UserResponse struct {
ID        int    `json:"id"`
Username  string `json:"username"`
Role      string `json:"role"`
CreatedAt string `json:"created_at"`
}

func listUsersHandler(w http.ResponseWriter, r *http.Request) {
ctx := r.Context()
rows, err := pgPool.Query(ctx, `SELECT id, username, role, COALESCE(created_at::text, '') FROM users ORDER BY id`)
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
defer rows.Close()

users := []UserResponse{}
for rows.Next() {
var u UserResponse
if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.CreatedAt); err != nil {
continue
}
users = append(users, u)
}
respondJSON(w, 200, map[string]interface{}{"data": users, "total": len(users)})
}

func userActionHandler(w http.ResponseWriter, r *http.Request) {
// Path: /api/users/{id}
path := r.URL.Path[len("/api/users/"):]
parts := splitPath(path)
if len(parts) != 1 {
respondJSON(w, 400, map[string]string{"error": "invalid path"})
return
}
id := parts[0]

switch r.Method {
case "PUT":
var req struct {
Role     string `json:"role"`
Password string `json:"password"`
}
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
respondJSON(w, 400, map[string]string{"error": "invalid JSON"})
return
}
if req.Role != "" && req.Role != "admin" && req.Role != "analyst" && req.Role != "viewer" {
respondJSON(w, 400, map[string]string{"error": "role harus admin/analyst/viewer"})
return
}

ctx := r.Context()
if req.Password != "" {
hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
_, err := pgPool.Exec(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, string(hash), id)
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
}
if req.Role != "" {
_, err := pgPool.Exec(ctx, `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`, req.Role, id)
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
}
respondJSON(w, 200, map[string]string{"message": "user updated"})

case "DELETE":
ctx := r.Context()
// Jangan izinkan hapus admin terakhir
var count int
pgPool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE role = 'admin'`).Scan(&count)
var targetRole string
pgPool.QueryRow(ctx, `SELECT role FROM users WHERE id = $1`, id).Scan(&targetRole)
if targetRole == "admin" && count <= 1 {
respondJSON(w, 400, map[string]string{"error": "tidak bisa hapus admin terakhir"})
return
}
tag, err := pgPool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
if tag.RowsAffected() == 0 {
respondJSON(w, 404, map[string]string{"error": "user not found"})
return
}
respondJSON(w, 200, map[string]string{"message": "user deleted"})

default:
respondJSON(w, 405, map[string]string{"error": "method not allowed"})
}
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
if r.Method != "POST" {
respondJSON(w, 405, map[string]string{"error": "method not allowed"})
return
}
var req struct {
Username string `json:"username"`
Password string `json:"password"`
Role     string `json:"role"`
}
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
respondJSON(w, 400, map[string]string{"error": "invalid JSON"})
return
}
if req.Username == "" || req.Password == "" {
respondJSON(w, 400, map[string]string{"error": "username & password wajib"})
return
}
if len(req.Password) < 6 {
respondJSON(w, 400, map[string]string{"error": "password minimal 6 karakter"})
return
}
if req.Role == "" {
req.Role = "viewer"
}

hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
var id int
err := pgPool.QueryRow(r.Context(), `
INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id
`, req.Username, string(hash), req.Role).Scan(&id)
if err != nil {
msg := err.Error()
if strings.Contains(msg, "duplicate") {
msg = "username sudah dipakai"
}
respondJSON(w, 400, map[string]string{"error": msg})
return
}
respondJSON(w, 201, map[string]interface{}{
"id":       id,
"username": req.Username,
"role":     req.Role,
})
}

var _ = fmt.Sprintf
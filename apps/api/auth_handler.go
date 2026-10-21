package main

import (
"encoding/json"
"net/http"
"strings"
)

// ============ AUTH HANDLERS ============
func loginHandler(w http.ResponseWriter, r *http.Request) {
enableCORS(w)
if r.Method == "OPTIONS" {
return
}
if r.Method != "POST" {
respondJSON(w, 405, map[string]string{"error": "method not allowed"})
return
}

var req LoginRequest
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
respondJSON(w, 400, map[string]string{"error": "invalid JSON"})
return
}

if req.Username == "" || req.Password == "" {
respondJSON(w, 400, map[string]string{"error": "username dan password wajib"})
return
}

user, err := getUserByUsername(r.Context(), req.Username)
if err != nil {
respondJSON(w, 401, map[string]string{"error": "username atau password salah"})
return
}

if !verifyPassword(user.PasswordHash, req.Password) {
respondJSON(w, 401, map[string]string{"error": "username atau password salah"})
return
}

token, err := generateToken(*user)
if err != nil {
respondJSON(w, 500, map[string]string{"error": "gagal generate token"})
return
}

respondJSON(w, 200, LoginResponse{Token: token, User: *user})
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
enableCORS(w)
if r.Method == "OPTIONS" {
return
}
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
respondJSON(w, 400, map[string]string{"error": "username dan password wajib"})
return
}
if len(req.Password) < 6 {
respondJSON(w, 400, map[string]string{"error": "password minimal 6 karakter"})
return
}
if req.Role == "" {
req.Role = "viewer"
}
if req.Role != "admin" && req.Role != "analyst" && req.Role != "viewer" {
respondJSON(w, 400, map[string]string{"error": "role harus admin/analyst/viewer"})
return
}

user, err := createUserDB(r.Context(), req.Username, req.Password, req.Role)
if err != nil {
respondJSON(w, 400, map[string]string{"error": "username sudah dipakai: " + err.Error()})
return
}

token, _ := generateToken(*user)
respondJSON(w, 201, LoginResponse{Token: token, User: *user})
}

func meHandler(w http.ResponseWriter, r *http.Request) {
enableCORS(w)
if r.Method == "OPTIONS" {
return
}

claims, err := getClaimsFromRequest(r)
if err != nil {
respondJSON(w, 401, map[string]string{"error": err.Error()})
return
}

respondJSON(w, 200, map[string]interface{}{
"user_id":  claims.UserID,
"username": claims.Username,
"role":     claims.Role,
})
}

// ============ MIDDLEWARE ============
func getClaimsFromRequest(r *http.Request) (*Claims, error) {
auth := r.Header.Get("Authorization")
if auth == "" {
return nil, errUnauthorized("missing Authorization header")
}
if !strings.HasPrefix(auth, "Bearer ") {
return nil, errUnauthorized("invalid Authorization format")
}
tokenStr := strings.TrimPrefix(auth, "Bearer ")
return parseToken(tokenStr)
}

func errUnauthorized(msg string) error {
return &authError{msg: msg}
}

type authError struct{ msg string }

func (e *authError) Error() string { return e.msg }

// requireAuth wraps a handler to require JWT auth
func requireAuth(next http.HandlerFunc) http.HandlerFunc {
return func(w http.ResponseWriter, r *http.Request) {
enableCORS(w)
if r.Method == "OPTIONS" {
return
}
claims, err := getClaimsFromRequest(r)
if err != nil {
respondJSON(w, 401, map[string]string{"error": err.Error()})
return
}
// Simpan claims di context (opsional, untuk use case lanjut)
r.Header.Set("X-User-ID", string(rune(claims.UserID)))
r.Header.Set("X-Username", claims.Username)
r.Header.Set("X-Role", claims.Role)
next(w, r)
}
}

// requireRole wraps a handler to require specific role
func requireRole(role string, next http.HandlerFunc) http.HandlerFunc {
return requireAuth(func(w http.ResponseWriter, r *http.Request) {
claims, _ := getClaimsFromRequest(r)
if claims.Role != role && claims.Role != "admin" {
respondJSON(w, 403, map[string]string{"error": "forbidden: butuh role " + role})
return
}
next(w, r)
})
}
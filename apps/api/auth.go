package main

import (
"context"
"fmt"
"os"
"time"

"github.com/golang-jwt/jwt/v5"
"golang.org/x/crypto/bcrypt"
)

// ============ MODELS ============
type User struct {
ID           int    `json:"id"`
Username     string `json:"username"`
PasswordHash string `json:"-"`
Role         string `json:"role"`
CreatedAt    string `json:"created_at,omitempty"`
}

type LoginRequest struct {
Username string `json:"username"`
Password string `json:"password"`
}

type LoginResponse struct {
Token string `json:"token"`
User  User   `json:"user"`
}

type Claims struct {
UserID   int    `json:"user_id"`
Username string `json:"username"`
Role     string `json:"role"`
jwt.RegisteredClaims
}

// ============ JWT HELPERS ============
func getJWTSecret() []byte {
secret := os.Getenv("JWT_SECRET")
if secret == "" {
secret = "netguard-dev-secret-change-in-production"
}
return []byte(secret)
}

func generateToken(user User) (string, error) {
claims := Claims{
UserID:   user.ID,
Username: user.Username,
Role:     user.Role,
RegisteredClaims: jwt.RegisteredClaims{
ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
IssuedAt:  jwt.NewNumericDate(time.Now()),
Issuer:    "netguard",
},
}

token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
return token.SignedString(getJWTSecret())
}

func parseToken(tokenString string) (*Claims, error) {
claims := &Claims{}
token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
return nil, fmt.Errorf("unexpected signing method")
}
return getJWTSecret(), nil
})

if err != nil || !token.Valid {
return nil, fmt.Errorf("invalid token: %w", err)
}
return claims, nil
}

// ============ USER DB ============
func getUserByUsername(ctx context.Context, username string) (*User, error) {
var u User
err := pgPool.QueryRow(ctx, `
SELECT id, username, password_hash, role
FROM users WHERE username = $1
`, username).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role)
if err != nil {
return nil, err
}
return &u, nil
}

func createUserDB(ctx context.Context, username, password, role string) (*User, error) {
hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
if err != nil {
return nil, fmt.Errorf("bcrypt: %w", err)
}

var u User
err = pgPool.QueryRow(ctx, `
INSERT INTO users (username, password_hash, role)
VALUES ($1, $2, $3)
RETURNING id, username, role
`, username, string(hash), role).Scan(&u.ID, &u.Username, &u.Role)
if err != nil {
return nil, err
}
return &u, nil
}

func verifyPassword(hash, password string) bool {
return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
package main

import (
	"encoding/json"
	"net/http"
"os"
"path/filepath"
"strings"
)

type Rule struct {
Name        string `json:"name"`
Category    string `json:"category"`
Schedule    string `json:"schedule"`
Enabled     bool   `json:"enabled"`
Description string `json:"description"`
YAML        string `json:"yaml"`
}

// Baca semua rule dari folder rules/
func getRulesFromFS() ([]Rule, error) {
rulesDir := "./rules"
rules := []Rule{}

categories := []string{"security", "network"}
for _, cat := range categories {
dir := filepath.Join(rulesDir, cat)
files, err := os.ReadDir(dir)
if err != nil {
continue // folder tidak ada, skip
}
for _, f := range files {
if !strings.HasSuffix(f.Name(), ".yaml") {
continue
}
path := filepath.Join(dir, f.Name())
content, err := os.ReadFile(path)
if err != nil {
continue
}
rule := Rule{
Name:     strings.TrimSuffix(f.Name(), ".yaml"),
Category: cat,
Enabled:  true,
YAML:     string(content),
}
// Parse sederhana dari YAML
lines := strings.Split(string(content), "\n")
for _, line := range lines {
line = strings.TrimSpace(line)
if strings.HasPrefix(line, "schedule:") {
rule.Schedule = strings.TrimSpace(strings.TrimPrefix(line, "schedule:"))
}
if strings.HasPrefix(line, "description:") {
rule.Description = strings.TrimSpace(strings.TrimPrefix(line, "description:"))
}
}
if rule.Schedule == "" {
rule.Schedule = "every 1m"
}
if rule.Description == "" {
rule.Description = "Detection rule untuk " + rule.Name
}
rules = append(rules, rule)
}
}
return rules, nil
}

func saveRuleToFS(rule Rule) error {
dir := filepath.Join("./rules", rule.Category)
if err := os.MkdirAll(dir, 0755); err != nil {
return err
}
path := filepath.Join(dir, rule.Name+".yaml")
return os.WriteFile(path, []byte(rule.YAML), 0644)
}

func deleteRuleFromFS(category, name string) error {
path := filepath.Join("./rules", category, name+".yaml")
return os.Remove(path)
}

// Handler
func rulesHandler(w http.ResponseWriter, r *http.Request) {
switch r.Method {
case "GET":
rules, err := getRulesFromFS()
if err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
respondJSON(w, 200, map[string]interface{}{"data": rules, "total": len(rules)})

case "POST":
var rule Rule
if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
respondJSON(w, 400, map[string]string{"error": "invalid JSON"})
return
}
if rule.Name == "" || rule.Category == "" {
respondJSON(w, 400, map[string]string{"error": "name dan category wajib"})
return
}
if err := saveRuleToFS(rule); err != nil {
respondJSON(w, 500, map[string]string{"error": err.Error()})
return
}
wsHub.Broadcast("rule_updated", rule)
respondJSON(w, 201, rule)

default:
respondJSON(w, 405, map[string]string{"error": "method not allowed"})
}
}

func ruleHandler(w http.ResponseWriter, r *http.Request) {
// Path: /api/rules/{category}/{name}
path := r.URL.Path[len("/api/rules/"):]
parts := splitPath(path)
if len(parts) != 2 {
respondJSON(w, 400, map[string]string{"error": "invalid path"})
return
}
category, name := parts[0], parts[1]

switch r.Method {
case "DELETE":
if err := deleteRuleFromFS(category, name); err != nil {
respondJSON(w, 404, map[string]string{"error": err.Error()})
return
}
wsHub.Broadcast("rule_deleted", map[string]string{"category": category, "name": name})
respondJSON(w, 200, map[string]string{"message": "rule deleted"})

default:
respondJSON(w, 405, map[string]string{"error": "method not allowed"})
}
}
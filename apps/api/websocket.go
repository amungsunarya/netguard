package main

import (
"encoding/json"
"log"
"net/http"
"sync"
"time"

"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
ReadBufferSize:  1024,
WriteBufferSize: 1024,
CheckOrigin: func(r *http.Request) bool {
return true // dev: izinkan semua origin (production: whitelist)
},
}

// ============ HUB ============
type WSMessage struct {
Type string      `json:"type"`  // "alert", "log", "device", "ping"
Data interface{} `json:"data"`
Time string      `json:"time"`
}

type Client struct {
conn *websocket.Conn
send chan []byte
}

type Hub struct {
clients    map[*Client]bool
broadcast  chan []byte
register   chan *Client
unregister chan *Client
mu         sync.RWMutex
}

var wsHub = &Hub{
clients:    make(map[*Client]bool),
broadcast:  make(chan []byte, 256),
register:   make(chan *Client),
unregister: make(chan *Client),
}

func (h *Hub) run() {
for {
select {
case client := <-h.register:
h.mu.Lock()
h.clients[client] = true
h.mu.Unlock()
log.Printf("[WS] Client connected (%d total)", len(h.clients))

case client := <-h.unregister:
h.mu.Lock()
if _, ok := h.clients[client]; ok {
delete(h.clients, client)
close(client.send)
}
h.mu.Unlock()
log.Printf("[WS] Client disconnected (%d total)", len(h.clients))

case message := <-h.broadcast:
h.mu.RLock()
for client := range h.clients {
select {
case client.send <- message:
default:
close(client.send)
delete(h.clients, client)
}
}
h.mu.RUnlock()
}
}
}

func (h *Hub) Broadcast(msgType string, data interface{}) {
msg := WSMessage{
Type: msgType,
Data: data,
Time: time.Now().Format(time.RFC3339),
}
bytes, err := json.Marshal(msg)
if err != nil {
log.Printf("[WS] marshal error: %v", err)
return
}
h.broadcast <- bytes
}

func (h *Hub) ClientCount() int {
h.mu.RLock()
defer h.mu.RUnlock()
return len(h.clients)
}

// ============ HANDLER ============
func wsHandler(w http.ResponseWriter, r *http.Request) {
conn, err := upgrader.Upgrade(w, r, nil)
if err != nil {
log.Printf("[WS] upgrade error: %v", err)
return
}

client := &Client{conn: conn, send: make(chan []byte, 256)}
wsHub.register <- client

// Writer goroutine
go func() {
ticker := time.NewTicker(30 * time.Second)
defer func() {
ticker.Stop()
conn.Close()
}()
for {
select {
case message, ok := <-client.send:
if !ok {
conn.WriteMessage(websocket.CloseMessage, []byte{})
return
}
conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
return
}
case <-ticker.C:
conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
return
}
}
}
}()

// Reader goroutine (handle ping/pong & disconnect)
go func() {
defer func() {
wsHub.unregister <- client
conn.Close()
}()
conn.SetReadDeadline(time.Now().Add(60 * time.Second))
conn.SetPongHandler(func(string) error {
conn.SetReadDeadline(time.Now().Add(60 * time.Second))
return nil
})
for {
_, _, err := conn.ReadMessage()
if err != nil {
break
}
}
}()
}
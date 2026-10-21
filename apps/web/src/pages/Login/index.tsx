import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
      padding: 20,
    }}>
      <div style={{
        background: "#1E293B",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 40,
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,.4)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            background: "linear-gradient(135deg, #3B82F6, #06B6D4)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            margin: "0 auto 16px",
          }}>🛡️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>NetGuard</h1>
          <p style={{ fontSize: 13, color: "#94A3B8" }}>Network Monitoring & Security</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{
              fontSize: 11, color: "#94A3B8", display: "block",
              marginBottom: 6, textTransform: "uppercase", fontWeight: 600,
            }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              placeholder="admin"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{
              fontSize: 11, color: "#94A3B8", display: "block",
              marginBottom: 6, textTransform: "uppercase", fontWeight: 600,
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              padding: 10,
              background: "rgba(239,68,68,.1)",
              border: "1px solid #EF4444",
              borderRadius: 4,
              color: "#EF4444",
              fontSize: 13,
              textAlign: "center",
            }}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#3B82F6",
              border: "none",
              color: "white",
              padding: "12px",
              borderRadius: 6,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              marginTop: 8,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Login..." : "Login"}
          </button>
        </form>

        <div style={{
          marginTop: 20,
          padding: 12,
          background: "rgba(6,182,212,.1)",
          border: "1px solid #06B6D4",
          borderRadius: 4,
          fontSize: 11,
          color: "#06B6D4",
          textAlign: "center",
        }}>
          💡 Login default: <strong>admin</strong> / <strong>admin123</strong>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0F172A",
  border: "1px solid #334155",
  color: "#F1F5F9",
  padding: "10px 14px",
  borderRadius: 6,
  fontSize: 14,
  fontFamily: "inherit",
};
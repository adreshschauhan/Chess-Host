import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Shield, LogIn, LogOut } from "lucide-react";
import AppShell from "../components/AppShell";
import { getAdminToken, isAdmin, setAdminToken, setRole } from "../api";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [token, setToken] = useState(getAdminToken());
  const [error, setError] = useState("");

  const tokenLooksValid = useMemo(() => token.trim().length >= 4, [token]);

  const admin = isAdmin();

  return (
    <AppShell
      title="Admin Login"
      subtitle="Use your admin token to enable tournament management"
      actions={
        <>
          <Link className="btn" to="/dashboard">
            Back
          </Link>
        </>
      }
    >
      {error ? <div className="alert">{error}</div> : null}

      <div className="grid">
        <section className="card">
          <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={18} /> Token
          </h2>

          <div className="stack">
            <label>
              <div className="muted" style={{ marginBottom: 6 }}>
                Admin token
              </div>
              <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="e.g. change-me" autoComplete="off" />
            </label>

            <button
              className="btn primary"
              type="button"
              disabled={!tokenLooksValid}
              onClick={async () => {
                setError("");
                const t = token.trim();
                if (!t) {
                  setError("Token required");
                  return;
                }
                // Verify the token against the server before saving
                try {
                  const res = await fetch("/api/admin/verify", {
                    headers: { "x-admin-token": t },
                  });
                  if (!res.ok) {
                    setError("Invalid admin token — please check and try again");
                    return;
                  }
                } catch {
                  setError("Could not reach server to verify token");
                  return;
                }
                setAdminToken(t);
                setRole("admin");
                navigate("/admin");
              }}
            >
              <LogIn size={18} />
              Enable Admin
            </button>

            <button
              className="btn"
              type="button"
              onClick={() => {
                setAdminToken("");
                setRole("user");
                setToken("");
                setError("");
              }}
            >
              <LogOut size={18} />
              Logout
            </button>

            <div className="muted" style={{ fontSize: 12 }}>
              This app uses the <span className="kbd">x-admin-token</span> header for admin-only endpoints.
            </div>
          </div>
        </section>

        <section className="card">
          <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <KeyRound size={18} /> Admin access
          </h2>

          {admin ? (
            <div className="stack">
              <div className="pill ok">Admin enabled</div>
              <div>
                Go to <Link to="/admin">Admin dashboard</Link> to manage tournaments.
              </div>
            </div>
          ) : (
            <div className="stack">
              <div className="pill">Viewer mode</div>
              <div className="muted">Enter a valid token to enable tournament creation/import/report actions.</div>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Where’s my token?</div>
            <div className="muted">
              In Docker Compose, the default admin token is usually set via backend env. If you didn’t change it, try{" "}
              <span className="kbd">change-me</span>.
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

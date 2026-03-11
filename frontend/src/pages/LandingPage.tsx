import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, FileDown, Shield, Swords, Trophy, Users } from "lucide-react";
import { isAdmin } from "../api";
import ThemeToggle from "../components/ThemeToggle";
import { getPublicUrl } from "../runtimeConfig";

export default function LandingPage() {
  const admin = isAdmin();
  const publicUrl = getPublicUrl();
  const [copied, setCopied] = useState(false);

  async function copyPublicUrl() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      const el = document.createElement("textarea");
      el.value = publicUrl;
      el.setAttribute("readonly", "true");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 style={{ margin: 0 }}>Chess Host</h1>
          <div className="muted">Tournament hosting for clubs & communities</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <ThemeToggle />
          <Link className="btn" to="/dashboard">
            <Trophy size={18} />
            Open App
          </Link>
          <Link className="btn" to="/players">
            <Users size={18} />
            Players
          </Link>
          <Link className="btn" to="/stats">
            <BarChart3 size={18} />
            Stats
          </Link>
          {admin ? (
            <Link className="btn" to="/admin">
              <Shield size={18} />
              Admin
            </Link>
          ) : (
            <Link className="btn" to="/admin/login">
              <Shield size={18} />
              Admin Login
            </Link>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="heroTitle">Host Swiss chess tournaments in minutes.</div>
        <div className="heroLead">
          Create multiple tournaments at the same time, manage participants, generate Swiss rounds, submit results, and export reports — all with a
          clean dashboard built for tournament directors.
        </div>

        <div className="heroGrid">
          <div className="card" style={{ margin: 0 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>What you can do</div>
            <div className="stack">
              <div className="row">
                <span className="muted">Create tournament</span>
                <span className="kbd">Admin</span>
              </div>
              <div className="row">
                <span className="muted">Add participants</span>
                <span className="kbd">UI + Import</span>
              </div>
              <div className="row">
                <span className="muted">Generate rounds</span>
                <span className="kbd">Swiss</span>
              </div>
              <div className="row">
                <span className="muted">Track standings</span>
                <span className="kbd">Live</span>
              </div>
              <div className="row">
                <span className="muted">Export reports</span>
                <span className="kbd">CSV</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ margin: 0 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Quick start</div>
            <div className="stack">
              <div>
                1) Open the app dashboard → <Link to="/dashboard">Dashboard</Link>
              </div>
              <div>
                2) If you’re an admin, login with your token → <Link to="/admin/login">Admin Login</Link>
              </div>
              <div>3) Create a tournament, add players, and generate Round 1.</div>
              <div className="muted">Tip: Import participants using JSON/CSV/XLSX.</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <div className="card" style={{ margin: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Public access</div>
          <div className="muted" style={{ marginBottom: 10 }}>
            Share this link so anyone can open your app.
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="kbd" style={{ padding: "8px 10px" }}>
              {publicUrl || "(open the app to detect URL)"}
            </div>
            <button className="btn primary" type="button" onClick={() => void copyPublicUrl()} disabled={!publicUrl}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="muted" style={{ marginTop: 10 }}>
            Tip: If this shows <span className="kbd">localhost</span>, other devices won’t reach it — replace it with your machine’s LAN IP (same
            port).
          </div>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <div className="featureGrid">
          <div className="feature">
            <div className="featureTitle">
              <Swords size={18} />
              Swiss Pairing
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              Generate rounds and record results while keeping standings updated.
            </div>
          </div>

          <div className="feature">
            <div className="featureTitle">
              <Users size={18} />
              Player Profiles
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              View per-player summary, history, and rating at a glance.
            </div>
          </div>

          <div className="feature">
            <div className="featureTitle">
              <FileDown size={18} />
              Reports
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              Export tournament reports as CSV for sharing and recordkeeping.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

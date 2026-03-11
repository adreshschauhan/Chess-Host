import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileDown, Trash2 } from "lucide-react";
import { apiFetch, getAdminToken, isAdmin } from "../api";
import AppShell from "../components/AppShell";

type Tournament = { id: number; name: string; rounds: number; active: boolean; createdAt?: string };

export default function AdminPage() {
  const [active, setActive] = useState<Tournament[]>([]);
  const [past, setPast] = useState<Tournament[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setError("");
    try {
      const [a, p] = await Promise.all([
        apiFetch<Tournament[]>("/api/tournaments?status=active"),
        apiFetch<Tournament[]>("/api/tournaments?status=past"),
      ]);
      setActive(a);
      setPast(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onDeletePastTournament(tournamentId: number) {
    if (busyId) return;
    setBusyId(tournamentId);
    setError("");
    try {
      await apiFetch<{ ok: true }>(`/api/tournaments/${tournamentId}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function downloadCsvReport(tournamentId: number) {
    setError("");
    try {
      const token = getAdminToken();
      const res = await fetch(`/api/tournaments/${tournamentId}/report?format=csv`, {
        headers: token ? { "x-admin-token": token } : {},
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tournament-${tournamentId}-report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  if (!isAdmin()) {
    return (
      <AppShell
        title="Admin"
        subtitle="Restricted area"
        actions={
          <>
            <Link className="btn" to="/admin/login">
              Login
            </Link>
            <Link className="btn" to="/dashboard">
              Dashboard
            </Link>
          </>
        }
      >
        <div className="alert">Admin token required. Go to Admin Login to enable access.</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Admin"
      subtitle="Manage tournaments, exports, and cleanup"
      actions={
        <>
          <Link className="btn" to="/dashboard">
            Dashboard
          </Link>
          <Link className="btn" to="/players">
            Players
          </Link>
        </>
      }
    >
      {error ? <div className="alert">{error}</div> : null}

      <div className="grid">
        <section className="card">
          <h2>Ongoing tournaments</h2>
          {active.length ? (
            <ul>
              {active.map((t) => (
                <li key={t.id}>
                  <Link to={`/tournaments/${t.id}`}>{t.name}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="muted">None</div>
          )}
        </section>

        <section className="card">
          <h2>Completed tournaments</h2>
          {past.length ? (
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Rounds</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link to={`/tournaments/${t.id}`}>{t.name}</Link>
                      </td>
                      <td>{t.rounds}</td>
                      <td style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Link className="btn" to={`/tournaments/${t.id}`}>
                          View
                        </Link>
                        <button className="btn" onClick={() => void downloadCsvReport(t.id)}>
                          <FileDown size={18} />
                          Report CSV
                        </button>
                        <button className="btn danger" disabled={busyId === t.id} onClick={() => void onDeletePastTournament(t.id)}>
                          <Trash2 size={18} />
                          {busyId === t.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="muted">No completed tournaments</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

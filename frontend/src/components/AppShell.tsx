import { type ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { isAdmin, setAdminToken, setRole } from "../api";
import ThemeToggle from "./ThemeToggle";

/** Chess piece icon — renders a Unicode chess symbol at icon size */
function ChessPiece({ p, size = 18 }: { p: string; size?: number }) {
  return (
    <span className="chessIcon" style={{ fontSize: size }} aria-hidden="true">
      {p}
    </span>
  );
}

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  show?: boolean;
};

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? "navLink active" : "navLink";
}

export default function AppShell({ title, subtitle, actions, children }: Props) {
  const admin = isAdmin();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const items: NavItem[] = [
    { to: "/", label: "Landing", icon: <ChessPiece p="♟" /> },
    { to: "/dashboard", label: "Dashboard", icon: <ChessPiece p="♚" /> },
    { to: "/players", label: "Players", icon: <ChessPiece p="♞" /> },
    { to: "/stats", label: "Stats", icon: <ChessPiece p="♛" /> },
    { to: "/admin", label: "Admin", icon: <ChessPiece p="♜" />, show: admin },
    { to: "/admin/login", label: "Admin Login", icon: <LogIn size={18} />, show: !admin },
  ];

  return (
    <div className="shell">
      <aside className={navOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brandIcon">♔</div>
          <div>
            <div className="brandTitle">Chess Host</div>
            <div className="brandSub">Swiss tournaments · Elo · Reports</div>
          </div>
        </div>

        <nav className="nav">
          {items
            .filter((i) => i.show === undefined || i.show)
            .map((i) => (
              <NavLink key={i.to} to={i.to} className={navLinkClassName} onClick={() => setNavOpen(false)}>
                <span className="navIcon">{i.icon}</span>
                <span>{i.label}</span>
              </NavLink>
            ))}
        </nav>

        <div className="sidebarFooter">
          <div className={admin ? "pill ok" : "pill"}>{admin ? "Admin" : "Viewer"}</div>
          {admin ? (
            <button
              className="btn"
              onClick={() => {
                setAdminToken("");
                setRole("user");
                navigate("/dashboard");
              }}
              type="button"
            >
              <LogOut size={18} />
              Logout
            </button>
          ) : null}
          <div className="sidebarCopyright">© CDAC Patna 2026</div>
        </div>
      </aside>

      {navOpen ? <div className="overlay" onClick={() => setNavOpen(false)} /> : null}

      <main className="main">
        <header className="topbar">
          <div>
            <button className="iconBtn" type="button" aria-label={navOpen ? "Close menu" : "Open menu"} onClick={() => setNavOpen((v) => !v)}>
              {navOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="pageTitle">{title}</div>
            {subtitle ? <div className="pageSub">{subtitle}</div> : null}
          </div>
          <div className="topbarActions">
            {actions}
            <ThemeToggle />
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}

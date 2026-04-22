import { useState, useEffect } from "react";

type Page = "overview" | "events" | "analytics" | "members" | "billing";

const NAV: { id: Page; icon: string; label: string }[] = [
  { id: "overview",  icon: "⚡", label: "Overview"  },
  { id: "events",    icon: "📋", label: "Events"    },
  { id: "analytics", icon: "📊", label: "Analytics" },
  { id: "members",   icon: "👥", label: "Members"   },
  { id: "billing",   icon: "💳", label: "Billing"   },
];

export function Sidebar({ page, setPage, onLogout }: { page: Page; setPage: (p: Page) => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth > 767) setOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const navigate = (p: Page) => {
    setPage(p);
    setOpen(false);
  };

  return (
    <>
      {/* Mobile topbar */}
      <div className="topbar">
        <div className="topbar-logo">Pulse<span>Ops</span></div>
        <button className="hamburger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Overlay */}
      <div className={`sidebar-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-logo">Pulse<span>Ops</span></div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}>
              <span className="icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={onLogout} style={{ width: "100%" }}>
            <span className="icon">🚪</span> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export type { Page };

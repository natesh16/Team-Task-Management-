import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import Brand from "./Brand";
import Icon from "./Icon";
import Avatar from "./Avatar";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: "dashboard" },
  { to: "/tasks", label: "Task board", icon: "board" },
  { to: "/calendar", label: "Calendar", icon: "calendar" },
  { to: "/time", label: "Time tracking", icon: "clock" },
  { to: "/analytics", label: "Analytics", icon: "barChart" },
  { to: "/inbox", label: "Inbox", icon: "bell", badgeKey: "unread" },
  { to: "/automations", label: "Automations", icon: "zap" },
  { to: "/teams", label: "Teams", icon: "users" },
  { to: "/profile", label: "Profile", icon: "user" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("taskmaster-theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("taskmaster-theme", theme);
  }, [theme]);

  useEffect(() => {
    setMenuOpen(false);
    api
      .get("/notifications", { params: { unreadOnly: "true", limit: 1 } })
      .then((res) => setUnreadCount(res.data?.unreadCount || 0))
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (e.altKey && e.key === "1") {
        navigate("/dashboard");
      } else if (e.altKey && e.key === "2") {
        navigate("/tasks");
      } else if (e.altKey && e.key === "3") {
        navigate("/calendar");
      } else if (e.altKey && e.key === "4") {
        navigate("/time");
      } else if (e.altKey && e.key === "5") {
        navigate("/analytics");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`app-shell ${menuOpen ? "app-shell--menu-open" : ""}`}>
      <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar-top">
          <Brand to="/dashboard" className="sidebar-brand" />
          <button
            type="button"
            className="icon-btn sidebar-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="sidebar-workspace">
          <span className="workspace-label">Workspace</span>
          <div className="workspace-name">
            <span className="workspace-dot" />
            TaskMaster SaaS
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item--active" : ""}`
              }
            >
              <span className="nav-icon">
                <Icon name={item.icon} size={19} />
              </span>
              <span>{item.label}</span>
              {item.badgeKey === "unread" && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-tip" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            title="Toggle light/dark theme"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Avatar name={user?.name} size="sm" />
            <div className="sidebar-user-meta">
              <strong>{user?.name}</strong>
              <span>
                {user?.role === "admin" ? "Workspace admin" : "Team member"}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn sidebar-logout"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="scrim"
          aria-label="Close menu overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="main-area">
        <header className="mobile-topbar">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" size={22} />
          </button>
          <Brand to="/dashboard" />
          <Avatar name={user?.name} size="sm" />
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>

      <Modal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        title="Keyboard shortcuts"
      >
        <div className="check-list">
          <div className="check-row">
            <strong style={{ flex: 1 }}>Toggle this help</strong>
            <code>?</code>
          </div>
          <div className="check-row">
            <strong style={{ flex: 1 }}>Go to Overview</strong>
            <code>Alt + 1</code>
          </div>
          <div className="check-row">
            <strong style={{ flex: 1 }}>Go to Task board</strong>
            <code>Alt + 2</code>
          </div>
          <div className="check-row">
            <strong style={{ flex: 1 }}>Go to Calendar</strong>
            <code>Alt + 3</code>
          </div>
          <div className="check-row">
            <strong style={{ flex: 1 }}>Go to Time tracking</strong>
            <code>Alt + 4</code>
          </div>
          <div className="check-row">
            <strong style={{ flex: 1 }}>Go to Analytics</strong>
            <code>Alt + 5</code>
          </div>
        </div>
      </Modal>
    </div>
  );
}

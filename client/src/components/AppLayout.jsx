import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Brand from "./Brand";
import Icon from "./Icon";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/tasks", label: "Task board", icon: "board" },
  { to: "/teams", label: "Teams", icon: "users" },
  { to: "/profile", label: "Profile", icon: "user" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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
            TaskMask demo
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
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-tip">
          <span className="tip-icon">
            <Icon name="sparkles" size={16} />
          </span>
          <p>
            <strong>Try the board.</strong> Drag a card between columns to move
            it forward.
          </p>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Avatar name={user?.name} size="sm" />
            <div className="sidebar-user-meta">
              <strong>{user?.name}</strong>
              <span>{user?.role === "admin" ? "Workspace admin" : "Team member"}</span>
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
    </div>
  );
}

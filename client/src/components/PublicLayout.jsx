import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Brand from "./Brand";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Demo access", href: "#demo" },
  { label: "Under the hood", href: "#inside" },
];

export default function PublicLayout() {
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <div className="marketing">
      <header className="site-nav">
        <div className="site-nav-inner">
          <Brand to="/" />

          <nav className="site-links" aria-label="Primary">
            {LINKS.map((link) => (
              <a key={link.href} href={`/${link.href}`}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="site-nav-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Open dashboard
                <Icon name="arrowRight" size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Get started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="icon-btn nav-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            <Icon name={menuOpen ? "x" : "menu"} size={22} />
          </button>
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            {LINKS.map((link) => (
              <a key={link.href} href={`/${link.href}`}>
                {link.label}
              </a>
            ))}
            <div className="mobile-menu-actions">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-primary btn-block">
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary btn-block">
                    Sign in
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-block">
                    Create account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Brand to="/" />
            <p>
              A focused team workspace for planning tasks, assigning owners and
              shipping work together.
            </p>
            <span className="footer-note">
              Built with the MERN stack · Demo data seeded automatically
            </span>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <a href="/#features">Features</a>
            <a href="/#how-it-works">How it works</a>
            <a href="/#demo">Demo access</a>
            <Link to="/login">Sign in</Link>
          </div>

          <div className="footer-col">
            <h4>Workspace</h4>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/teams">Teams</Link>
            <Link to="/tasks">Task board</Link>
            <Link to="/profile">Profile</Link>
          </div>

          <div className="footer-col">
            <h4>Demo logins</h4>
            <span className="footer-cred">admin@taskmask.com</span>
            <span className="footer-muted">TaskMaskAdmin2026!</span>
            <span className="footer-cred">user@taskmask.com</span>
            <span className="footer-muted">TaskMaskUser2026!</span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} TaskMask Management</span>
          <span>Plan · Assign · Track · Ship</span>
        </div>
      </footer>
    </div>
  );
}

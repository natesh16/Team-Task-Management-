import React from "react";
import { Link } from "react-router-dom";
import Brand from "./Brand";
import Icon from "./Icon";
import Avatar from "./Avatar";

const POINTS = [
  "Drag-and-drop board with four statuses",
  "Team workspaces with invite codes",
  "Assignment history for every task owner",
  "Dashboard stats that stay in sync",
];

export default function AuthLayout({ children, badge = "Team workspace" }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside-glow" aria-hidden="true" />
        <div className="auth-aside-top">
          <Brand to="/" />
          <Link to="/" className="auth-back">
            <Icon name="chevronLeft" size={15} /> Back to home
          </Link>
        </div>

        <div className="auth-aside-body">
          <span className="pill pill--glass">
            <Icon name="sparkles" size={14} />
            {badge}
          </span>
          <h2>
            Where focused teams keep their
            <span> work moving.</span>
          </h2>
          <p className="auth-aside-lede">
            Tasks, owners, priorities and progress — together in one calm,
            responsive workspace.
          </p>

          <ul className="auth-points">
            {POINTS.map((point) => (
              <li key={point}>
                <span className="auth-point-icon">
                  <Icon name="check" size={13} strokeWidth={2.4} />
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="auth-quote">
            <div className="auth-quote-head">
              <Avatar name="Avery Stone" size="sm" />
              <div>
                <strong>Avery Stone</strong>
                <span>Product lead · Product Launch</span>
              </div>
            </div>
            <p>
              “The board finally matches how we actually work. Everyone knows
              what is next and who owns it.”
            </p>
          </div>
        </div>

        <div className="auth-aside-footer">
          <span>Plan · Assign · Track · Ship</span>
          <div className="auth-avatars">
            <Avatar name="Jordan Blake" size="xs" />
            <Avatar name="Priya Sharma" size="xs" />
            <Avatar name="Marcus Lee" size="xs" />
            <span>+1</span>
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-panel">{children}</div>
        <p className="auth-legal">
          Demo application · Data is stored locally in MongoDB
        </p>
      </main>
    </div>
  );
}

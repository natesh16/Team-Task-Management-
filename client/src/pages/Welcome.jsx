import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import CopyButton from "../components/CopyButton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { DEMO_CREDENTIALS, DEMO_EXTRA_USERS } from "../utils/demo";
import { getErrorMessage } from "../utils/format";

const FEATURES = [
  {
    icon: "board",
    title: "Kanban task board",
    text: "Move work through To do, In progress, In review and Done. Drag cards between columns or update them in a click.",
  },
  {
    icon: "users",
    title: "Team workspaces",
    text: "Create a workspace in seconds, share the six-character invite code, and keep every project in one place.",
  },
  {
    icon: "target",
    title: "Clear ownership",
    text: "Assign tasks to teammates with a reason. Every reassignment is written to an auditable history timeline.",
  },
  {
    icon: "flag",
    title: "Priority and due dates",
    text: "Flag high-priority work, watch overdue items, and see what needs attention before it slips.",
  },
  {
    icon: "chart",
    title: "Live dashboard",
    text: "Completion rate, overdue count, per-team progress and your personal focus list update as work changes.",
  },
  {
    icon: "shield",
    title: "Safe by design",
    text: "JWT sessions, bcrypt password hashing, membership checks on every route and owner-only team management.",
  },
];

const STEPS = [
  {
    title: "Sign in with a demo account",
    text: "Use the seeded admin or member login below — no setup, no email verification.",
  },
  {
    title: "Open a team workspace",
    text: "Two demo teams are ready: Product Launch and Website Revamp, each with real tasks and members.",
  },
  {
    title: "Plan on the board",
    text: "Create a task, set priority and due date, then drag it to the right column as work progresses.",
  },
  {
    title: "Track and ship",
    text: "Assign owners with a reason, review the history trail and follow progress on the dashboard.",
  },
];

const PREVIEW_COLUMNS = [
  {
    title: "To do",
    tone: "todo",
    cards: [
      { title: "Draft the press release", tag: "Medium", meta: "Priya · Aug 12" },
      { title: "Collect beta feedback", tag: "Low", meta: "Jordan · Overdue" },
    ],
  },
  {
    title: "In progress",
    tone: "progress",
    cards: [
      { title: "Finalize launch checklist", tag: "High", meta: "Avery · Today" },
      { title: "Ship analytics dashboard", tag: "High", meta: "Marcus · Aug 14" },
    ],
  },
  {
    title: "Review",
    tone: "review",
    cards: [{ title: "Prepare demo environment", tag: "High", meta: "Marcus · Tomorrow" }],
  },
  {
    title: "Done",
    tone: "done",
    cards: [{ title: "Review pricing tiers", tag: "Medium", meta: "Avery · Aug 6" }],
  },
];

export default function Welcome() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [pending, setPending] = useState("");
  const [demoError, setDemoError] = useState("");

  const handleDemoLogin = async (credential) => {
    setDemoError("");
    setPending(credential.key);
    try {
      await login(credential.email, credential.password);
      toast.success(`Signed in as ${credential.email}`);
      navigate("/dashboard");
    } catch (error) {
      const message = getErrorMessage(error, "Demo sign-in failed");
      setDemoError(
        `${message}. If the database is empty, run "npm run seed" inside the server folder and try again.`
      );
      toast.error("Demo sign-in failed");
    } finally {
      setPending("");
    }
  };

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="pill pill--brand">
              <Icon name="sparkles" size={14} />
              MERN team task management
            </span>
            <h1>
              Plan the work.
              <br />
              <span className="gradient-text">Ship it together.</span>
            </h1>
            <p className="hero-lede">
              TaskMask is a clean team workspace for creating tasks, assigning
              clear owners and tracking progress from first idea to done. Log in
              with a seeded demo account and the whole app is ready to explore.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => handleDemoLogin(DEMO_CREDENTIALS[0])}
                disabled={Boolean(pending)}
              >
                {pending === "admin" ? (
                  <span className="spinner spinner--light" aria-hidden="true" />
                ) : (
                  <Icon name="zap" size={18} />
                )}
                Try the live demo
              </button>
              <Link to="/register" className="btn btn-secondary btn-lg">
                Create an account
                <Icon name="arrowRight" size={17} />
              </Link>
            </div>

            <div className="hero-meta">
              <span>
                <Icon name="checkCircle" size={15} /> No setup required
              </span>
              <span>
                <Icon name="checkCircle" size={15} /> Seeded teams &amp; tasks
              </span>
              <span>
                <Icon name="checkCircle" size={15} /> Responsive on mobile
              </span>
            </div>

            {demoError && (
              <div className="alert alert--error hero-alert">
                <Icon name="alert" size={17} />
                <span>{demoError}</span>
              </div>
            )}
          </div>

          <div className="hero-visual" aria-hidden="true">
            <span className="preview-glow" />
            <div className="preview-window">
              <div className="preview-topbar">
                <span className="preview-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="preview-url">taskmask.app/dashboard</span>
                <span className="preview-avatars">
                  <Avatar name="Avery Stone" size="xs" />
                  <Avatar name="Jordan Blake" size="xs" />
                  <Avatar name="Priya Sharma" size="xs" />
                </span>
              </div>

              <div className="preview-body">
                <div className="preview-side">
                  <span className="preview-side-brand">
                    <i className="preview-logo" />
                    TaskMask
                  </span>
                  <span className="preview-nav preview-nav--active">
                    <i /> Dashboard
                  </span>
                  <span className="preview-nav">
                    <i /> Task board
                  </span>
                  <span className="preview-nav">
                    <i /> Teams
                  </span>
                  <span className="preview-nav">
                    <i /> Profile
                  </span>
                </div>

                <div className="preview-main">
                  <div className="preview-head">
                    <div>
                      <span className="preview-eyebrow">Product Launch</span>
                      <strong>Task board</strong>
                    </div>
                    <span className="preview-new">+ New task</span>
                  </div>

                  <div className="preview-columns">
                    {PREVIEW_COLUMNS.map((column) => (
                      <div className="preview-column" key={column.title}>
                        <div className="preview-col-head">
                          <span className={`dot dot--${column.tone}`} />
                          {column.title}
                          <em>{column.cards.length}</em>
                        </div>
                        {column.cards.map((card) => (
                          <div className="preview-task" key={card.title}>
                            <span className="preview-task-title">{card.title}</span>
                            <span className="preview-task-meta">
                              <i className={`tag tag--${card.tag.toLowerCase()}`}>
                                {card.tag}
                              </i>
                              {card.meta}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="float-card float-card--stats">
              <span className="float-icon float-icon--green">
                <Icon name="chart" size={17} />
              </span>
              <div>
                <strong>72% complete</strong>
                <small>12 tasks across 2 teams</small>
              </div>
            </div>

            <div className="float-card float-card--assign">
              <span className="float-icon float-icon--violet">
                <Icon name="history" size={17} />
              </span>
              <div>
                <strong>Assignment logged</strong>
                <small>Marcus · “Demo setup”</small>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-strip">
          <div>
            <strong>2</strong>
            <span>seeded teams</span>
          </div>
          <div>
            <strong>12</strong>
            <span>demo tasks</span>
          </div>
          <div>
            <strong>4</strong>
            <span>task statuses</span>
          </div>
          <div>
            <strong>3</strong>
            <span>priority levels</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>responsive UI</span>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-head">
          <span className="eyebrow">Everything in one place</span>
          <h2>Built for small teams that move fast</h2>
          <p>
            Every screen is connected: create a team, invite people, assign work
            and watch the dashboard reflect it instantly.
          </p>
        </div>

        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-icon">
                <Icon name={feature.icon} size={21} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--alt" id="how-it-works">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2>From login to shipped in four steps</h2>
        </div>

        <div className="steps">
          {STEPS.map((step, index) => (
            <article className="step" key={step.title}>
              <span className="step-num">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="demo">
        <div className="section-head section-head--left">
          <span className="eyebrow">Demo access</span>
          <h2>Sample login IDs and passwords</h2>
          <p>
            These accounts are created automatically the first time the server
            starts against an empty database. Pick a role and sign in instantly.
          </p>
        </div>

        <div className="demo-grid">
          {DEMO_CREDENTIALS.map((credential) => (
            <article
              className={`demo-card demo-card--${credential.tone}`}
              key={credential.key}
            >
              <div className="demo-card-head">
                <Avatar name={credential.name} size="lg" />
                <div>
                  <span className="demo-role">{credential.role}</span>
                  <h3>{credential.name}</h3>
                  <p>{credential.blurb}</p>
                </div>
              </div>

              <dl className="credential-list">
                <div className="credential-row">
                  <dt>
                    <Icon name="mail" size={15} /> Email
                  </dt>
                  <dd>
                    <code>{credential.email}</code>
                    <CopyButton
                      value={credential.email}
                      className="icon-btn icon-btn--sm"
                      iconOnly
                      title="Copy email"
                    />
                  </dd>
                </div>
                <div className="credential-row">
                  <dt>
                    <Icon name="lock" size={15} /> Password
                  </dt>
                  <dd>
                    <code>{credential.password}</code>
                    <CopyButton
                      value={credential.password}
                      className="icon-btn icon-btn--sm"
                      iconOnly
                      title="Copy password"
                    />
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => handleDemoLogin(credential)}
                disabled={Boolean(pending)}
              >
                {pending === credential.key ? (
                  <span className="spinner spinner--light" aria-hidden="true" />
                ) : (
                  <Icon name="arrowRight" size={17} />
                )}
                Sign in as {credential.key === "admin" ? "admin" : "member"}
              </button>
            </article>
          ))}
        </div>

        <div className="demo-note">
          <div className="demo-note-main">
            <Icon name="key" size={18} />
            <div>
              <strong>Two more teammates are seeded</strong>
              <p>
                {DEMO_EXTRA_USERS.map((user) => (
                  <span key={user.email}>
                    <code>{user.email}</code> / <code>{user.password}</code>
                  </span>
                ))}
              </p>
            </div>
          </div>
          <p className="demo-note-hint">
            Prefer the login form? <Link to="/login">Open sign in</Link> — the
            demo credentials can be filled with one click.
          </p>
        </div>
      </section>

      <section className="section section--alt" id="inside">
        <div className="section-head">
          <span className="eyebrow">Under the hood</span>
          <h2>Everything you need to run it</h2>
          <p>
            A complete MERN application: React + Vite frontend, Express API,
            MongoDB models and JWT authentication.
          </p>
        </div>

        <div className="inside-grid">
          <article className="inside-card">
            <span className="feature-icon">
              <Icon name="layers" size={21} />
            </span>
            <h3>Tech stack</h3>
            <div className="stack-list">
              <span className="stack-pill">React 18</span>
              <span className="stack-pill">Vite 5</span>
              <span className="stack-pill">React Router 6</span>
              <span className="stack-pill">Axios</span>
              <span className="stack-pill">Node.js</span>
              <span className="stack-pill">Express</span>
              <span className="stack-pill">MongoDB</span>
              <span className="stack-pill">Mongoose</span>
              <span className="stack-pill">JWT</span>
              <span className="stack-pill">bcrypt</span>
            </div>
          </article>

          <article className="inside-card">
            <span className="feature-icon">
              <Icon name="server" size={21} />
            </span>
            <h3>API surface</h3>
            <ul className="api-list">
              <li>
                <code>POST /api/auth/login</code>
                <span>JWT session</span>
              </li>
              <li>
                <code>GET /api/tasks/stats</code>
                <span>Dashboard data</span>
              </li>
              <li>
                <code>GET /api/teams</code>
                <span>My workspaces</span>
              </li>
              <li>
                <code>PATCH /api/tasks/:id/assign</code>
                <span>Ownership</span>
              </li>
              <li>
                <code>GET /api/tasks/my-tasks</code>
                <span>Personal focus</span>
              </li>
            </ul>
          </article>

          <article className="inside-card inside-card--wide">
            <span className="feature-icon">
              <Icon name="code" size={21} />
            </span>
            <h3>Run it locally</h3>
            <div className="run-grid">
              <div>
                <span className="run-label">1 · Backend</span>
                <pre className="code-block">
{`cd server
npm install
npm run dev`}
                </pre>
                <span className="run-hint">
                  API on <code>http://localhost:4000</code>
                </span>
              </div>
              <div>
                <span className="run-label">2 · Frontend</span>
                <pre className="code-block">
{`cd client
npm install
npm run dev`}
                </pre>
                <span className="run-hint">
                  App on <code>http://localhost:3000</code>
                </span>
              </div>
              <div>
                <span className="run-label">Optional · reseed demo data</span>
                <pre className="code-block">
{`cd server
npm run seed`}
                </pre>
                <span className="run-hint">
                  Safe to run again — it never duplicates data
                </span>
              </div>
            </div>
          </article>
        </div>

        <div className="permission-grid">
          <div className="permission-card">
            <span className="perm-icon perm-icon--violet">
              <Icon name="shield" size={18} />
            </span>
            <h4>Team owner</h4>
            <p>Rename or delete the team, manage members and see every task.</p>
          </div>
          <div className="permission-card">
            <span className="perm-icon perm-icon--blue">
              <Icon name="users" size={18} />
            </span>
            <h4>Team admin</h4>
            <p>Full task access, assignment control and team-level reporting.</p>
          </div>
          <div className="permission-card">
            <span className="perm-icon perm-icon--green">
              <Icon name="user" size={18} />
            </span>
            <h4>Team member</h4>
            <p>See team tasks, update status, review history and own assigned work.</p>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="cta-inner">
          <div>
            <span className="eyebrow eyebrow--light">Ready when you are</span>
            <h2>Open the workspace and start shipping</h2>
            <p>
              The demo database already has teams, tasks and assignment history
              waiting for you.
            </p>
          </div>
          <div className="cta-actions">
            <button
              type="button"
              className="btn btn-light btn-lg"
              onClick={() => handleDemoLogin(DEMO_CREDENTIALS[0])}
              disabled={Boolean(pending)}
            >
              <Icon name="zap" size={18} />
              Open demo workspace
            </button>
            <Link to="/register" className="btn btn-outline-light btn-lg">
              Create account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

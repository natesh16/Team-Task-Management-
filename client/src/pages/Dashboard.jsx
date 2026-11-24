import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import { StatusBadge, PriorityBadge } from "../components/Badge";
import { SkeletonCard } from "../components/Loader";
import { useToast } from "../components/Toast";
import {
  dueLabel,
  firstName,
  formatDateTime,
  getErrorMessage,
  getGreeting,
  isOverdue,
} from "../utils/format";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [statsRes, teamsRes] = await Promise.all([
        api.get("/tasks/stats"),
        api.get("/teams"),
      ]);
      setData(statsRes.data);
      setTeams(teamsRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load your dashboard"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStatus = async (task) => {
    setUpdating(task._id);
    try {
      await api.put(`/tasks/${task._id}`, {
        status: task.status === "done" ? "todo" : "done",
      });
      toast.success(task.status === "done" ? "Task reopened" : "Task completed");
      await load({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update the task"));
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="page-stack">
        <div className="page-header">
          <div>
            <span className="skeleton skeleton-line skeleton-line--short" />
            <span className="skeleton skeleton-line skeleton-line--title" />
          </div>
        </div>
        <div className="stat-grid">
          {[0, 1, 2, 3].map((index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
        <div className="dash-grid">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <div className="page-header">
          <div>
            <span className="eyebrow">Dashboard</span>
            <h1>Something went wrong</h1>
            <p className="page-subtitle">{error}</p>
          </div>
        </div>
        <div className="panel">
          <EmptyState
            icon="alert"
            title="We couldn't load your workspace"
            description="Check that the API server is running on port 4000, then try again."
            action={
              <button type="button" className="btn btn-primary" onClick={() => load()}>
                Retry
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const perTeam = data?.perTeam || [];
  const myTasks = data?.myTasks || [];
  const recent = data?.recent || [];
  const openAssigned = Math.max(
    (stats.assignedToMe || 0) - (stats.completedByMe || 0),
    0
  );
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const statCards = [
    {
      label: "Open tasks assigned to me",
      value: openAssigned,
      icon: "target",
      tone: "violet",
      foot: `${stats.assignedToMe || 0} total assigned`,
    },
    {
      label: "Completed by me",
      value: stats.completedByMe || 0,
      icon: "checkCircle",
      tone: "green",
      foot: `${stats.done || 0} done across all teams`,
    },
    {
      label: "Teams",
      value: teams.length,
      icon: "users",
      tone: "blue",
      foot: `${stats.total || 0} tasks in total`,
    },
    {
      label: "Overdue",
      value: stats.overdue || 0,
      icon: "alert",
      tone: stats.overdue ? "red" : "slate",
      foot: `${stats.highPriority || 0} high priority open`,
    },
  ];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>
            {getGreeting()}, {firstName(user?.name)} <span className="wave">👋</span>
          </h1>
          <p className="page-subtitle">
            {today} · Here is what is moving across your teams.
          </p>
        </div>
        <div className="page-actions">
          <Link to="/teams" className="btn btn-secondary">
            <Icon name="users" size={17} />
            Manage teams
          </Link>
          <Link to="/tasks?new=1" className="btn btn-primary">
            <Icon name="plus" size={17} />
            New task
          </Link>
        </div>
      </header>

      <section className="stat-grid" aria-label="Workspace statistics">
        {statCards.map((card) => (
          <article className="stat-card" key={card.label}>
            <span className={`stat-icon stat-icon--${card.tone}`}>
              <Icon name={card.icon} size={20} />
            </span>
            <div className="stat-content">
              <strong className="stat-value">{card.value}</strong>
              <span className="stat-label">{card.label}</span>
              <small className="stat-foot">{card.foot}</small>
            </div>
          </article>
        ))}
      </section>

      <div className="dash-grid">
        <section className="panel dash-focus">
          <div className="panel-head">
            <div>
              <h2>Your focus</h2>
              <p>Tasks assigned to you, soonest first</p>
            </div>
            <Link to="/tasks?view=my" className="btn btn-ghost btn-sm">
              View all
              <Icon name="arrowRight" size={15} />
            </Link>
          </div>

          {myTasks.length === 0 ? (
            <EmptyState
              compact
              icon="clipboard"
              title="Nothing assigned yet"
              description="Pick up a task from a team board or ask a teammate to assign you one."
              action={
                <Link to="/tasks" className="btn btn-secondary btn-sm">
                  Open task board
                </Link>
              }
            />
          ) : (
            <ul className="focus-list">
              {myTasks.map((task) => (
                <li className="focus-item" key={task._id}>
                  <button
                    type="button"
                    className={`check-toggle ${
                      task.status === "done" ? "check-toggle--on" : ""
                    }`}
                    onClick={() => toggleStatus(task)}
                    disabled={updating === task._id}
                    aria-label={
                      task.status === "done"
                        ? `Reopen ${task.title}`
                        : `Complete ${task.title}`
                    }
                  >
                    {task.status === "done" && (
                      <Icon name="check" size={13} strokeWidth={2.6} />
                    )}
                  </button>

                  <div className="focus-main">
                    <Link
                      to={`/tasks?team=${task.team?._id || task.team || ""}`}
                      className={`focus-title ${
                        task.status === "done" ? "focus-title--done" : ""
                      }`}
                    >
                      {task.title}
                    </Link>
                    <div className="focus-meta">
                      <span className="team-tag">
                        <Icon name="layers" size={13} />
                        {task.team?.name || "Team"}
                      </span>
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>

                  {task.dueDate && (
                    <span
                      className={`due-pill ${
                        isOverdue(task) ? "due-pill--overdue" : ""
                      }`}
                    >
                      <Icon name="calendar" size={13} />
                      {dueLabel(task.dueDate)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="dash-side">
          <section className="panel completion-panel">
            <div className="completion-ring-wrap">
              <div
                className="completion-ring"
                style={{
                  background: `conic-gradient(#6d5efc 0% ${
                    stats.completionRate || 0
                  }%, #e9e9f7 ${stats.completionRate || 0}% 100%)`,
                }}
              >
                <div className="completion-ring-inner">
                  <strong>{stats.completionRate || 0}%</strong>
                  <span>complete</span>
                </div>
              </div>
              <div className="completion-copy">
                <h3>Workspace momentum</h3>
                <p>
                  {stats.done || 0} of {stats.total || 0} tasks are done across
                  your teams.
                </p>
                <div className="completion-legend">
                  <span>
                    <i className="dot dot--done" /> Done {stats.done || 0}
                  </span>
                  <span>
                    <i className="dot dot--progress" /> Active{" "}
                    {(stats.inProgress || 0) + (stats.review || 0)}
                  </span>
                  <span>
                    <i className="dot dot--todo" /> To do {stats.todo || 0}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Team progress</h2>
                <p>Completed work per workspace</p>
              </div>
              <Link to="/teams" className="icon-btn" aria-label="Open teams">
                <Icon name="arrowUpRight" size={16} />
              </Link>
            </div>

            {perTeam.length === 0 ? (
              <EmptyState
                compact
                icon="users"
                title="No teams yet"
                description="Create your first team to start planning work."
                action={
                  <Link to="/teams" className="btn btn-primary btn-sm">
                    Create team
                  </Link>
                }
              />
            ) : (
              <ul className="progress-list">
                {perTeam.map((team) => (
                  <li key={team._id}>
                    <Link to={`/teams/${team._id}`} className="progress-item">
                      <div className="progress-head">
                        <span>{team.name}</span>
                        <strong>{team.progress}%</strong>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${team.progress}%` }} />
                      </div>
                      <div className="progress-meta">
                        <span>{team.open} open</span>
                        <span>{team.done} done</span>
                        <span>{team.total} total</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <div className="dash-grid dash-grid--even">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent activity</h2>
              <p>Latest updates across your teams</p>
            </div>
            <Link to="/tasks" className="btn btn-ghost btn-sm">
              Board
              <Icon name="chevronRight" size={15} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              compact
              icon="history"
              title="No activity yet"
              description="Create a task to get things moving."
            />
          ) : (
            <ul className="activity-list">
              {recent.map((task) => {
                const assignee =
                  task.assignedTo && typeof task.assignedTo === "object"
                    ? task.assignedTo
                    : null;
                return (
                  <li className="activity-item" key={task._id}>
                    {assignee ? (
                      <Avatar name={assignee.name} size="sm" />
                    ) : (
                      <span className="activity-dot" />
                    )}
                    <div className="activity-main">
                      <span className="activity-text">
                        <strong>{task.title}</strong>
                      </span>
                      <span className="activity-meta">
                        {assignee ? `${assignee.name} · ` : "Unassigned · "}
                        {task.team?.name || "Team"} ·{" "}
                        {formatDateTime(task.updatedAt || task.createdAt)}
                      </span>
                    </div>
                    <StatusBadge status={task.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Quick actions</h2>
              <p>Jump straight into your workspace</p>
            </div>
          </div>
          <div className="quick-grid">
            <button
              type="button"
              className="quick-action"
              onClick={() => navigate("/tasks?new=1")}
            >
              <span className="quick-icon quick-icon--violet">
                <Icon name="plus" size={18} />
              </span>
              <span>
                <strong>Create a task</strong>
                <small>Add work to a team board</small>
              </span>
            </button>
            <button
              type="button"
              className="quick-action"
              onClick={() => navigate("/teams")}
            >
              <span className="quick-icon quick-icon--blue">
                <Icon name="users" size={18} />
              </span>
              <span>
                <strong>Invite teammates</strong>
                <small>Share a team invite code</small>
              </span>
            </button>
            <button
              type="button"
              className="quick-action"
              onClick={() => navigate("/tasks?view=my")}
            >
              <span className="quick-icon quick-icon--green">
                <Icon name="target" size={18} />
              </span>
              <span>
                <strong>My tasks</strong>
                <small>See everything assigned to you</small>
              </span>
            </button>
            <button
              type="button"
              className="quick-action"
              onClick={() => navigate("/profile")}
            >
              <span className="quick-icon quick-icon--amber">
                <Icon name="user" size={18} />
              </span>
              <span>
                <strong>Profile settings</strong>
                <small>Update your name or password</small>
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import Modal from "../components/Modal";
import CopyButton from "../components/CopyButton";
import EmptyState from "../components/EmptyState";
import { RoleBadge, StatusBadge, PriorityBadge } from "../components/Badge";
import { SkeletonCard } from "../components/Loader";
import { useToast } from "../components/Toast";
import {
  dueLabel,
  formatDate,
  getErrorMessage,
  isOverdue,
  taskAssigneeName,
} from "../utils/format";

const STATUS_ORDER = ["todo", "in-progress", "review", "done"];
const STATUS_LABELS = {
  todo: "To do",
  "in-progress": "In progress",
  review: "In review",
  done: "Done",
};

export default function TeamDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [teamRes, tasksRes] = await Promise.all([
        api.get(`/teams/${id}`),
        api.get("/tasks", { params: { team: id, limit: 200 } }),
      ]);
      setTeam(teamRes.data);
      setTasks(tasksRes.data.tasks || tasksRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this team"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const isOwner = useMemo(() => {
    if (!team?.owner) return false;
    return (team.owner._id || team.owner) === user?._id;
  }, [team, user]);

  const counts = useMemo(() => {
    const result = { todo: 0, "in-progress": 0, review: 0, done: 0 };
    tasks.forEach((task) => {
      if (result[task.status] !== undefined) result[task.status] += 1;
    });
    return result;
  }, [tasks]);

  const completion = tasks.length
    ? Math.round((counts.done / tasks.length) * 100)
    : 0;

  const openEdit = () => {
    setEditForm({ name: team.name, description: team.description || "" });
    setFormError("");
    setEditOpen(true);
  };

  const handleEdit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const res = await api.put(`/teams/${id}`, editForm);
      setTeam(res.data);
      toast.success("Team updated");
      setEditOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not update the team"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/teams/${id}`);
      toast.success("Team and its tasks were deleted");
      navigate("/teams");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the team"));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-stack">
        <span className="skeleton skeleton-line skeleton-line--short" />
        <div className="detail-hero detail-hero--loading" />
        <div className="stat-grid">
          {[0, 1, 2, 3].map((index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="page-stack">
        <Link to="/teams" className="back-link">
          <Icon name="chevronLeft" size={16} /> Back to teams
        </Link>
        <div className="panel">
          <EmptyState
            icon="alert"
            title="Team not available"
            description={error || "This team may have been removed."}
            action={
              <Link to="/teams" className="btn btn-primary">
                View all teams
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const members = team.members || [];
  const stats = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: counts[status],
  }));

  return (
    <div className="page-stack">
      <Link to="/teams" className="back-link">
        <Icon name="chevronLeft" size={16} /> Back to teams
      </Link>

      <section className="detail-hero">
        <span className="detail-hero-glow" aria-hidden="true" />
        <div className="detail-hero-main">
          <div className="detail-hero-icon">
            <Icon name="users" size={26} />
          </div>
          <div>
            <div className="detail-hero-badges">
              {isOwner && (
                <span className="badge badge--glass">
                  <Icon name="shield" size={12} /> Owner
                </span>
              )}
              <span className="badge badge--glass">
                <Icon name="users" size={12} /> {members.length} members
              </span>
              <span className="badge badge--glass">
                <Icon name="board" size={12} /> {tasks.length} tasks
              </span>
            </div>
            <h1>{team.name}</h1>
            <p>{team.description || "No description added yet."}</p>
            <div className="detail-hero-meta">
              <span>
                <Icon name="calendar" size={14} /> Created{" "}
                {formatDate(team.createdAt)}
              </span>
              <span>
                <Icon name="link" size={14} /> Invite code{" "}
                <code>{team.inviteCode}</code>
              </span>
            </div>
          </div>
        </div>

        <div className="detail-hero-actions">
          <CopyButton
            value={team.inviteCode}
            label="Copy invite"
            className="btn btn-glass"
            copiedLabel="Copied"
          />
          <Link to={`/tasks?team=${team._id}`} className="btn btn-light">
            <Icon name="board" size={16} />
            Open board
          </Link>
          {isOwner && (
            <>
              <button type="button" className="icon-btn icon-btn--glass" onClick={openEdit} title="Edit team">
                <Icon name="edit" size={17} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--glass icon-btn--danger"
                onClick={() => setDeleteOpen(true)}
                title="Delete team"
              >
                <Icon name="trash" size={17} />
              </button>
            </>
          )}
        </div>
      </section>

      <section className="stat-grid" aria-label="Task summary">
        {stats.map((stat) => (
          <article className={`stat-card stat-card--${stat.status}`} key={stat.status}>
            <span className={`stat-icon stat-icon--${stat.status}`}>
              <Icon
                name={
                  stat.status === "done"
                    ? "checkCircle"
                    : stat.status === "review"
                    ? "eye"
                    : stat.status === "in-progress"
                    ? "clock"
                    : "clipboard"
                }
                size={19}
              />
            </span>
            <div className="stat-content">
              <strong className="stat-value">{stat.count}</strong>
              <span className="stat-label">{stat.label}</span>
            </div>
          </article>
        ))}
      </section>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Completion</h2>
              <p>{tasks.length} tasks in this workspace</p>
            </div>
            <strong className="panel-big-value">{completion}%</strong>
          </div>
          <div className="progress progress--lg">
            <span style={{ width: `${completion}%` }} />
          </div>
          <div className="completion-legend">
            <span>
              <i className="dot dot--done" /> {counts.done} done
            </span>
            <span>
              <i className="dot dot--progress" /> {counts["in-progress"]} in progress
            </span>
            <span>
              <i className="dot dot--review" /> {counts.review} in review
            </span>
            <span>
              <i className="dot dot--todo" /> {counts.todo} to do
            </span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Members</h2>
              <p>Everyone with access to this team</p>
            </div>
            <CopyButton
              value={team.inviteCode}
              label="Invite"
              className="btn btn-ghost btn-sm"
              copiedLabel="Code copied"
            />
          </div>
          <ul className="member-grid">
            {members.map((member) => {
              const memberUser = member.user || {};
              const memberIsOwner =
                (memberUser._id || member.user) === (team.owner?._id || team.owner);
              return (
                <li className="member-card" key={memberUser._id || member.user}>
                  <Avatar name={memberUser.name} size="md" />
                  <div className="member-card-info">
                    <strong>{memberUser.name || "Unknown user"}</strong>
                    <span>{memberUser.email || "No email"}</span>
                  </div>
                  <div className="member-card-badges">
                    {memberIsOwner ? (
                      <span className="badge badge--owner">
                        <Icon name="shield" size={12} /> Owner
                      </span>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Tasks</h2>
            <p>Recent work in this team</p>
          </div>
          <Link to={`/tasks?team=${team._id}`} className="btn btn-secondary btn-sm">
            Manage tasks
            <Icon name="arrowRight" size={15} />
          </Link>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            compact
            icon="board"
            title="No tasks in this team yet"
            description="Open the board to create the first task."
            action={
              <Link to={`/tasks?team=${team._id}&new=1`} className="btn btn-primary btn-sm">
                <Icon name="plus" size={15} /> Create task
              </Link>
            }
          />
        ) : (
          <ul className="team-task-list">
            {tasks.slice(0, 8).map((task) => (
              <li className="team-task-row" key={task._id}>
                <span className={`priority-bar priority-bar--${task.priority}`} />
                <div className="team-task-main">
                  <Link to={`/tasks?team=${team._id}`} className="team-task-title">
                    {task.title}
                  </Link>
                  <div className="team-task-meta">
                    {taskAssigneeName(task) ? (
                      <span>
                        <Icon name="user" size={13} /> {taskAssigneeName(task)}
                      </span>
                    ) : (
                      <span>
                        <Icon name="user" size={13} /> Unassigned
                      </span>
                    )}
                    {task.dueDate && (
                      <span className={isOverdue(task) ? "text-danger" : ""}>
                        <Icon name="calendar" size={13} /> {dueLabel(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit team"
        subtitle="Owners can rename the team or update its description."
        icon="edit"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="edit-team-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="edit-team-form" className="form-stack" onSubmit={handleEdit}>
          {formError && (
            <div className="alert alert--error">
              <Icon name="alert" size={16} />
              <span>{formError}</span>
            </div>
          )}
          <div className="form-field">
            <label htmlFor="edit-team-name">Team name</label>
            <input
              id="edit-team-name"
              className="input"
              value={editForm.name}
              onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-team-description">Description</label>
            <textarea
              id="edit-team-description"
              className="input textarea"
              rows={3}
              value={editForm.description}
              onChange={(event) =>
                setEditForm({ ...editForm, description: event.target.value })
              }
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this team?"
        subtitle="This permanently removes the team and every task inside it."
        icon="alert"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(false)}>
              Keep team
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete team"}
            </button>
          </>
        }
      >
        <div className="danger-note">
          <Icon name="alert" size={17} />
          <p>
            <strong>{team.name}</strong> and its {tasks.length} tasks will be
            deleted. This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}

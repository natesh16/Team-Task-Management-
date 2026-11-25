import React, { useState } from "react";
import api from "../services/api";
import Modal from "./Modal";
import Icon from "./Icon";
import { PriorityBadge, StatusBadge } from "./Badge";
import { useToast } from "./Toast";
import { formatDateTime, getErrorMessage, taskAssigneeName } from "../utils/format";

export default function TaskDetailModal({
  task,
  teamTasks = [],
  isAdmin = false,
  onClose,
  onUpdated,
}) {
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [depTaskId, setDepTaskId] = useState("");
  const [depType, setDepType] = useState("blocks");
  const [busy, setBusy] = useState(false);

  if (!task) return null;

  const subtasks = task.subtasks || [];
  const completedSubs = subtasks.filter((s) => s.completed).length;
  const subPct = subtasks.length
    ? Math.round((completedSubs / subtasks.length) * 100)
    : 0;

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    setBusy(true);
    try {
      const res = await api.post(`/tasks/${task._id}/subtasks`, {
        title: subtaskTitle.trim(),
      });
      setSubtaskTitle("");
      onUpdated(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not add subtask"));
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSubtask = async (sub) => {
    try {
      const res = await api.patch(`/tasks/${task._id}/subtasks/${sub._id}`, {
        completed: !sub.completed,
      });
      onUpdated(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update subtask"));
    }
  };

  const handleDeleteSubtask = async (subId) => {
    try {
      const res = await api.delete(`/tasks/${task._id}/subtasks/${subId}`);
      onUpdated(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete subtask"));
    }
  };

  const handleAddDependency = async (e) => {
    e.preventDefault();
    if (!depTaskId) return;
    setBusy(true);
    try {
      const res = await api.post(`/tasks/${task._id}/dependencies`, {
        targetTaskId: depTaskId,
        type: depType,
      });
      setDepTaskId("");
      toast.success("Dependency linked");
      onUpdated(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not add dependency"));
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveDependency = async (targetId) => {
    try {
      const res = await api.delete(
        `/tasks/${task._id}/dependencies/${targetId}`
      );
      onUpdated(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not remove dependency"));
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setBusy(true);
    try {
      const res = await api.post(`/tasks/${task._id}/comments`, {
        body: commentBody.trim(),
      });
      setCommentBody("");
      onUpdated(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not post comment"));
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    try {
      await api.patch(`/tasks/${task._id}/archive`, { archived: true });
      toast.success("Task archived");
      onClose(true);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not archive task"));
    }
  };

  const otherTasks = teamTasks.filter((t) => t._id !== task._id);

  return (
    <Modal
      open={!!task}
      onClose={() => onClose(false)}
      title={task.taskKey ? `${task.taskKey} · ${task.title}` : task.title}
      size="lg"
    >
      <div className="modal-tabs">
        {[
          { id: "overview", label: "Overview" },
          { id: "subtasks", label: `Subtasks (${completedSubs}/${subtasks.length})` },
          {
            id: "dependencies",
            label: `Dependencies (${(task.dependencies || []).length})`,
          },
          { id: "comments", label: `Comments (${(task.comments || []).length})` },
          { id: "activity", label: "Activity" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`modal-tab ${tab === item.id ? "modal-tab--active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="form-stack">
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <StatusBadge status={task.status} withIcon />
            <PriorityBadge priority={task.priority} />
            {(task.labels || []).map((lbl) => (
              <span key={lbl} className="label-chip">
                <Icon name="tag" size={11} /> {lbl}
              </span>
            ))}
          </div>
          {task.description && <p>{task.description}</p>}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
              fontSize: "0.86rem",
            }}
          >
            <div>
              <strong>Assignee:</strong> {taskAssigneeName(task)}
            </div>
            <div>
              <strong>Estimated:</strong> {task.estimatedMinutes || 0} min
            </div>
            <div>
              <strong>Actual logged:</strong> {task.actualMinutes || 0} min
            </div>
          </div>
          {isAdmin && (
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleArchive}
              >
                <Icon name="archive" size={15} /> Archive task
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "subtasks" && (
        <div className="form-stack">
          {subtasks.length > 0 && (
            <div className="subtask-bar">
              <span>{subPct}% complete</span>
              <div className="subtask-track">
                <div className="subtask-fill" style={{ width: `${subPct}%` }} />
              </div>
            </div>
          )}
          <form
            onSubmit={handleAddSubtask}
            style={{ display: "flex", gap: "0.5rem" }}
          >
            <input
              type="text"
              className="input"
              placeholder="Add a subtask..."
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              Add
            </button>
          </form>
          <div className="check-list">
            {subtasks.map((sub) => (
              <div className="check-row" key={sub._id}>
                <input
                  type="checkbox"
                  checked={!!sub.completed}
                  onChange={() => handleToggleSubtask(sub)}
                />
                <span
                  className={`check-row-title ${
                    sub.completed ? "check-row-title--done" : ""
                  }`}
                >
                  {sub.title}
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={() => handleDeleteSubtask(sub._id)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "dependencies" && (
        <div className="form-stack">
          <form
            onSubmit={handleAddDependency}
            style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
          >
            <select
              className="input"
              style={{ flex: "0 0 150px" }}
              value={depType}
              onChange={(e) => setDepType(e.target.value)}
            >
              <option value="blocks">Blocks</option>
              <option value="blocked_by">Blocked by</option>
              <option value="relates_to">Relates to</option>
            </select>
            <select
              className="input"
              style={{ flex: 1 }}
              value={depTaskId}
              onChange={(e) => setDepTaskId(e.target.value)}
            >
              <option value="">Select target task...</option>
              {otherTasks.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.taskKey ? `${t.taskKey} · ` : ""}
                  {t.title}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              Link
            </button>
          </form>
          <div className="check-list">
            {(task.dependencies || []).map((dep, idx) => (
              <div className="check-row" key={`${dep.task?._id || dep.task}-${idx}`}>
                <span className="badge badge--neutral">{dep.type}</span>
                <span style={{ flex: 1 }}>
                  {dep.task?.taskKey ? `${dep.task.taskKey} · ` : ""}
                  {dep.task?.title || "Linked task"}
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={() => handleRemoveDependency(dep.task?._id || dep.task)}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "comments" && (
        <div className="form-stack">
          <form
            onSubmit={handleAddComment}
            style={{ display: "flex", gap: "0.5rem" }}
          >
            <input
              type="text"
              className="input"
              placeholder="Write a comment..."
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              Post
            </button>
          </form>
          <div className="check-list">
            {(task.comments || [])
              .slice()
              .reverse()
              .map((c) => (
                <div className="check-row" key={c._id} style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <strong>{c.author?.name || "Teammate"}</strong>
                    <p style={{ fontSize: "0.86rem", marginTop: "0.15rem" }}>
                      {c.body}
                    </p>
                    <small className="muted">{formatDateTime(c.createdAt)}</small>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="check-list">
          {(task.activityHistory || [])
            .slice()
            .reverse()
            .map((a, idx) => (
              <div className="check-row" key={idx}>
                <span className="badge badge--neutral">{a.action}</span>
                <div style={{ flex: 1 }}>
                  <span>{a.details}</span>
                  <div className="muted" style={{ fontSize: "0.75rem" }}>
                    {a.actor?.name || "System"} · {formatDateTime(a.createdAt)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </Modal>
  );
}

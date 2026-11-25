import React, { useEffect, useState } from "react";
import api from "../services/api";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { formatDateTime, getErrorMessage } from "../utils/format";

export default function Automations() {
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger: "task_status_changed",
    conditionStatus: "review",
    actionType: "notify_team_owner",
    message: "",
  });

  const loadRules = async (teamId) => {
    if (!teamId) return;
    try {
      const res = await api.get("/automations", { params: { team: teamId } });
      setRules(res.data.rules || []);
      setLogs(res.data.logs || []);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load automation rules"));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/teams");
        const list = res.data || [];
        setTeams(list);
        if (list.length) {
          setSelectedTeam(list[0]._id);
          await loadRules(list[0]._id);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load teams"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/automations", {
        name: form.name,
        team: selectedTeam,
        trigger: form.trigger,
        condition:
          form.trigger === "task_status_changed" && form.conditionStatus
            ? { status: form.conditionStatus }
            : {},
        action: { type: form.actionType, message: form.message },
      });
      toast.success("Automation rule created");
      setModalOpen(false);
      setForm({
        name: "",
        trigger: "task_status_changed",
        conditionStatus: "review",
        actionType: "notify_team_owner",
        message: "",
      });
      await loadRules(selectedTeam);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not create automation rule"));
    }
  };

  const handleToggle = async (rule) => {
    try {
      await api.patch(`/automations/${rule._id}/toggle`);
      await loadRules(selectedTeam);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not toggle rule"));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/automations/${id}`);
      toast.success("Rule removed");
      await loadRules(selectedTeam);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete rule"));
    }
  };

  if (loading) return <Loader label="Loading automations..." />;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Workflow Engine</span>
          <h1>Automations</h1>
          <p className="page-subtitle">
            Configure WHEN–THEN rules with loop prevention and execution logs.
          </p>
        </div>
        <div className="page-actions">
          <div className="team-select">
            <Icon name="users" size={16} />
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                loadRules(e.target.value);
              }}
            >
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
            disabled={!selectedTeam}
          >
            <Icon name="plus" size={16} /> New rule
          </button>
        </div>
      </header>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Active Rules</h2>
              <p>Rules run automatically when matching task events occur</p>
            </div>
          </div>
          {rules.length === 0 ? (
            <EmptyState
              compact
              icon="zap"
              title="No automation rules yet"
              description="Create a rule like: WHEN task moves to Review, THEN notify team owner."
            />
          ) : (
            <div className="check-list">
              {rules.map((r) => (
                <div className="check-row" key={r._id}>
                  <div style={{ flex: 1 }}>
                    <strong>{r.name}</strong>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      WHEN <code>{r.trigger}</code>
                      {r.condition?.status ? ` (${r.condition.status})` : ""} →{" "}
                      <code>{r.action?.type}</code> · Runs: {r.executionCount}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      r.enabled ? "btn-primary" : "btn-secondary"
                    }`}
                    onClick={() => handleToggle(r)}
                  >
                    {r.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => handleDelete(r._id)}
                    title="Delete rule"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Execution History</h2>
              <p>Recent rule runs and outcomes</p>
            </div>
          </div>
          {logs.length === 0 ? (
            <EmptyState
              compact
              icon="clock"
              title="No executions yet"
              description="Execution logs will appear here once rules trigger."
            />
          ) : (
            <div className="check-list">
              {logs.map((log) => (
                <div className="check-row" key={log._id}>
                  <span
                    className={`badge ${
                      log.status === "success"
                        ? "badge--done"
                        : log.status === "failed"
                        ? "badge--high"
                        : "badge--neutral"
                    }`}
                  >
                    {log.status}
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong>{log.rule?.name || log.trigger}</strong>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      {log.message} · {formatDateTime(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create automation rule"
      >
        <form className="form-stack" onSubmit={handleCreate}>
          <div className="field">
            <label>Rule name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Notify owner when task moves to Review"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label>WHEN (Trigger)</label>
            <select
              className="input"
              value={form.trigger}
              onChange={(e) =>
                setForm((f) => ({ ...f, trigger: e.target.value }))
              }
            >
              <option value="task_status_changed">Task status changes</option>
              <option value="subtasks_all_completed">All subtasks completed</option>
              <option value="task_completed">Task is completed (Done)</option>
              <option value="dependency_completed">Blocking task is completed</option>
            </select>
          </div>
          {form.trigger === "task_status_changed" && (
            <div className="field">
              <label>Target status</label>
              <select
                className="input"
                value={form.conditionStatus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, conditionStatus: e.target.value }))
                }
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="review">In review</option>
                <option value="done">Done</option>
              </select>
            </div>
          )}
          <div className="field">
            <label>THEN (Action)</label>
            <select
              className="input"
              value={form.actionType}
              onChange={(e) =>
                setForm((f) => ({ ...f, actionType: e.target.value }))
              }
            >
              <option value="notify_team_owner">Notify team owner</option>
              <option value="notify_assignee">Notify task assignee</option>
              <option value="notify_blocked_owners">
                Notify blocked task owners
              </option>
              <option value="suggest_complete">
                Suggest completing parent task
              </option>
              <option value="create_recurring">
                Generate next recurring task
              </option>
            </select>
          </div>
          <div className="field">
            <label>Custom message (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="Optional notification text"
              value={form.message}
              onChange={(e) =>
                setForm((f) => ({ ...f, message: e.target.value }))
              }
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

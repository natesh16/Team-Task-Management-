import React, { useEffect, useState } from "react";
import api from "../services/api";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import { useToast } from "../components/Toast";
import { formatDateTime, getErrorMessage } from "../utils/format";

function formatClock(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hrs > 0
    ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
    : `${pad(mins)}:${pad(secs)}`;
}

export default function TimeTracking() {
  const toast = useToast();
  const [active, setActive] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("pomodoro");
  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [description, setDescription] = useState("");

  const [manualForm, setManualForm] = useState({
    taskId: "",
    durationMinutes: 30,
    description: "",
  });
  const [savingManual, setSavingManual] = useState(false);

  const loadAll = async () => {
    try {
      const [activeRes, entriesRes, summaryRes, tasksRes] = await Promise.all([
        api.get("/time/active"),
        api.get("/time/entries", { params: { limit: 30 } }),
        api.get("/time/summary", { params: { days: 7 } }),
        api.get("/tasks/my-tasks", { params: { limit: 100 } }),
      ]);
      const act = activeRes.data.active;
      setActive(act);
      setElapsed(act ? act.elapsedSeconds || 0 : 0);
      setEntries(entriesRes.data || []);
      setSummary(summaryRes.data || null);
      setMyTasks(tasksRes.data.tasks || []);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load time tracking"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!active || active.isPaused) return undefined;
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  const handleStart = async () => {
    try {
      const res = await api.post("/time/start", {
        taskId: selectedTaskId || null,
        mode,
        phase: "focus",
        plannedMinutes: mode === "pomodoro" ? Number(plannedMinutes) : 0,
        description,
      });
      setActive(res.data);
      setElapsed(0);
      toast.success(mode === "pomodoro" ? "Pomodoro started" : "Stopwatch started");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not start timer"));
    }
  };

  const handlePause = async () => {
    if (!active) return;
    try {
      const res = await api.patch(`/time/${active._id}/pause`);
      setActive(res.data);
      setElapsed(res.data.elapsedSeconds || elapsed);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not pause timer"));
    }
  };

  const handleResume = async () => {
    if (!active) return;
    try {
      const res = await api.patch(`/time/${active._id}/resume`);
      setActive(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not resume timer"));
    }
  };

  const handleStop = async () => {
    if (!active) return;
    const completedPomodoro =
      active.mode === "pomodoro" &&
      elapsed >= (active.plannedMinutes || 25) * 60;
    try {
      await api.patch(`/time/${active._id}/stop`, { completedPomodoro });
      setActive(null);
      setElapsed(0);
      toast.success("Time entry saved");
      await loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not stop timer"));
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSavingManual(true);
    try {
      await api.post("/time/manual", {
        taskId: manualForm.taskId || null,
        durationMinutes: Number(manualForm.durationMinutes),
        description: manualForm.description,
      });
      setManualForm({ taskId: "", durationMinutes: 30, description: "" });
      toast.success("Manual time logged");
      await loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not log manual time"));
    } finally {
      setSavingManual(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    try {
      await api.delete(`/time/entries/${id}`);
      toast.success("Entry removed");
      await loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete entry"));
    }
  };

  if (loading) return <Loader label="Loading time tracker..." />;

  const displaySeconds =
    active && active.mode === "pomodoro"
      ? Math.max(0, (active.plannedMinutes || 25) * 60 - elapsed)
      : elapsed;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Productivity</span>
          <h1>Time Tracking & Pomodoro</h1>
          <p className="page-subtitle">
            Server-persisted focus sessions, stopwatch, and manual time logs.
          </p>
        </div>
      </header>

      <section className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon stat-icon--violet">
            <Icon name="clock" size={20} />
          </span>
          <div className="stat-content">
            <strong className="stat-value">{summary?.todayMinutes || 0}m</strong>
            <span className="stat-label">Focus today</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon--blue">
            <Icon name="barChart" size={20} />
          </span>
          <div className="stat-content">
            <strong className="stat-value">{summary?.weeklyMinutes || 0}m</strong>
            <span className="stat-label">Last 7 days</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon--green">
            <Icon name="checkCircle" size={20} />
          </span>
          <div className="stat-content">
            <strong className="stat-value">
              {summary?.completedPomodoros || 0}
            </strong>
            <span className="stat-label">Completed Pomodoros</span>
          </div>
        </article>
      </section>

      <div className="dash-grid">
        <section className="panel timer-hero">
          {!active ? (
            <>
              <div className="tabs">
                <button
                  type="button"
                  className={`tab ${mode === "pomodoro" ? "tab--active" : ""}`}
                  onClick={() => setMode("pomodoro")}
                >
                  Pomodoro
                </button>
                <button
                  type="button"
                  className={`tab ${mode === "stopwatch" ? "tab--active" : ""}`}
                  onClick={() => setMode("stopwatch")}
                >
                  Stopwatch
                </button>
              </div>
              <div className="timer-clock">
                {mode === "pomodoro"
                  ? formatClock((Number(plannedMinutes) || 25) * 60)
                  : "00:00"}
              </div>
              <div
                style={{
                  display: "grid",
                  gap: "0.65rem",
                  width: "100%",
                  maxWidth: "380px",
                }}
              >
                {mode === "pomodoro" && (
                  <select
                    className="input"
                    value={plannedMinutes}
                    onChange={(e) => setPlannedMinutes(Number(e.target.value))}
                  >
                    <option value={25}>25 min — Standard Focus</option>
                    <option value={50}>50 min — Deep Work</option>
                    <option value={15}>15 min — Quick Sprint</option>
                  </select>
                )}
                <select
                  className="input"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                >
                  <option value="">No task linked (general focus)</option>
                  {myTasks.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.taskKey ? `${t.taskKey} · ` : ""}
                      {t.title}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="input"
                  placeholder="What are you working on?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStart}
              >
                <Icon name="play" size={16} /> Start{" "}
                {mode === "pomodoro" ? "Pomodoro" : "Stopwatch"}
              </button>
            </>
          ) : (
            <>
              <span className="badge badge--progress">
                {active.mode === "pomodoro" ? "Pomodoro Focus" : "Stopwatch"}{" "}
                {active.isPaused ? "· Paused" : "· Running"}
              </span>
              <div className="timer-clock">{formatClock(displaySeconds)}</div>
              <p className="muted">
                {active.task
                  ? `Task: ${active.task.taskKey || ""} ${active.task.title}`
                  : active.description || "General focus session"}
              </p>
              <div className="timer-controls">
                {active.isPaused ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleResume}
                  >
                    <Icon name="play" size={16} /> Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handlePause}
                  >
                    <Icon name="pause" size={16} /> Pause
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleStop}
                >
                  <Icon name="stop" size={16} /> Finish & Save
                </button>
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Manual Time Entry</h2>
              <p>Log offline work or meetings against a task</p>
            </div>
          </div>
          <form className="form-stack" onSubmit={handleManualSubmit}>
            <div className="field">
              <label>Task (optional)</label>
              <select
                className="input"
                value={manualForm.taskId}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, taskId: e.target.value }))
                }
              >
                <option value="">General / no task</option>
                {myTasks.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.taskKey ? `${t.taskKey} · ` : ""}
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Duration (minutes)</label>
              <input
                type="number"
                min="1"
                className="input"
                value={manualForm.durationMinutes}
                onChange={(e) =>
                  setManualForm((f) => ({
                    ...f,
                    durationMinutes: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label>Notes</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., API review & bug fixes"
                value={manualForm.description}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingManual}
            >
              {savingManual ? "Saving..." : "Log time"}
            </button>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Recent Time Logs</h2>
            <p>Your completed focus, stopwatch, and manual entries</p>
          </div>
        </div>
        {entries.length === 0 ? (
          <EmptyState
            compact
            icon="clock"
            title="No time logged yet"
            description="Start a Pomodoro session or log manual time above."
          />
        ) : (
          <div className="check-list">
            {entries.map((entry) => (
              <div className="check-row" key={entry._id}>
                <span className="badge badge--neutral">{entry.mode}</span>
                <div style={{ flex: 1 }}>
                  <strong>
                    {entry.task
                      ? `${entry.task.taskKey || ""} ${entry.task.title}`
                      : entry.description || "Focus session"}
                  </strong>
                  <div className="muted" style={{ fontSize: "0.78rem" }}>
                    {formatDateTime(entry.startedAt)}
                    {entry.description && entry.task
                      ? ` · ${entry.description}`
                      : ""}
                  </div>
                </div>
                <strong>{entry.durationMinutes || 0}m</strong>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => handleDeleteEntry(entry._id)}
                  title="Delete entry"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

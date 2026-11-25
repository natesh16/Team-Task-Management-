import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Icon from "../components/Icon";
import { PriorityBadge, StatusBadge } from "../components/Badge";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { formatDate, getErrorMessage, taskAssigneeName } from "../utils/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [activeTask, setActiveTask] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/teams");
        const list = res.data || [];
        setTeams(list);
        if (list.length) setSelectedTeam(list[0]._id);
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load teams"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedTeam) return;
    (async () => {
      try {
        const res = await api.get("/tasks", {
          params: { team: selectedTeam, limit: 200 },
        });
        setTasks(res.data.tasks || res.data || []);
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load tasks"));
      }
    })();
  }, [selectedTeam]);

  const calendarDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);

    const days = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const tasksByDate = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = new Date(task.dueDate).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    }
    return map;
  }, [tasks]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  if (loading) {
    return <Loader label="Loading calendar..." />;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Planning</span>
          <h1>Calendar</h1>
          <p className="page-subtitle">
            Scheduled tasks across your team — synced live with the Kanban board.
          </p>
        </div>
        <div className="page-actions">
          <div className="team-select">
            <Icon name="users" size={16} />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              aria-label="Select team"
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
            className="btn btn-secondary btn-sm"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const now = new Date();
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </header>

      <div className="panel" style={{ padding: "1rem" }}>
        <div className="panel-head" style={{ marginBottom: "0.75rem" }}>
          <h2>{monthLabel}</h2>
          <Link to={`/tasks?team=${selectedTeam}`} className="btn btn-ghost btn-sm">
            Open board <Icon name="arrowRight" size={14} />
          </Link>
        </div>

        {teams.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No team selected"
            description="Create or join a team to view scheduled tasks on the calendar."
          />
        ) : (
          <div className="calendar-grid">
            {WEEKDAYS.map((day) => (
              <div key={day} className="calendar-dow">
                {day}
              </div>
            ))}
            {calendarDays.map((day) => {
              const key = day.toISOString().slice(0, 10);
              const isCurrentMonth = day.getMonth() === cursor.getMonth();
              const isToday = key === todayKey;
              const dayTasks = tasksByDate.get(key) || [];
              return (
                <div
                  key={key}
                  className={`calendar-cell ${
                    !isCurrentMonth ? "calendar-cell--muted" : ""
                  } ${isToday ? "calendar-cell--today" : ""}`}
                >
                  <span className="calendar-day-num">{day.getDate()}</span>
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task._id}
                      type="button"
                      className={`calendar-event calendar-event--${task.priority}`}
                      onClick={() => setActiveTask(task)}
                      title={task.title}
                    >
                      {task.taskKey ? `${task.taskKey} · ` : ""}
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="muted" style={{ fontSize: "0.7rem" }}>
                      +{dayTasks.length - 3} more
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeTask && (
        <Modal
          open={!!activeTask}
          onClose={() => setActiveTask(null)}
          title={
            activeTask.taskKey
              ? `${activeTask.taskKey} · ${activeTask.title}`
              : activeTask.title
          }
        >
          <div className="form-stack">
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <StatusBadge status={activeTask.status} withIcon />
              <PriorityBadge priority={activeTask.priority} />
            </div>
            {activeTask.description && (
              <p className="muted">{activeTask.description}</p>
            )}
            <div style={{ fontSize: "0.86rem", display: "grid", gap: "0.4rem" }}>
              <div>
                <strong>Due date:</strong> {formatDate(activeTask.dueDate)}
              </div>
              <div>
                <strong>Assignee:</strong> {taskAssigneeName(activeTask)}
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveTask(null)}
              >
                Close
              </button>
              <Link
                to={`/tasks?team=${selectedTeam}`}
                className="btn btn-primary"
              >
                View on board
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

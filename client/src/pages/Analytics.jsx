import React, { useEffect, useState } from "react";
import api from "../services/api";
import Icon from "../components/Icon";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { getErrorMessage } from "../utils/format";

export default function Analytics() {
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (teamId = selectedTeam, windowDays = days) => {
    setLoading(true);
    try {
      const [teamsRes, analyticsRes] = await Promise.all([
        api.get("/teams"),
        api.get("/analytics/overview", {
          params: { team: teamId || undefined, days: windowDays },
        }),
      ]);
      setTeams(teamsRes.data || []);
      setData(analyticsRes.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load analytics"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("", 30);
  }, []);

  const handleExportCsv = async () => {
    try {
      const res = await api.get("/analytics/export", {
        params: { team: selectedTeam || undefined },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "taskmaster-report.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV report exported");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not export CSV"));
    }
  };

  if (loading && !data) return <Loader label="Computing analytics..." />;

  const kpis = data?.kpis || {};
  const statusBreakdown = data?.statusBreakdown || {};
  const workload = data?.workload || [];
  const totalTasks = Math.max(1, kpis.total || 0);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Intelligence</span>
          <h1>Analytics & Reports</h1>
          <p className="page-subtitle">
            Real-time metrics computed from actual task history and time logs.
          </p>
        </div>
        <div className="page-actions">
          <div className="team-select">
            <Icon name="users" size={16} />
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                load(e.target.value, days);
              }}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} />
          </div>
          <div className="team-select">
            <select
              value={days}
              onChange={(e) => {
                const next = Number(e.target.value);
                setDays(next);
                load(selectedTeam, next);
              }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Icon name="chevronDown" size={14} />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
          >
            <Icon name="download" size={16} /> Export CSV
          </button>
        </div>
      </header>

      <section className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon stat-icon--violet">
            <Icon name="tasks" size={20} />
          </span>
          <div className="stat-content">
            <strong className="stat-value">{kpis.total || 0}</strong>
            <span className="stat-label">Total tasks</span>
            <small className="stat-foot">
              {kpis.completionRate || 0}% completion rate
            </small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon--green">
            <Icon name="checkCircle" size={20} />
          </span>
          <div className="stat-content">
            <strong className="stat-value">{kpis.completed || 0}</strong>
            <span className="stat-label">Completed</span>
            <small className="stat-foot">{kpis.inProgress || 0} in progress</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon--blue">
            <Icon name="clock" size={20} />
          </span>
          <div className="stat-content">
            <strong className="stat-value">
              {kpis.avgCycleTimeHours !== null && kpis.avgCycleTimeHours !== undefined
                ? `${kpis.avgCycleTimeHours}h`
                : "N/A"}
            </strong>
            <span className="stat-label">Avg cycle time</span>
            <small className="stat-foot">
              {kpis.cycleTimeSampleSize
                ? `From ${kpis.cycleTimeSampleSize} completed task(s)`
                : "Needs completed tasks"}
            </small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon stat-icon--red">
            <Icon name="alert" size={20} />
          </span>
          <div className="stat-content">
            <strong className="stat-value">{kpis.overdue || 0}</strong>
            <span className="stat-label">Overdue</span>
            <small className="stat-foot">
              Lead time:{" "}
              {kpis.avgLeadTimeHours !== null && kpis.avgLeadTimeHours !== undefined
                ? `${kpis.avgLeadTimeHours}h`
                : "N/A"}
            </small>
          </div>
        </article>
      </section>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Workflow Distribution</h2>
              <p>Current tasks across Kanban stages</p>
            </div>
          </div>
          <div className="bar-list">
            {[
              { key: "backlog", label: "Backlog" },
              { key: "todo", label: "To do" },
              { key: "in-progress", label: "In progress" },
              { key: "review", label: "In review" },
              { key: "done", label: "Done" },
            ].map((stage) => {
              const count = statusBreakdown[stage.key] || 0;
              const pct = Math.round((count / totalTasks) * 100);
              return (
                <div className="bar-row" key={stage.key}>
                  <div className="bar-row-head">
                    <span>{stage.label}</span>
                    <span>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Estimated vs Actual Time</h2>
              <p>Tracked across all tasks in selected scope</p>
            </div>
          </div>
          <div className="bar-list">
            <div className="bar-row">
              <div className="bar-row-head">
                <span>Estimated Effort</span>
                <strong>{kpis.totalEstimatedMinutes || 0} min</strong>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: "100%" }} />
              </div>
            </div>
            <div className="bar-row">
              <div className="bar-row-head">
                <span>Actual Logged Effort</span>
                <strong>{kpis.totalActualMinutes || 0} min</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${
                      kpis.totalEstimatedMinutes
                        ? Math.min(
                            100,
                            Math.round(
                              (kpis.totalActualMinutes /
                                kpis.totalEstimatedMinutes) *
                                100
                            )
                          )
                        : 0
                    }%`,
                    background: "var(--green)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Team Workload</h2>
            <p>Open, completed, and overdue tasks per team member</p>
          </div>
        </div>
        {workload.length === 0 ? (
          <EmptyState
            compact
            icon="users"
            title="No workload data yet"
            description="Assign tasks to team members to see workload distribution."
          />
        ) : (
          <div className="check-list">
            {workload.map((member) => (
              <div className="check-row" key={member.userId}>
                <strong style={{ flex: 1 }}>{member.name}</strong>
                <span className="badge badge--todo">{member.open} open</span>
                <span className="badge badge--done">{member.done} done</span>
                {member.overdue > 0 && (
                  <span className="badge badge--high">
                    {member.overdue} overdue
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

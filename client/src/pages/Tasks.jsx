import { useState, useEffect } from "react";
import api from "../services/api";

export default function Tasks() {
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assignedTo: "",
    dueDate: "",
    assignmentReason: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [assignModal, setAssignModal] = useState(false);
  const [assignTaskId, setAssignTaskId] = useState(null);
  const [assignForm, setAssignForm] = useState({
    assignedTo: "",
    reason: "",
  });
  const [historyModal, setHistoryModal] = useState(false);
  const [historyTask, setHistoryTask] = useState(null);
  const [activeTab, setActiveTab] = useState("team"); // "team" | "my"

  useEffect(() => {
    fetchTeams();
    fetchMyTasks();
  }, []);

  useEffect(() => {
    if (selectedTeam && activeTab === "team") {
      fetchTasks();
      fetchTeamMembers();
    }
  }, [selectedTeam, activeTab]);

  const fetchTeams = async () => {
    try {
      const res = await api.get("/teams");
      setTeams(res.data);
      if (res.data.length > 0 && !selectedTeam) {
        setSelectedTeam(res.data[0]._id);
      }
    } catch (err) {
      setError("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get(`/teams/${selectedTeam}`);
      setTeamMembers(res.data.members || []);
    } catch (err) {
      setError("Failed to load team members");
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get("/tasks", {
        params: { team: selectedTeam, page: 1, limit: 50 },
      });
      setTasks(res.data.tasks || res.data);
    } catch (err) {
      setError("Failed to load tasks");
    }
  };

  const fetchMyTasks = async () => {
    try {
      const res = await api.get("/tasks/my-tasks", {
        params: { page: 1, limit: 50 },
      });
      setMyTasks(res.data.tasks || res.data);
    } catch (err) {
      console.error("Failed to load my tasks", err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tasks", {
        ...form,
        team: selectedTeam,
        dueDate: form.dueDate || null,
        assignedTo: form.assignedTo || null,
      });
      setForm({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        assignedTo: "",
        dueDate: "",
        assignmentReason: "",
      });
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create task");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/tasks/${id}`, { status: newStatus });
      fetchTasks();
      fetchMyTasks();
    } catch (err) {
      setError("Failed to update task");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this task?")) {
      try {
        await api.delete(`/tasks/${id}`);
        fetchTasks();
        fetchMyTasks();
      } catch (err) {
        setError("Failed to delete task");
      }
    }
  };

  const openAssignModal = (taskId) => {
    setAssignTaskId(taskId);
    setAssignForm({ assignedTo: "", reason: "" });
    setAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/tasks/${assignTaskId}/assign`, {
        assignedTo: assignForm.assignedTo,
        reason: assignForm.reason || "Task assigned",
      });
      setAssignModal(false);
      fetchTasks();
      fetchMyTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign task");
    }
  };

  const handleUnassign = async (taskId) => {
    if (!window.confirm("Unassign this task?")) return;
    try {
      await api.patch(`/tasks/${taskId}/unassign`, {
        reason: "Task unassigned",
      });
      fetchTasks();
      fetchMyTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to unassign task");
    }
  };

  const openHistoryModal = (task) => {
    setHistoryTask(task);
    setHistoryModal(true);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const currentTasks = activeTab === "team" ? tasks : myTasks;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
            Manage team tasks and assignments
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className={`btn btn-outline ${activeTab === "team" ? "btn-primary" : ""}`}
            onClick={() => setActiveTab("team")}
          >
            Team Tasks
          </button>
          <button
            className={`btn btn-outline ${activeTab === "my" ? "btn-primary" : ""}`}
            onClick={() => setActiveTab("my")}
          >
            My Tasks
          </button>
        </div>
      </div>

      {activeTab === "team" && (
        <>
          <div className="form-group" style={{ display: "inline-block", marginBottom: "1rem" }}>
            <label>Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="form-control"
            >
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="card-header">
              <h3>Create New Task</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={form.status} onChange={handleChange}>
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select name="priority" value={form.priority} onChange={handleChange}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assign To</label>
                    <select
                      name="assignedTo"
                      value={form.assignedTo}
                      onChange={handleChange}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers
                        .filter((m) => m.user._id.toString() !== "null")
                        .map((m) => (
                          <option key={m.user._id} value={m.user._id}>
                            {m.user.name} ({m.role})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Assignment Reason</label>
                  <input
                    type="text"
                    name="assignmentReason"
                    value={form.assignmentReason}
                    onChange={handleChange}
                    placeholder="Why is this task being assigned?"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <div className="card-header">
          <h3>
            {activeTab === "team" ? "Team Task List" : "My Assigned Tasks"}
          </h3>
        </div>
        <div className="card-body">
          {currentTasks.length === 0 ? (
            <div className="empty-state">
              <h3>No tasks</h3>
              <p>
                {activeTab === "team"
                  ? "Create your first task above."
                  : "You have no tasks assigned to you."}
              </p>
            </div>
          ) : (
            <div className="task-list">
              {currentTasks.map((task) => {
                const isAssignedToMe =
                  task.assignedTo &&
                  (typeof task.assignedTo === "object"
                    ? task.assignedTo._id
                    : task.assignedTo) === (JSON.parse(localStorage.getItem("user") || "{}") || {})._id;
                return (
                  <div key={task._id} className="task-item">
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onChange={() =>
                        handleStatusChange(
                          task._id,
                          task.status === "done" ? "todo" : "done"
                        )
                      }
                    />
                    <div className="task-content">
                      <div className={`task-title ${task.status === "done" ? "done" : ""}`}>
                        {task.title}
                        {task.assignedTo && (
                          <span
                            className="badge"
                            style={{
                              background: "#e5e7eb",
                              color: "#374151",
                              textTransform: "none",
                              fontSize: "0.7rem",
                              marginLeft: "0.5rem",
                            }}
                          >
                            Assigned
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <div
                          className="task-meta"
                          style={{ color: "#6b7280", fontSize: "0.85rem" }}
                        >
                          {task.description}
                        </div>
                      )}
                      <div className="task-meta">
                        <span className={`badge badge-${task.priority}`}>
                          {task.priority}
                        </span>
                        <span className={`badge badge-${task.status}`}>
                          {task.status}
                        </span>
                        {task.assignedTo &&
                          (typeof task.assignedTo === "object"
                            ? task.assignedTo.name
                            : "") && (
                            <span>
                              👤 {typeof task.assignedTo === "object" ? task.assignedTo.name : ""}
                            </span>
                          )}
                        {task.dueDate && (
                          <span>📅 {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="task-actions">
                      {activeTab === "team" ? (
                        <>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openAssignModal(task._id)}
                          >
                            Assign
                          </button>
                          {task.assignedTo && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleUnassign(task._id)}
                            >
                              Unassign
                            </button>
                          )}
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openHistoryModal(task)}
                          >
                            History
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(task._id)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openHistoryModal(task)}
                          >
                            History
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Task</h3>
            <form onSubmit={handleAssignSubmit} className="auth-form">
              <div className="form-group">
                <label>Assign To</label>
                <select
                  name="assignedTo"
                  value={assignForm.assignedTo}
                  onChange={(e) => setAssignForm({ ...assignForm, assignedTo: e.target.value })}
                  required
                >
                  <option value="">Select team member</option>
                  {teamMembers.map((m) => (
                    <option key={m.user._id} value={m.user._id}>
                      {m.user.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <input
                  type="text"
                  name="reason"
                  value={assignForm.reason}
                  onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value })}
                  placeholder="Why are you assigning this task?"
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-outline" onClick={() => setAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment History Modal */}
      {historyModal && historyTask && (
        <div className="modal-overlay" onClick={() => setHistoryModal(false)}>
          <div className="modal" style={{ maxWidth: "600px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Assignment History</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setHistoryModal(false)}>
                Close
              </button>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <strong>Task:</strong> {historyTask.title}
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <strong>Current Assignee:</strong>{" "}
              {historyTask.assignedTo
                ? (typeof historyTask.assignedTo === "object"
                    ? historyTask.assignedTo.name
                    : historyTask.assignedTo)
                : "Unassigned"}
            </div>
            <div>
              <strong>History:</strong>
              {historyTask.history &&
              historyTask.history.length > 0 ? (
                <div className="task-list">
                  {historyTask.history.map((h, i) => (
                    <div key={i} className="task-item" style={{ background: "#f9fafb" }}>
                      <div className="task-content">
                        <div className="task-title">
                          {h.assignedTo
                            ? `Assigned to ${typeof h.assignedTo === "object" ? h.assignedTo.name : "Unknown"}`
                            : "Unassigned"}
                        </div>
                        <div className="task-meta">
                          <span>
                            By {typeof h.assignedBy === "object" ? h.assignedBy.name : "System"}
                          </span>
                          <span>
                            {new Date(h.assignedAt).toLocaleString()}
                          </span>
                          {h.reason && <span>{h.reason}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No assignment history.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

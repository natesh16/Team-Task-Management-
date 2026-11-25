import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { StatusBadge, PriorityBadge, STATUS_META } from "../components/Badge";
import Loader from "../components/Loader";
import TaskDetailModal from "../components/TaskDetailModal";
import AiPlannerModal from "../components/AiPlannerModal";
import { useToast } from "../components/Toast";
import {
  dueLabel,
  formatDateTime,
  getErrorMessage,
  isOverdue,
  taskAssigneeId,
  taskAssigneeName,
} from "../utils/format";

const COLUMNS = ["backlog", "todo", "in-progress", "review", "done"];
const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "review", label: "In review" },
  { value: "done", label: "Done" },
];

const emptyTaskForm = (teamId, status = "todo") => ({
  title: "",
  description: "",
  status,
  priority: "medium",
  team: teamId || "",
  assignedTo: "",
  dueDate: "",
  assignmentReason: "",
});

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialView = searchParams.get("view") === "my" ? "my" : "team";
  const initialTeam = searchParams.get("team") || "";

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(initialTeam);
  const [activeTab, setActiveTab] = useState(initialView);
  const [teamTasks, setTeamTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [view, setView] = useState(
    () => localStorage.getItem("taskmask-view") || "board"
  );

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const [modal, setModal] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTaskForm(initialTeam));
  const [createMembers, setCreateMembers] = useState([]);
  const [savingTask, setSavingTask] = useState(false);
  const [formError, setFormError] = useState("");

  const [assignTask, setAssignTask] = useState(null);
  const [assignMembers, setAssignMembers] = useState([]);
  const [assignForm, setAssignForm] = useState({ assignedTo: "", reason: "" });
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);

  const [historyTask, setHistoryTask] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [teamColumns, setTeamColumns] = useState([]);
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState("");
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [newBoardForm, setNewBoardForm] = useState({ name: "", description: "" });
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);

  const [draggedId, setDraggedId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    localStorage.setItem("taskmask-view", view);
  }, [view]);

  async function loadTeams() {
    setLoadingTeams(true);
    try {
      const res = await api.get("/teams");
      const list = res.data || [];
      setTeams(list);

      if (list.length) {
        const hasParam = initialTeam && list.some((team) => team._id === initialTeam);
        setSelectedTeam((current) => {
          if (current && list.some((team) => team._id === current)) return current;
          return hasParam ? initialTeam : list[0]._id;
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load teams"));
    } finally {
      setLoadingTeams(false);
    }
  }

  async function loadMyTasks({ silent = false } = {}) {
    try {
      const res = await api.get("/tasks/my-tasks", {
        params: { page: 1, limit: 200 },
      });
      setMyTasks(res.data.tasks || res.data || []);
    } catch (error) {
      if (!silent) toast.error(getErrorMessage(error, "Failed to load your tasks"));
    }
  }

  async function loadTeamData(teamId, { silent = false, boardId = null } = {}) {
    if (!teamId) {
      setTeamTasks([]);
      setTeamMembers([]);
      setBoards([]);
      setSelectedBoard("");
      setLoadingTasks(false);
      return;
    }
    if (!silent) setLoadingTasks(true);
    try {
      const [boardsRes, teamRes] = await Promise.all([
        api.get("/boards", { params: { team: teamId } }),
        api.get(`/teams/${teamId}`),
      ]);
      const boardList = boardsRes.data || [];
      setBoards(boardList);
      const targetBoardId =
        boardId && boardList.some((b) => b._id === boardId)
          ? boardId
          : selectedBoard && boardList.some((b) => b._id === selectedBoard)
          ? selectedBoard
          : boardList[0]?._id || "";
      setSelectedBoard(targetBoardId);
      setTeamMembers(teamRes.data.members || []);
      const activeBoardObj = boardList.find((b) => b._id === targetBoardId);
      setTeamColumns(activeBoardObj?.columns || teamRes.data.columns || []);

      const tasksRes = await api.get("/tasks", {
        params: {
          team: teamId,
          board: targetBoardId || undefined,
          page: 1,
          limit: 200,
        },
      });
      setTeamTasks(tasksRes.data.tasks || tasksRes.data || []);
    } catch (error) {
      if (!silent) toast.error(getErrorMessage(error, "Failed to load tasks"));
    } finally {
      if (!silent) setLoadingTasks(false);
    }
  }

  useEffect(() => {
    loadTeams();
    loadMyTasks();
  }, []);

  useEffect(() => {
    if (selectedTeam) loadTeamData(selectedTeam);
  }, [selectedTeam]);

  useEffect(() => {
    const teamParam = searchParams.get("team");
    if (
      teamParam &&
      teamParam !== selectedTeam &&
      teams.some((team) => team._id === teamParam)
    ) {
      setSelectedTeam(teamParam);
    }
    const wantedTab = searchParams.get("view") === "my" ? "my" : "team";
    if (wantedTab !== activeTab) setActiveTab(wantedTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, teams]);

  useEffect(() => {
    if (searchParams.get("new") !== "1" || loadingTeams) return;
    if (!teams.length) return;
    openCreate("todo");
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadingTeams, teams]);

  useEffect(() => {
    if (modal?.type !== "create" || !taskForm.team) return;
    let active = true;
    api
      .get(`/teams/${taskForm.team}`)
      .then((res) => {
        if (active) setCreateMembers(res.data.members || []);
      })
      .catch(() => {
        if (active) setCreateMembers([]);
      });
    return () => {
      active = false;
    };
  }, [modal?.type, taskForm.team]);

  const activeTeamObj = useMemo(
    () => teams.find((t) => t._id === selectedTeam) || null,
    [teams, selectedTeam]
  );

  const isTeamAdmin = useMemo(() => {
    if (!activeTeamObj || !user) return false;
    if (user.role === "admin") return true;
    const ownerId = activeTeamObj.owner?._id || activeTeamObj.owner;
    if (ownerId === user._id) return true;
    const membership = (activeTeamObj.members || []).find(
      (m) => (m.user?._id || m.user) === user._id
    );
    return membership?.role === "admin";
  }, [activeTeamObj, user]);

  const currentTasks = activeTab === "team" ? teamTasks : myTasks;

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return currentTasks.filter((task) => {
      if (
        query &&
        !task.title?.toLowerCase().includes(query) &&
        !task.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      if (assigneeFilter !== "all") {
        const assigneeId = taskAssigneeId(task);
        if (assigneeFilter === "unassigned" && assigneeId) return false;
        if (assigneeFilter !== "unassigned" && assigneeId !== assigneeFilter) {
          return false;
        }
      }
      return true;
    });
  }, [currentTasks, search, priorityFilter, assigneeFilter]);

  const summary = useMemo(() => {
    const done = filteredTasks.filter((task) => task.status === "done").length;
    const overdue = filteredTasks.filter(isOverdue).length;
    return {
      total: filteredTasks.length,
      done,
      overdue,
      high: filteredTasks.filter(
        (task) => task.priority === "high" && task.status !== "done"
      ).length,
    };
  }, [filteredTasks]);

  const assigneeOptions = useMemo(() => {
    const members = activeTab === "team" ? teamMembers : [];
    return members
      .filter((member) => member.user && member.user._id)
      .map((member) => ({ id: member.user._id, name: member.user.name }));
  }, [teamMembers, activeTab]);

  const boardData = useMemo(() => {
    const groups = {
      backlog: [],
      todo: [],
      "in-progress": [],
      review: [],
      done: [],
    };
    filteredTasks.forEach((task) => {
      if (groups[task.status]) groups[task.status].push(task);
    });
    return groups;
  }, [filteredTasks]);

  const refreshAll = async () => {
    await Promise.all([
      selectedTeam
        ? loadTeamData(selectedTeam, { silent: true, boardId: selectedBoard })
        : Promise.resolve(),
      loadMyTasks({ silent: true }),
    ]);
  };

  function changeBoard(boardId) {
    setSelectedBoard(boardId);
    loadTeamData(selectedTeam, { boardId });
  }

  const handleCreateBoard = async (event) => {
    event.preventDefault();
    if (!newBoardForm.name.trim() || !selectedTeam) return;
    setCreatingBoard(true);
    try {
      const res = await api.post("/boards", {
        name: newBoardForm.name.trim(),
        description: newBoardForm.description.trim(),
        team: selectedTeam,
      });
      toast.success(`Board "${res.data.name}" created`);
      setBoardModalOpen(false);
      setNewBoardForm({ name: "", description: "" });
      await loadTeamData(selectedTeam, { boardId: res.data._id });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not create board"));
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!selectedBoard || boards.length <= 1) return;
    try {
      await api.delete(`/boards/${selectedBoard}`);
      toast.success("Board deleted");
      const remaining = boards.filter((b) => b._id !== selectedBoard);
      await loadTeamData(selectedTeam, { boardId: remaining[0]?._id || null });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete board"));
    }
  };

  function changeTab(tab) {
    setActiveTab(tab);
    setAssigneeFilter("all");
    const next = new URLSearchParams(searchParams);
    if (tab === "my") {
      next.set("view", "my");
      next.delete("team");
    } else {
      next.delete("view");
      if (selectedTeam) next.set("team", selectedTeam);
    }
    setSearchParams(next, { replace: true });
  }

  function changeTeam(teamId) {
    setSelectedTeam(teamId);
    setAssigneeFilter("all");
    const next = new URLSearchParams(searchParams);
    next.set("team", teamId);
    next.delete("view");
    setSearchParams(next, { replace: true });
  }

  function openCreate(status = "todo") {
    if (!teams.length) {
      toast.info("Create or join a team before adding tasks");
      navigate("/teams");
      return;
    }
    const teamId =
      selectedTeam && teams.some((team) => team._id === selectedTeam)
        ? selectedTeam
        : teams[0]._id;
    setTaskForm(emptyTaskForm(teamId, status));
    setFormError("");
    setModal({ type: "create" });
  }

  function openEdit(task) {
    setTaskForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      team: task.team?._id || task.team || selectedTeam,
      assignedTo: taskAssigneeId(task) || "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      assignmentReason: "",
    });
    setFormError("");
    setModal({ type: "edit", task });
  }

  function closeModal() {
    if (savingTask) return;
    setModal(null);
    setFormError("");
  }

  const handleTaskSubmit = async (event) => {
    event.preventDefault();
    if (!taskForm.title.trim()) {
      setFormError("A task title is required");
      return;
    }
    setSavingTask(true);
    setFormError("");
    try {
      if (modal.type === "create") {
        await api.post("/tasks", {
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          status: taskForm.status,
          priority: taskForm.priority,
          team: taskForm.team,
          board: selectedBoard || undefined,
          assignedTo: taskForm.assignedTo || null,
          dueDate: taskForm.dueDate || null,
          assignmentReason: taskForm.assignmentReason || undefined,
        });
        toast.success("Task created");
        if (taskForm.team !== selectedTeam) {
          setSelectedTeam(taskForm.team);
        }
      } else {
        await api.put(`/tasks/${modal.task._id}`, {
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          status: taskForm.status,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate || null,
        });
        toast.success("Task updated");
      }
      setModal(null);
      await refreshAll();
    } catch (error) {
      setFormError(getErrorMessage(error, "Could not save the task"));
    } finally {
      setSavingTask(false);
    }
  };

  const updateStatus = async (task, status) => {
    if (!status || task.status === status) return;
    setTeamTasks((tasks) =>
      tasks.map((item) => (item._id === task._id ? { ...item, status } : item))
    );
    setMyTasks((tasks) =>
      tasks.map((item) => (item._id === task._id ? { ...item, status } : item))
    );
    try {
      await api.put(`/tasks/${task._id}`, { status });
      toast.success(`Moved to ${STATUS_META[status]?.label || status}`);
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update the status"));
      await refreshAll();
    }
  };

  const handleDrop = async (status) => {
    setDragOver(null);
    if (!draggedId) return;
    const task = currentTasks.find((item) => item._id === draggedId);
    setDraggedId(null);
    if (task) await updateStatus(task, status);
  };

  const openAssign = async (task) => {
    setAssignTask(task);
    setAssignForm({ assignedTo: "", reason: "" });
    setAssignMembers([]);
    setAssignLoading(true);
    const teamId = task.team?._id || task.team || selectedTeam;
    try {
      const res = await api.get(`/teams/${teamId}`);
      setAssignMembers(res.data.members || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load team members"));
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    if (!assignForm.assignedTo) return;
    setAssignSaving(true);
    try {
      await api.patch(`/tasks/${assignTask._id}/assign`, {
        assignedTo: assignForm.assignedTo,
        reason: assignForm.reason || "Task assigned",
      });
      toast.success("Task assigned");
      setAssignTask(null);
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not assign the task"));
    } finally {
      setAssignSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!assignTask) return;
    setAssignSaving(true);
    try {
      await api.patch(`/tasks/${assignTask._id}/unassign`, {
        reason: "Task unassigned",
      });
      toast.success("Task unassigned");
      setAssignTask(null);
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not unassign the task"));
    } finally {
      setAssignSaving(false);
    }
  };

  const openHistory = async (task) => {
    setHistoryTask(task);
    setHistoryData(null);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/tasks/${task._id}/assignment-history`);
      setHistoryData(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load assignment history"));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${deleteTarget._id}`);
      toast.success("Task deleted");
      setDeleteTarget(null);
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete the task"));
    } finally {
      setDeleting(false);
    }
  };

  const teamName = (task) => {
    if (task.team && typeof task.team === "object") return task.team.name;
    const found = teams.find((team) => team._id === task.team);
    return found?.name || "Team";
  };

  const renderActions = (task) => (
    <div className="task-actions">
      {isTeamAdmin && (
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          title="Assign / Reassign"
          aria-label={`Assign ${task.title}`}
          onClick={() => openAssign(task)}
        >
          <Icon name="user" size={15} />
        </button>
      )}
      <button
        type="button"
        className="icon-btn icon-btn--sm"
        title="Assignment history"
        aria-label={`History for ${task.title}`}
        onClick={() => openHistory(task)}
      >
        <Icon name="history" size={15} />
      </button>
      {isTeamAdmin && (
        <>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            title="Edit task"
            aria-label={`Edit ${task.title}`}
            onClick={() => openEdit(task)}
          >
            <Icon name="edit" size={15} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--sm icon-btn--danger"
            title="Delete task"
            aria-label={`Delete ${task.title}`}
            onClick={() => setDeleteTarget(task)}
          >
            <Icon name="trash" size={15} />
          </button>
        </>
      )}
    </div>
  );

  const renderTaskCard = (task) => (
    <article
      key={task._id}
      className={`task-card ${draggedId === task._id ? "task-card--dragging" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", task._id);
        event.dataTransfer.effectAllowed = "move";
        setDraggedId(task._id);
      }}
      onDragEnd={() => {
        setDraggedId(null);
        setDragOver(null);
      }}
    >
      <span className={`priority-bar priority-bar--${task.priority}`} />
      <div className="task-card-top">
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {task.taskKey && <span className="task-key-chip">{task.taskKey}</span>}
          <PriorityBadge priority={task.priority} />
        </div>
        {renderActions(task)}
      </div>

      <h3
        className="task-card-title"
        style={{ cursor: "pointer" }}
        onClick={() => setDetailTask(task)}
        title="Open task details, subtasks & comments"
      >
        {task.title}
      </h3>
      {task.description && <p className="task-card-desc">{task.description}</p>}

      {(task.labels || []).length > 0 && (
        <div className="label-row">
          {task.labels.slice(0, 3).map((lbl) => (
            <span key={lbl} className="label-chip">
              {lbl}
            </span>
          ))}
        </div>
      )}

      {(task.subtasks || []).length > 0 && (
        <div className="subtask-bar">
          <span>
            {task.subtasks.filter((s) => s.completed).length}/
            {task.subtasks.length}
          </span>
          <div className="subtask-track">
            <div
              className="subtask-fill"
              style={{
                width: `${Math.round(
                  (task.subtasks.filter((s) => s.completed).length /
                    task.subtasks.length) *
                    100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="task-tags">
        {activeTab === "my" && (
          <span className="tag tag--team">
            <Icon name="layers" size={12} />
            {teamName(task)}
          </span>
        )}
        {task.dueDate && (
          <span className={`tag ${isOverdue(task) ? "tag--danger" : ""}`}>
            <Icon name="calendar" size={12} />
            {dueLabel(task.dueDate)}
          </span>
        )}
      </div>

      <div className="task-card-foot">
        <div className="task-assignee">
          {taskAssigneeName(task) ? (
            <>
              <Avatar name={taskAssigneeName(task)} size="xs" />
              <span>{taskAssigneeName(task)}</span>
            </>
          ) : (
            <>
              <span className="avatar avatar--xs avatar--empty">?</span>
              <span className="muted">Unassigned</span>
            </>
          )}
        </div>

        <select
          className="task-move-select"
          value={task.status}
          onChange={(event) => updateStatus(task, event.target.value)}
          aria-label={`Change status for ${task.title}`}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span className="drag-hint" title="Drag to change status">
          <Icon name="grip" size={15} />
        </span>
      </div>
    </article>
  );

  const hasTeams = teams.length > 0;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Task board</h1>
          <p className="page-subtitle">
            {activeTab === "my"
              ? "Everything assigned to you, across every team."
              : "Drag cards between columns to move work forward."}
          </p>
        </div>
        <div className="page-actions">
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={view === "board" ? "active" : ""}
              onClick={() => setView("board")}
              title="Board view"
            >
              <Icon name="board" size={16} />
              <span>Board</span>
            </button>
            <button
              type="button"
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              title="List view"
            >
              <Icon name="list" size={16} />
              <span>List</span>
            </button>
          </div>
          {isTeamAdmin ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAiOpen(true)}
                disabled={!selectedTeam}
              >
                <Icon name="sparkles" size={16} />
                AI Plan
              </button>
              <button type="button" className="btn btn-primary" onClick={() => openCreate("todo")}>
                <Icon name="plus" size={17} />
                New task
              </button>
            </>
          ) : (
            <span className="badge badge--neutral" title="Only admins can add, delete, or reassign tasks">
              Employee view
            </span>
          )}
        </div>
      </header>

      {!loadingTeams && !hasTeams ? (
        <div className="panel">
          <EmptyState
            icon="users"
            title="You need a team first"
            description="Tasks live inside team workspaces. Create a team or join one with an invite code to get started."
            action={
              <Link to="/teams" className="btn btn-primary">
                <Icon name="users" size={16} /> Go to teams
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="task-toolbar">
            <div className="tabs" role="tablist" aria-label="Task scope">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "team"}
                className={`tab ${activeTab === "team" ? "tab--active" : ""}`}
                onClick={() => changeTab("team")}
              >
                <Icon name="users" size={15} />
                Team tasks
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "my"}
                className={`tab ${activeTab === "my" ? "tab--active" : ""}`}
                onClick={() => changeTab("my")}
              >
                <Icon name="target" size={15} />
                My tasks
                <span className="tab-count">{myTasks.length}</span>
              </button>
            </div>

            {activeTab === "team" && (
              <>
                <div className="team-select">
                  <Icon name="layers" size={15} />
                  <select
                    value={selectedTeam}
                    onChange={(event) => changeTeam(event.target.value)}
                    aria-label="Select team"
                  >
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevronDown" size={15} />
                </div>

                {boards.length > 0 && (
                  <div className="team-select">
                    <Icon name="board" size={15} />
                    <select
                      value={selectedBoard}
                      onChange={(event) => changeBoard(event.target.value)}
                      aria-label="Select task board"
                    >
                      {boards.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <Icon name="chevronDown" size={15} />
                  </div>
                )}

                {isTeamAdmin && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setBoardModalOpen(true)}
                    title="Create a new task board"
                  >
                    <Icon name="plus" size={14} /> New board
                  </button>
                )}

                {isTeamAdmin && boards.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm icon-btn--danger"
                    onClick={handleDeleteBoard}
                    title="Delete current board"
                    aria-label="Delete current board"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </>
            )}

            <div className="toolbar-search">
              <div className="search-box">
                <Icon name="search" size={16} />
                <input
                  type="search"
                  placeholder="Search tasks…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search tasks"
                />
                {search && (
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="filter-select">
              <Icon name="flag" size={15} />
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                aria-label="Filter by priority"
              >
                <option value="all">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <Icon name="chevronDown" size={14} />
            </div>

            {activeTab === "team" && (
              <div className="filter-select">
                <Icon name="user" size={15} />
                <select
                  value={assigneeFilter}
                  onChange={(event) => setAssigneeFilter(event.target.value)}
                  aria-label="Filter by assignee"
                >
                  <option value="all">Everyone</option>
                  <option value="unassigned">Unassigned</option>
                  {assigneeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" size={14} />
              </div>
            )}
          </div>

          <div className="summary-strip">
            <span>
              <strong>{summary.total}</strong> tasks
            </span>
            <span>
              <i className="dot dot--done" />
              <strong>{summary.done}</strong> done
            </span>
            <span className={summary.overdue ? "text-danger" : ""}>
              <i className="dot dot--danger" />
              <strong>{summary.overdue}</strong> overdue
            </span>
            <span>
              <i className="dot dot--high" />
              <strong>{summary.high}</strong> high priority open
            </span>
          </div>

          {loadingTasks && activeTab === "team" ? (
            <Loader label="Loading tasks" />
          ) : filteredTasks.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={currentTasks.length ? "search" : "board"}
                title={
                  currentTasks.length
                    ? "No tasks match your filters"
                    : activeTab === "my"
                    ? "Nothing assigned to you yet"
                    : "This team has no tasks yet"
                }
                description={
                  currentTasks.length
                    ? "Try clearing the search or choosing a different priority."
                    : activeTab === "my"
                    ? "When a teammate assigns you work, it will appear here."
                    : "Create the first task and start moving work forward."
                }
                action={
                  currentTasks.length ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setSearch("");
                        setPriorityFilter("all");
                        setAssigneeFilter("all");
                      }}
                    >
                      Clear filters
                    </button>
                  ) : activeTab === "team" ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openCreate("todo")}
                    >
                      <Icon name="plus" size={16} /> Create task
                    </button>
                  ) : (
                    <Link to="/tasks" className="btn btn-secondary">
                      Browse team tasks
                    </Link>
                  )
                }
              />
            </div>
          ) : view === "board" ? (
            <div className="board">
              {COLUMNS.map((status) => (
                <section
                  className={`board-col board-col--${status} ${
                    dragOver === status ? "board-col--over" : ""
                  }`}
                  key={status}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(status);
                  }}
                  onDragLeave={() => setDragOver((current) => (current === status ? null : current))}
                  onDrop={() => handleDrop(status)}
                >
                  <header className="board-col-head">
                    <span className={`dot dot--${status}`} />
                    <h2>{STATUS_META[status].label}</h2>
                    {(() => {
                      const colMeta = teamColumns.find((c) => c.key === status);
                      const count = boardData[status].length;
                      const wip = colMeta?.wipLimit || 0;
                      if (wip > 0) {
                        const cls =
                          count >= wip
                            ? "wip-badge wip-badge--full"
                            : count === wip - 1
                            ? "wip-badge wip-badge--warn"
                            : "wip-badge";
                        return (
                          <span className={cls} title={`WIP limit: ${wip}`}>
                            {count}/{wip}
                          </span>
                        );
                      }
                      return <span className="col-count">{count}</span>;
                    })()}
                    {isTeamAdmin && (
                      <button
                        type="button"
                        className="icon-btn icon-btn--sm col-add"
                        onClick={() => openCreate(status)}
                        title={`Add a ${STATUS_META[status].label.toLowerCase()} task`}
                        aria-label={`Add task to ${STATUS_META[status].label}`}
                      >
                        <Icon name="plus" size={15} />
                      </button>
                    )}
                  </header>

                  <div className="board-cards">
                    {boardData[status].map((task) => renderTaskCard(task))}
                    {boardData[status].length === 0 && (
                      <div className="board-empty">
                        <span>Drop tasks here</span>
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="panel list-panel">
              <div className="task-list-head">
                <span>Task</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Assignee</span>
                <span>Due</span>
                <span aria-hidden="true" />
              </div>
              <ul className="task-list">
                {filteredTasks.map((task) => (
                  <li className="task-row" key={task._id}>
                    <div className="task-row-main">
                      <button
                        type="button"
                        className={`check-toggle ${
                          task.status === "done" ? "check-toggle--on" : ""
                        }`}
                        onClick={() =>
                          updateStatus(task, task.status === "done" ? "todo" : "done")
                        }
                        aria-label={`Toggle ${task.title}`}
                      >
                        {task.status === "done" && (
                          <Icon name="check" size={12} strokeWidth={2.6} />
                        )}
                      </button>
                      <div>
                        <span
                          className={`task-row-title ${
                            task.status === "done" ? "task-row-title--done" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="task-row-sub">
                          {activeTab === "my" ? teamName(task) : task.description || "No description"}
                        </span>
                      </div>
                    </div>
                    <div className="task-row-status">
                      <StatusBadge status={task.status} />
                    </div>
                    <div>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="task-row-assignee">
                      {taskAssigneeName(task) ? (
                        <>
                          <Avatar name={taskAssigneeName(task)} size="xs" />
                          <span>{taskAssigneeName(task)}</span>
                        </>
                      ) : (
                        <span className="muted">Unassigned</span>
                      )}
                    </div>
                    <div className={`task-row-due ${isOverdue(task) ? "text-danger" : ""}`}>
                      {task.dueDate ? dueLabel(task.dueDate) : "—"}
                    </div>
                    <div className="task-row-actions">{renderActions(task)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Modal
        open={modal?.type === "create" || modal?.type === "edit"}
        onClose={closeModal}
        title={modal?.type === "edit" ? "Edit task" : "Create a task"}
        subtitle={
          modal?.type === "edit"
            ? "Update the details or move the task to another status."
            : "Add work to a team board and assign an owner."
        }
        icon={modal?.type === "edit" ? "edit" : "plus"}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="task-form"
              className="btn btn-primary"
              disabled={savingTask}
            >
              {savingTask ? (
                <>
                  <span className="spinner spinner--light" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  {modal?.type === "edit" ? "Save changes" : "Create task"}
                </>
              )}
            </button>
          </>
        }
      >
        <form id="task-form" className="form-stack" onSubmit={handleTaskSubmit}>
          {formError && (
            <div className="alert alert--error">
              <Icon name="alert" size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="task-title">Title</label>
            <input
              id="task-title"
              className="input"
              value={taskForm.title}
              onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
              placeholder="What needs to be done?"
              maxLength={120}
              autoFocus
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              className="input textarea"
              rows={3}
              value={taskForm.description}
              onChange={(event) =>
                setTaskForm({ ...taskForm, description: event.target.value })
              }
              placeholder="Add context, acceptance criteria or links…"
              maxLength={500}
            />
          </div>

          {modal?.type === "create" && (
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="task-team">Team</label>
                <select
                  id="task-team"
                  className="input"
                  value={taskForm.team}
                  onChange={(event) =>
                    setTaskForm({
                      ...taskForm,
                      team: event.target.value,
                      assignedTo: "",
                    })
                  }
                >
                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="task-assignee">Assign to</label>
                <select
                  id="task-assignee"
                  className="input"
                  value={taskForm.assignedTo}
                  onChange={(event) =>
                    setTaskForm({ ...taskForm, assignedTo: event.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {createMembers.map((member) =>
                    member.user ? (
                      <option key={member.user._id} value={member.user._id}>
                        {member.user.name} ({member.role})
                      </option>
                    ) : null
                  )}
                </select>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="task-status">Status</label>
              <select
                id="task-status"
                className="input"
                value={taskForm.status}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, status: event.target.value })
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                className="input"
                value={taskForm.priority}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, priority: event.target.value })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="task-due">Due date</label>
              <input
                id="task-due"
                type="date"
                className="input"
                value={taskForm.dueDate}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, dueDate: event.target.value })
                }
              />
            </div>
          </div>

          {modal?.type === "create" && taskForm.assignedTo && (
            <div className="form-field">
              <label htmlFor="task-reason">Assignment reason</label>
              <input
                id="task-reason"
                className="input"
                value={taskForm.assignmentReason}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, assignmentReason: event.target.value })
                }
                placeholder="Why is this person the right owner?"
                maxLength={160}
              />
              <span className="field-hint">
                Saved to the task&apos;s assignment history for future reference.
              </span>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(assignTask)}
        onClose={() => (assignSaving ? null : setAssignTask(null))}
        title="Assign task"
        subtitle={assignTask?.title}
        icon="user"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAssignTask(null)}
              disabled={assignSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="assign-form"
              className="btn btn-primary"
              disabled={assignSaving || !assignForm.assignedTo}
            >
              {assignSaving ? "Assigning…" : "Assign task"}
            </button>
          </>
        }
      >
        {assignLoading ? (
          <Loader label="Loading team members" />
        ) : (
          <form id="assign-form" className="form-stack" onSubmit={handleAssign}>
            <div className="form-field">
              <label htmlFor="assign-member">Assign to</label>
              <select
                id="assign-member"
                className="input"
                value={assignForm.assignedTo}
                onChange={(event) =>
                  setAssignForm({ ...assignForm, assignedTo: event.target.value })
                }
                required
              >
                <option value="">Select a team member</option>
                {assignMembers.map((member) =>
                  member.user ? (
                    <option key={member.user._id} value={member.user._id}>
                      {member.user.name} ({member.role})
                    </option>
                  ) : null
                )}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="assign-reason">Reason</label>
              <input
                id="assign-reason"
                className="input"
                value={assignForm.reason}
                onChange={(event) =>
                  setAssignForm({ ...assignForm, reason: event.target.value })
                }
                placeholder="Why are you assigning this task?"
                maxLength={160}
              />
            </div>

            {assignTask?.assignedTo && (
              <div className="assign-current">
                <div>
                  <span className="field-hint">Currently assigned to</span>
                  <strong>{taskAssigneeName(assignTask)}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn-danger-ghost btn-sm"
                  onClick={handleUnassign}
                  disabled={assignSaving}
                >
                  <Icon name="x" size={14} /> Unassign
                </button>
              </div>
            )}

            <div className="info-note">
              <Icon name="history" size={16} />
              <span>Every assignment is recorded with the reason and timestamp.</span>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(historyTask)}
        onClose={() => setHistoryTask(null)}
        title="Assignment history"
        subtitle={historyTask?.title}
        icon="history"
        size="md"
      >
        {historyLoading ? (
          <Loader label="Loading history" />
        ) : !historyData?.history?.length ? (
          <EmptyState
            compact
            icon="history"
            title="No assignment changes yet"
            description="Assign this task to create the first history entry."
          />
        ) : (
          <ol className="history-list">
            {historyData.history.map((entry, index) => {
              const assignee = entry.assignedTo?.name;
              return (
                <li className="history-item" key={`${entry.assignedAt}-${index}`}>
                  <span className={`history-dot ${assignee ? "" : "history-dot--empty"}`}>
                    <Icon name={assignee ? "user" : "x"} size={13} />
                  </span>
                  <div className="history-body">
                    <div className="history-title">
                      {assignee ? (
                        <>
                          Assigned to <strong>{assignee}</strong>
                        </>
                      ) : (
                        <strong>Unassigned</strong>
                      )}
                    </div>
                    {entry.reason && <p className="history-reason">{entry.reason}</p>}
                    <div className="history-meta">
                      <span>
                        <Icon name="user" size={12} />
                        {entry.assignedBy?.name || "System"}
                      </span>
                      <span>
                        <Icon name="clock" size={12} />
                        {formatDateTime(entry.assignedAt)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        title="Delete this task?"
        subtitle={deleteTarget?.title}
        icon="alert"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Keep task
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete task"}
            </button>
          </>
        }
      >
        <div className="danger-note">
          <Icon name="alert" size={17} />
          <p>
            This permanently removes <strong>{deleteTarget?.title}</strong> and
            its assignment history. This cannot be undone.
          </p>
        </div>
      </Modal>

      <TaskDetailModal
        task={detailTask}
        teamTasks={teamTasks}
        isAdmin={isTeamAdmin}
        onClose={(shouldRefresh) => {
          setDetailTask(null);
          if (shouldRefresh) refreshAll();
        }}
        onUpdated={(updated) => {
          setDetailTask(updated);
          refreshAll();
        }}
      />

      <AiPlannerModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        teamId={selectedTeam}
        boardId={selectedBoard}
        onCreated={refreshAll}
      />

      <Modal
        open={boardModalOpen}
        onClose={() => setBoardModalOpen(false)}
        title="Create new task board"
        subtitle="Organize workstreams, sprints, or departments into separate boards."
      >
        <form className="form-stack" onSubmit={handleCreateBoard}>
          <div className="field">
            <label>Board name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Sprint 2, Mobile App, QA Board"
              value={newBoardForm.name}
              onChange={(e) =>
                setNewBoardForm((f) => ({ ...f, name: e.target.value }))
              }
              required
            />
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="What is this board for?"
              value={newBoardForm.description}
              onChange={(e) =>
                setNewBoardForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setBoardModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creatingBoard}
            >
              {creatingBoard ? "Creating..." : "Create board"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

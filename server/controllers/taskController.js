const asyncHandler = require("express-async-handler");
const Task = require("../models/Task");
const Team = require("../models/Team");

// Helper: check if user is a member of a team
const isTeamMember = async (teamId, userId) => {
  const team = await Team.findById(teamId);
  if (!team) return false;
  return team.members.some((m) => m.user.toString() === userId.toString());
};

// Helper: get team member role
const getMemberRole = async (teamId, userId) => {
  const team = await Team.findById(teamId);
  if (!team) return null;
  const member = team.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

// @desc    Get tasks for a team
// @route   GET /api/tasks?team=:teamId
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
  const { team, status, priority, assignedTo, page = 1, limit = 20 } = req.query;

  if (!team) {
    res.status(400);
    throw new Error("Team ID is required");
  }

  const teamExists = await Team.findById(team);
  if (!teamExists) {
    res.status(404);
    throw new Error("Team not found");
  }

  const isMember = await isTeamMember(team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to view tasks for this team");
  }

  // Build filter
  const filter = { team };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const tasks = await Task.find(filter)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("assignmentHistory.assignedTo", "name email")
    .populate("assignmentHistory.assignedBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Task.countDocuments(filter);

  res.json({
    tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    status,
    priority,
    team,
    assignedTo,
    dueDate,
    assignmentReason,
  } = req.body;

  if (!title || !title.trim()) {
    res.status(400);
    throw new Error("Please add a task title");
  }

  if (!team) {
    res.status(400);
    throw new Error("Please select a team for this task");
  }

  const teamExists = await Team.findById(team);
  if (!teamExists) {
    res.status(404);
    throw new Error("Team not found");
  }

  const isMember = await isTeamMember(team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to create tasks in this team");
  }

  // Validate assignee is a team member if provided
  if (assignedTo) {
    const assigneeIsMember = await isTeamMember(team, assignedTo);
    if (!assigneeIsMember) {
      res.status(400);
      throw new Error("Assignee must be a member of the team");
    }
  }

  const task = await Task.create({
    title,
    description,
    status: status || "todo",
    priority: priority || "medium",
    team,
    assignedTo: assignedTo || null,
    createdBy: req.user.id,
    dueDate: dueDate || null,
    assignmentHistory: assignedTo
      ? [
          {
            assignedTo,
            assignedBy: req.user.id,
            assignedAt: new Date(),
            reason: assignmentReason || "Initial assignment",
          },
        ]
      : [],
  });

  const createdTask = await Task.findById(task._id)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("assignmentHistory.assignedTo", "name email")
    .populate("assignmentHistory.assignedBy", "name email");

  res.status(201).json(createdTask);
});

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const isMember = await isTeamMember(task.team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to update this task");
  }

  // Only allow editable fields (never team / createdBy)
  const editableFields = ["title", "description", "status", "priority", "dueDate"];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  });

  // Handle assignee changes with assignment history
  if (req.body.assignedTo !== undefined) {
    const nextAssignee = req.body.assignedTo || null;
    const currentAssignee = task.assignedTo ? task.assignedTo.toString() : null;
    const nextAssigneeId = nextAssignee ? nextAssignee.toString() : null;

    if (nextAssigneeId) {
      const assigneeIsMember = await isTeamMember(task.team, nextAssigneeId);
      if (!assigneeIsMember) {
        res.status(400);
        throw new Error("Assignee must be a member of the team");
      }
    }

    if (currentAssignee !== nextAssigneeId) {
      task.assignmentHistory.push({
        assignedTo: nextAssigneeId,
        assignedBy: req.user.id,
        assignedAt: new Date(),
        reason:
          req.body.assignmentReason ||
          (nextAssigneeId ? "Task reassigned" : "Task unassigned"),
      });
      task.assignedTo = nextAssigneeId;
    }
  }

  await task.save();

  const updatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("assignmentHistory.assignedTo", "name email")
    .populate("assignmentHistory.assignedBy", "name email");

  res.json(updatedTask);
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const isMember = await isTeamMember(task.team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to delete this task");
  }

  // Only task creator, team admin, or team owner can delete
  const memberRole = await getMemberRole(task.team, req.user.id);
  const team = await Team.findById(task.team);

  const canDelete =
    task.createdBy.toString() === req.user.id ||
    memberRole === "admin" ||
    (team && team.owner.toString() === req.user.id);

  if (!canDelete) {
    res.status(403);
    throw new Error("Not authorized to delete this task");
  }

  await task.deleteOne();
  res.json({ message: "Task removed" });
});

// @desc    Assign a task to a team member
// @route   PATCH /api/tasks/:id/assign
// @access  Private
const assignTask = asyncHandler(async (req, res) => {
  const { assignedTo, reason } = req.body;

  if (!assignedTo) {
    res.status(400);
    throw new Error("assignedTo is required");
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const isMember = await isTeamMember(task.team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to modify this task");
  }

  // Verify assignee exists and is a team member
  const assigneeIsMember = await isTeamMember(task.team, assignedTo);
  if (!assigneeIsMember) {
    res.status(400);
    throw new Error("Assignee must be a member of the team");
  }

  // Record assignment history
  task.assignmentHistory.push({
    assignedTo,
    assignedBy: req.user.id,
    assignedAt: new Date(),
    reason: reason || "Task assigned",
  });

  task.assignedTo = assignedTo;
  await task.save();

  const updatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("assignmentHistory.assignedTo", "name email")
    .populate("assignmentHistory.assignedBy", "name email");

  res.json(updatedTask);
});

// @desc    Unassign a task
// @route   PATCH /api/tasks/:id/unassign
// @access  Private
const unassignTask = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const isMember = await isTeamMember(task.team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to modify this task");
  }

  if (!task.assignedTo) {
    res.status(400);
    throw new Error("Task is not assigned to anyone");
  }

  // Record assignment history
  task.assignmentHistory.push({
    assignedTo: null,
    assignedBy: req.user.id,
    assignedAt: new Date(),
    reason: reason || "Task unassigned",
  });

  task.assignedTo = null;
  await task.save();

  const updatedTask = await Task.findById(task._id)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("assignmentHistory.assignedTo", "name email")
    .populate("assignmentHistory.assignedBy", "name email");

  res.json(updatedTask);
});

// @desc    Get assignment history for a task
// @route   GET /api/tasks/:id/assignment-history
// @access  Private
const getAssignmentHistory = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .select("assignmentHistory title assignedTo team")
    .populate("assignmentHistory.assignedTo", "name email")
    .populate("assignmentHistory.assignedBy", "name email");

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const isMember = await isTeamMember(task.team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to view this task");
  }

  res.json({
    taskId: task._id,
    taskTitle: task.title,
    currentAssignee: task.assignedTo,
    history: task.assignmentHistory.sort((a, b) => b.assignedAt - a.assignedAt),
  });
});

// @desc    Get tasks assigned to current user
// @route   GET /api/tasks/my-tasks
// @access  Private
const getMyTasks = asyncHandler(async (req, res) => {
  const { status, priority, page = 1, limit = 20 } = req.query;

  const filter = { assignedTo: req.user.id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const tasks = await Task.find(filter)
    .populate("team", "name")
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("assignmentHistory.assignedBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Task.countDocuments(filter);

  res.json({
    tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// @desc    Get dashboard statistics for current user
// @route   GET /api/tasks/stats
// @access  Private
const getTaskStats = asyncHandler(async (req, res) => {
  const teams = await Team.find({ "members.user": req.user.id }).select(
    "_id name description"
  );
  const teamIds = teams.map((team) => team._id);

  const tasks = await Task.find({ team: { $in: teamIds } })
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("team", "name")
    .sort({ updatedAt: -1 })
    .limit(500);

  const now = new Date();
  const userId = req.user.id.toString();

  const stats = {
    total: tasks.length,
    todo: 0,
    inProgress: 0,
    review: 0,
    done: 0,
    overdue: 0,
    highPriority: 0,
    assignedToMe: 0,
    completedByMe: 0,
    completionRate: 0,
  };

  tasks.forEach((task) => {
    if (task.status === "todo") stats.todo += 1;
    if (task.status === "in-progress") stats.inProgress += 1;
    if (task.status === "review") stats.review += 1;
    if (task.status === "done") stats.done += 1;
    if (task.status !== "done" && task.dueDate && new Date(task.dueDate) < now) {
      stats.overdue += 1;
    }
    if (task.priority === "high" && task.status !== "done") {
      stats.highPriority += 1;
    }
    const assignee = task.assignedTo?._id
      ? task.assignedTo._id.toString()
      : task.assignedTo?.toString();
    if (assignee === userId) {
      stats.assignedToMe += 1;
      if (task.status === "done") stats.completedByMe += 1;
    }
  });

  stats.completionRate = stats.total
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  const perTeam = teams.map((team) => {
    const teamTasks = tasks.filter(
      (task) => task.team?._id?.toString() === team._id.toString()
    );
    const done = teamTasks.filter((task) => task.status === "done").length;
    return {
      _id: team._id,
      name: team.name,
      description: team.description,
      total: teamTasks.length,
      done,
      open: teamTasks.length - done,
      progress: teamTasks.length
        ? Math.round((done / teamTasks.length) * 100)
        : 0,
    };
  });

  const myTasks = await Task.find({ assignedTo: req.user.id })
    .populate("team", "name")
    .sort({ dueDate: 1, createdAt: -1 })
    .limit(6);

  res.json({
    stats,
    perTeam,
    recent: tasks.slice(0, 6),
    myTasks,
  });
});

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  getAssignmentHistory,
  getMyTasks,
  getTaskStats,
};

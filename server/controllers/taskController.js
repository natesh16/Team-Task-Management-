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
  const { title, description, status, priority, team, assignedTo, dueDate } =
    req.body;

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
            reason: "Initial assignment",
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

  // Validate assignee is a team member if being changed
  if (req.body.assignedTo !== undefined && req.body.assignedTo !== null) {
    const assigneeIsMember = await isTeamMember(task.team, req.body.assignedTo);
    if (!assigneeIsMember) {
      res.status(400);
      throw new Error("Assignee must be a member of the team");
    }

    // Record assignment history if assignee changed
    if (req.body.assignedTo !== task.assignedTo) {
      task.assignmentHistory.push({
        assignedTo: req.body.assignedTo,
        assignedBy: req.user.id,
        assignedAt: new Date(),
        reason: req.body.assignmentReason || "Task reassigned",
      });
    }
  } else if (req.body.assignedTo === null && task.assignedTo) {
    // Unassigning - record history
    task.assignmentHistory.push({
      assignedTo: null,
      assignedBy: req.user.id,
      assignedAt: new Date(),
      reason: req.body.assignmentReason || "Task unassigned",
    });
  }

  const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
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
    .select("assignmentHistory title assignedTo")
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

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  getAssignmentHistory,
  getMyTasks,
};

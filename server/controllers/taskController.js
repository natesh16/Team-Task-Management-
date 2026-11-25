const asyncHandler = require("express-async-handler");
const Task = require("../models/Task");
const Team = require("../models/Team");
const Board = require("../models/Board");
const {
  isTeamMember,
  getMemberRole,
  isTeamAdmin,
  validateWipLimit,
  generateTaskKey,
  wouldCreateCycle,
  appendActivity,
} = require("../services/taskService");
const { createNotification } = require("../services/notificationService");
const { evaluateRules } = require("../services/automationService");

const populateTaskQuery = (query) =>
  query
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("assignmentHistory.assignedTo", "name email")
    .populate("assignmentHistory.assignedBy", "name email")
    .populate("comments.author", "name email")
    .populate("activityHistory.actor", "name email")
    .populate("dependencies.task", "title taskKey status priority");

// @desc    Get tasks for a team
// @route   GET /api/tasks?team=:teamId
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
  const {
    team,
    board,
    status,
    priority,
    assignedTo,
    label,
    search,
    archived,
    page = 1,
    limit = 20,
  } = req.query;

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

  const filter = { team };
  filter.archivedAt = archived === "true" ? { $ne: null } : null;
  if (board) filter.board = board;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (label) filter.labels = label;
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or = [{ title: regex }, { description: regex }, { taskKey: regex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const tasks = await populateTaskQuery(
    Task.find(filter)
      .sort({ position: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  );

  const total = await Task.countDocuments(filter);

  res.json({
    tasks,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = asyncHandler(async (req, res) => {
  const task = await populateTaskQuery(Task.findById(req.params.id));

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const isMember = await isTeamMember(task.team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to view this task");
  }

  res.json(task);
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
    board,
    assignedTo,
    startDate,
    dueDate,
    estimatedMinutes,
    labels,
    subtasks,
    recurrence,
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

  const admin = await isTeamAdmin(team, req.user.id, req.user.role);
  if (!admin) {
    res.status(403);
    throw new Error("Only admins can create tasks");
  }

  let boardId = board || null;
  if (boardId) {
    const boardDoc = await Board.findOne({ _id: boardId, team });
    if (!boardDoc) {
      res.status(404);
      throw new Error("Board not found in this team");
    }
  } else {
    const defaultBoard = await Board.findOne({ team }).sort({
      isDefault: -1,
      createdAt: 1,
    });
    if (defaultBoard) boardId = defaultBoard._id;
  }

  if (assignedTo) {
    const assigneeIsMember = await isTeamMember(team, assignedTo);
    if (!assigneeIsMember) {
      res.status(400);
      throw new Error("Assignee must be a member of the team");
    }
  }

  const targetStatus = status || "todo";
  await validateWipLimit(team, targetStatus);

  const taskKey = await generateTaskKey(team);
  const now = new Date();

  const sanitizedSubtasks = Array.isArray(subtasks)
    ? subtasks
        .filter((s) => s && typeof s.title === "string" && s.title.trim())
        .map((s) => ({
          title: s.title.trim(),
          completed: Boolean(s.completed),
        }))
    : [];

  const sanitizedLabels = Array.isArray(labels)
    ? [...new Set(labels.map((l) => String(l).trim()).filter(Boolean))]
    : [];

  const task = await Task.create({
    taskKey,
    title: title.trim(),
    description: description ? description.trim() : "",
    status: targetStatus,
    priority: priority || "medium",
    labels: sanitizedLabels,
    team,
    board: boardId,
    assignedTo: assignedTo || null,
    createdBy: req.user.id,
    updatedBy: req.user.id,
    startDate: startDate || null,
    dueDate: dueDate || null,
    startedAt: targetStatus === "in-progress" ? now : null,
    completedAt: targetStatus === "done" ? now : null,
    estimatedMinutes: Math.max(0, Number(estimatedMinutes) || 0),
    subtasks: sanitizedSubtasks,
    recurrence: recurrence || { enabled: false },
    assignmentHistory: assignedTo
      ? [
          {
            assignedTo,
            assignedBy: req.user.id,
            assignedAt: now,
            reason: assignmentReason || "Initial assignment",
          },
        ]
      : [],
    activityHistory: [
      {
        actor: req.user.id,
        action: "created",
        details: `Created task ${taskKey || ""} in ${targetStatus}`,
        toValue: targetStatus,
        createdAt: now,
      },
    ],
  });

  if (assignedTo) {
    await createNotification({
      recipient: assignedTo,
      actor: req.user.id,
      team,
      task: task._id,
      type: "assignment",
      title: `Assigned: ${task.title}`,
      message: `${req.user.name || "A teammate"} assigned ${taskKey || "a task"} to you.`,
    });
  }

  const createdTask = await populateTaskQuery(Task.findById(task._id));
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

  const prevStatus = task.status;
  const prevPriority = task.priority;

  if (req.body.status !== undefined && req.body.status !== task.status) {
    await validateWipLimit(task.team, req.body.status, task._id);
  }

  const editableFields = [
    "title",
    "description",
    "status",
    "priority",
    "startDate",
    "dueDate",
    "estimatedMinutes",
    "position",
    "recurrence",
  ];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  });

  if (Array.isArray(req.body.labels)) {
    task.labels = [
      ...new Set(req.body.labels.map((l) => String(l).trim()).filter(Boolean)),
    ];
  }

  const now = new Date();
  if (req.body.status !== undefined && req.body.status !== prevStatus) {
    if (req.body.status === "in-progress" && !task.startedAt) {
      task.startedAt = now;
    }
    if (req.body.status === "done") {
      task.completedAt = now;
    } else if (prevStatus === "done") {
      task.completedAt = null;
    }
    appendActivity(
      task,
      req.user.id,
      "status_changed",
      `Moved from ${prevStatus} to ${req.body.status}`,
      prevStatus,
      req.body.status
    );
  }

  if (req.body.priority !== undefined && req.body.priority !== prevPriority) {
    appendActivity(
      task,
      req.user.id,
      "priority_changed",
      `Priority changed from ${prevPriority} to ${req.body.priority}`,
      prevPriority,
      req.body.priority
    );
  }

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
      const admin = await isTeamAdmin(task.team, req.user.id, req.user.role);
      if (!admin) {
        res.status(403);
        throw new Error("Only admins can assign or reassign tasks");
      }
      const reason =
        req.body.assignmentReason ||
        (nextAssigneeId ? "Task reassigned" : "Task unassigned");
      task.assignmentHistory.push({
        assignedTo: nextAssigneeId,
        assignedBy: req.user.id,
        assignedAt: now,
        reason,
      });
      appendActivity(task, req.user.id, "assigned", reason);
      task.assignedTo = nextAssigneeId;

      if (nextAssigneeId) {
        await createNotification({
          recipient: nextAssigneeId,
          actor: req.user.id,
          team: task.team,
          task: task._id,
          type: "assignment",
          title: `Assigned: ${task.title}`,
          message: `${req.user.name || "A teammate"} assigned ${task.taskKey || task.title} to you.`,
        });
      }
    }
  }

  task.updatedBy = req.user.id;
  await task.save();

  // Trigger workflow automations if status changed
  if (req.body.status !== undefined && req.body.status !== prevStatus) {
    await evaluateRules({
      trigger: "task_status_changed",
      task,
      actorId: req.user.id,
    });
    if (task.status === "done") {
      await evaluateRules({
        trigger: "task_completed",
        task,
        actorId: req.user.id,
      });
      await evaluateRules({
        trigger: "dependency_completed",
        task,
        actorId: req.user.id,
      });
    }
  }

  const updatedTask = await populateTaskQuery(Task.findById(task._id));
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

  const admin = await isTeamAdmin(task.team, req.user.id, req.user.role);
  if (!admin) {
    res.status(403);
    throw new Error("Only admins can delete tasks");
  }

  await task.deleteOne();
  res.json({ message: "Task removed" });
});

// @desc    Archive or restore a task
// @route   PATCH /api/tasks/:id/archive
// @access  Private
const toggleArchiveTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const admin = await isTeamAdmin(task.team, req.user.id, req.user.role);
  if (!admin) {
    res.status(403);
    throw new Error("Only admins can archive or restore tasks");
  }

  const shouldArchive =
    req.body.archived !== undefined ? Boolean(req.body.archived) : !task.archivedAt;
  task.archivedAt = shouldArchive ? new Date() : null;
  appendActivity(
    task,
    req.user.id,
    shouldArchive ? "archived" : "restored",
    shouldArchive ? "Task archived" : "Task restored from archive"
  );
  await task.save();

  res.json({ _id: task._id, archivedAt: task.archivedAt });
});

// @desc    Bulk update tasks (status, priority, archive)
// @route   POST /api/tasks/bulk
// @access  Private
const bulkUpdateTasks = asyncHandler(async (req, res) => {
  const { taskIds, updates } = req.body;
  if (!Array.isArray(taskIds) || taskIds.length === 0 || !updates) {
    res.status(400);
    throw new Error("taskIds and updates are required");
  }

  const tasks = await Task.find({ _id: { $in: taskIds } });
  let updatedCount = 0;

  for (const task of tasks) {
    const isMember = await isTeamMember(task.team, req.user.id);
    if (!isMember) continue;

    if (updates.status && updates.status !== task.status) {
      await validateWipLimit(task.team, updates.status, task._id);
      const prev = task.status;
      task.status = updates.status;
      if (updates.status === "done") task.completedAt = new Date();
      appendActivity(
        task,
        req.user.id,
        "status_changed",
        `Bulk moved from ${prev} to ${updates.status}`,
        prev,
        updates.status
      );
    }
    if (updates.priority) {
      task.priority = updates.priority;
    }
    if (updates.archived === true) {
      task.archivedAt = new Date();
    }
    task.updatedBy = req.user.id;
    await task.save();
    updatedCount += 1;
  }

  res.json({ updatedCount });
});

// @desc    Add a subtask
// @route   POST /api/tasks/:id/subtasks
// @access  Private
const addSubtask = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    res.status(400);
    throw new Error("Subtask title is required");
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

  task.subtasks.push({ title: title.trim(), completed: false });
  appendActivity(task, req.user.id, "subtask_added", `Added subtask "${title.trim()}"`);
  await task.save();

  const updated = await populateTaskQuery(Task.findById(task._id));
  res.status(201).json(updated);
});

// @desc    Toggle or update a subtask
// @route   PATCH /api/tasks/:id/subtasks/:subtaskId
// @access  Private
const updateSubtask = asyncHandler(async (req, res) => {
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

  const subtask = task.subtasks.id(req.params.subtaskId);
  if (!subtask) {
    res.status(404);
    throw new Error("Subtask not found");
  }

  if (typeof req.body.title === "string" && req.body.title.trim()) {
    subtask.title = req.body.title.trim();
  }
  if (typeof req.body.completed === "boolean") {
    subtask.completed = req.body.completed;
    subtask.completedAt = req.body.completed ? new Date() : null;
    subtask.completedBy = req.body.completed ? req.user.id : null;
    appendActivity(
      task,
      req.user.id,
      req.body.completed ? "subtask_completed" : "subtask_reopened",
      `${req.body.completed ? "Completed" : "Reopened"} subtask "${subtask.title}"`
    );
  }

  await task.save();

  if (
    task.subtasks.length > 0 &&
    task.subtasks.every((s) => s.completed) &&
    task.status !== "done"
  ) {
    await evaluateRules({
      trigger: "subtasks_all_completed",
      task,
      actorId: req.user.id,
    });
  }

  const updated = await populateTaskQuery(Task.findById(task._id));
  res.json(updated);
});

// @desc    Delete a subtask
// @route   DELETE /api/tasks/:id/subtasks/:subtaskId
// @access  Private
const deleteSubtask = asyncHandler(async (req, res) => {
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

  const subtask = task.subtasks.id(req.params.subtaskId);
  if (!subtask) {
    res.status(404);
    throw new Error("Subtask not found");
  }

  subtask.deleteOne();
  await task.save();

  const updated = await populateTaskQuery(Task.findById(task._id));
  res.json(updated);
});

// @desc    Add a task dependency (blocks, blocked_by, relates_to) with cycle prevention
// @route   POST /api/tasks/:id/dependencies
// @access  Private
const addDependency = asyncHandler(async (req, res) => {
  const { targetTaskId, type } = req.body;
  if (!targetTaskId || !["blocks", "blocked_by", "relates_to"].includes(type)) {
    res.status(400);
    throw new Error("Valid targetTaskId and dependency type are required");
  }

  const [task, targetTask] = await Promise.all([
    Task.findById(req.params.id),
    Task.findById(targetTaskId),
  ]);

  if (!task || !targetTask) {
    res.status(404);
    throw new Error("Task not found");
  }

  const isMember = await isTeamMember(task.team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to modify this task");
  }

  if (task.team.toString() !== targetTask.team.toString()) {
    res.status(400);
    throw new Error("Dependencies can only link tasks within the same team");
  }

  const duplicate = task.dependencies.some(
    (d) => d.task.toString() === targetTaskId.toString() && d.type === type
  );
  if (duplicate) {
    res.status(400);
    throw new Error("This dependency already exists");
  }

  const createsCycle = await wouldCreateCycle(task._id, targetTask._id, type);
  if (createsCycle) {
    res.status(400);
    throw new Error("Cannot add dependency: circular dependency detected");
  }

  task.dependencies.push({ task: targetTask._id, type });
  appendActivity(
    task,
    req.user.id,
    "dependency_added",
    `Added "${type}" link to ${targetTask.taskKey || targetTask.title}`
  );
  await task.save();

  const updated = await populateTaskQuery(Task.findById(task._id));
  res.status(201).json(updated);
});

// @desc    Remove a task dependency
// @route   DELETE /api/tasks/:id/dependencies/:depTaskId
// @access  Private
const removeDependency = asyncHandler(async (req, res) => {
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

  task.dependencies = task.dependencies.filter(
    (d) => d.task.toString() !== req.params.depTaskId
  );
  await task.save();

  const updated = await populateTaskQuery(Task.findById(task._id));
  res.json(updated);
});

// @desc    Add a comment to a task
// @route   POST /api/tasks/:id/comments
// @access  Private
const addComment = asyncHandler(async (req, res) => {
  const { body, mentions } = req.body;
  if (!body || !body.trim()) {
    res.status(400);
    throw new Error("Comment text is required");
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const isMember = await isTeamMember(task.team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to comment on this task");
  }

  const validMentions = Array.isArray(mentions) ? mentions : [];
  task.comments.push({
    author: req.user.id,
    body: body.trim(),
    mentions: validMentions,
  });
  appendActivity(task, req.user.id, "commented", "Added a comment");
  await task.save();

  // Notify assignee & mentioned teammates
  const notifyTargets = new Set(validMentions.map((id) => id.toString()));
  if (task.assignedTo) notifyTargets.add(task.assignedTo.toString());

  for (const recipientId of notifyTargets) {
    await createNotification({
      recipient: recipientId,
      actor: req.user.id,
      team: task.team,
      task: task._id,
      type: validMentions.map(String).includes(recipientId) ? "mention" : "comment",
      title: `New comment on ${task.taskKey || task.title}`,
      message: `${req.user.name || "A teammate"}: "${body.trim().slice(0, 80)}"`,
    });
  }

  const updated = await populateTaskQuery(Task.findById(task._id));
  res.status(201).json(updated);
});

// @desc    Delete a comment from a task
// @route   DELETE /api/tasks/:id/comments/:commentId
// @access  Private
const deleteComment = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const comment = task.comments.id(req.params.commentId);
  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }

  const role = await getMemberRole(task.team, req.user.id);
  if (comment.author.toString() !== req.user.id && role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to delete this comment");
  }

  comment.deleteOne();
  await task.save();

  const updated = await populateTaskQuery(Task.findById(task._id));
  res.json(updated);
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

  const admin = await isTeamAdmin(task.team, req.user.id, req.user.role);
  if (!admin) {
    res.status(403);
    throw new Error("Only admins can assign or reassign tasks");
  }

  const assigneeIsMember = await isTeamMember(task.team, assignedTo);
  if (!assigneeIsMember) {
    res.status(400);
    throw new Error("Assignee must be a member of the team");
  }

  task.assignmentHistory.push({
    assignedTo,
    assignedBy: req.user.id,
    assignedAt: new Date(),
    reason: reason || "Task assigned",
  });
  appendActivity(
    task,
    req.user.id,
    "assigned",
    reason || "Task assigned"
  );

  task.assignedTo = assignedTo;
  await task.save();

  await createNotification({
    recipient: assignedTo,
    actor: req.user.id,
    team: task.team,
    task: task._id,
    type: "assignment",
    title: `Assigned: ${task.title}`,
    message: reason || `${req.user.name || "A teammate"} assigned ${task.taskKey || task.title} to you.`,
  });

  const updatedTask = await populateTaskQuery(Task.findById(task._id));
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

  const admin = await isTeamAdmin(task.team, req.user.id, req.user.role);
  if (!admin) {
    res.status(403);
    throw new Error("Only admins can assign or reassign tasks");
  }

  if (!task.assignedTo) {
    res.status(400);
    throw new Error("Task is not assigned to anyone");
  }

  task.assignmentHistory.push({
    assignedTo: null,
    assignedBy: req.user.id,
    assignedAt: new Date(),
    reason: reason || "Task unassigned",
  });
  appendActivity(
    task,
    req.user.id,
    "unassigned",
    reason || "Task unassigned"
  );

  task.assignedTo = null;
  await task.save();

  const updatedTask = await populateTaskQuery(Task.findById(task._id));
  res.json(updatedTask);
});

// @desc    Get assignment history for a task
// @route   GET /api/tasks/:id/assignment-history
// @access  Private
const getAssignmentHistory = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .select("assignmentHistory activityHistory title taskKey assignedTo team")
    .populate("assignmentHistory.assignedTo", "name email")
    .populate("assignmentHistory.assignedBy", "name email")
    .populate("activityHistory.actor", "name email");

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
    taskKey: task.taskKey,
    taskTitle: task.title,
    currentAssignee: task.assignedTo,
    history: task.assignmentHistory.sort((a, b) => b.assignedAt - a.assignedAt),
    activityHistory: task.activityHistory.sort(
      (a, b) => b.createdAt - a.createdAt
    ),
  });
});

// @desc    Get tasks assigned to current user
// @route   GET /api/tasks/my-tasks
// @access  Private
const getMyTasks = asyncHandler(async (req, res) => {
  const { status, priority, page = 1, limit = 20 } = req.query;

  const filter = { assignedTo: req.user.id, archivedAt: null };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const tasks = await populateTaskQuery(
    Task.find(filter)
      .populate("team", "name keyPrefix")
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  );

  const total = await Task.countDocuments(filter);

  res.json({
    tasks,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
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

  const tasks = await Task.find({ team: { $in: teamIds }, archivedAt: null })
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("team", "name")
    .sort({ updatedAt: -1 })
    .limit(500);

  const now = new Date();
  const userId = req.user.id.toString();

  const stats = {
    total: tasks.length,
    backlog: 0,
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
    if (task.status === "backlog") stats.backlog += 1;
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

  const myTasks = await Task.find({ assignedTo: req.user.id, archivedAt: null })
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
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleArchiveTask,
  bulkUpdateTasks,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  addDependency,
  removeDependency,
  addComment,
  deleteComment,
  assignTask,
  unassignTask,
  getAssignmentHistory,
  getMyTasks,
  getTaskStats,
};

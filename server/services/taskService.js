const Task = require("../models/Task");
const Team = require("../models/Team");

/**
 * Check if a user is a member of a team.
 */
async function isTeamMember(teamId, userId) {
  const team = await Team.findById(teamId).select("members owner");
  if (!team) return false;
  return team.members.some((m) => m.user.toString() === userId.toString());
}

/**
 * Get a user's role within a team.
 */
async function getMemberRole(teamId, userId) {
  const team = await Team.findById(teamId).select("members owner");
  if (!team) return null;
  if (team.owner.toString() === userId.toString()) return "admin";
  const member = team.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
}

/**
 * Check if a user is a team admin (owner, team admin, or global admin).
 */
async function isTeamAdmin(teamId, userId, globalRole = "user") {
  if (globalRole === "admin") {
    return await isTeamMember(teamId, userId);
  }
  const role = await getMemberRole(teamId, userId);
  return role === "admin";
}

/**
 * Enforce column WIP limits when moving/creating a task in a status.
 */
async function validateWipLimit(teamId, targetStatus, excludeTaskId = null) {
  const team = await Team.findById(teamId).select("columns");
  if (!team || !Array.isArray(team.columns)) return;

  const col = team.columns.find((c) => c.key === targetStatus);
  if (!col || !col.wipLimit || col.wipLimit <= 0) return;

  const query = {
    team: teamId,
    status: targetStatus,
    archivedAt: null,
  };
  if (excludeTaskId) {
    query._id = { $ne: excludeTaskId };
  }

  const currentCount = await Task.countDocuments(query);
  if (currentCount >= col.wipLimit) {
    const err = new Error(
      `WIP limit reached for "${col.label}" (${currentCount}/${col.wipLimit}). Complete or move a task first.`
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Generate the next unique taskKey for a team (e.g. PRO-12).
 */
async function generateTaskKey(teamId) {
  const team = await Team.findByIdAndUpdate(
    teamId,
    { $inc: { taskCounter: 1 } },
    { new: true }
  ).select("keyPrefix taskCounter");
  if (!team) return null;
  const prefix = team.keyPrefix || "TM";
  return `${prefix}-${team.taskCounter}`;
}

/**
 * Detect circular dependencies using BFS before adding a directed dependency edge.
 * If taskId -> targetTaskId (blocks or blocked_by), ensure no path exists in reverse.
 */
async function wouldCreateCycle(taskId, targetTaskId, type) {
  if (taskId.toString() === targetTaskId.toString()) return true;
  if (type === "relates_to") return false;

  // For "blocks": taskId blocks targetTaskId (edge: taskId -> targetTaskId).
  // Cycle exists if targetTaskId already reaches taskId via "blocks" edges.
  // For "blocked_by": taskId is blocked by targetTaskId (edge: targetTaskId -> taskId).
  // Cycle exists if taskId already reaches targetTaskId via "blocks" edges.
  const startNode = type === "blocks" ? targetTaskId.toString() : taskId.toString();
  const goalNode = type === "blocks" ? taskId.toString() : targetTaskId.toString();

  const task = await Task.findById(taskId).select("team");
  if (!task) return false;

  const teamTasks = await Task.find({ team: task.team, archivedAt: null }).select(
    "_id dependencies"
  );

  const adj = new Map();
  for (const t of teamTasks) {
    const id = t._id.toString();
    if (!adj.has(id)) adj.set(id, new Set());
    for (const dep of t.dependencies || []) {
      const depId = dep.task.toString();
      if (dep.type === "blocks") {
        adj.get(id).add(depId);
      } else if (dep.type === "blocked_by") {
        if (!adj.has(depId)) adj.set(depId, new Set());
        adj.get(depId).add(id);
      }
    }
  }

  const visited = new Set([startNode]);
  const queue = [startNode];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === goalNode) return true;
    const neighbors = adj.get(current);
    if (!neighbors) continue;
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

function appendActivity(task, actorId, action, details, fromValue, toValue) {
  task.activityHistory.push({
    actor: actorId,
    action,
    details,
    fromValue: fromValue !== undefined ? String(fromValue) : undefined,
    toValue: toValue !== undefined ? String(toValue) : undefined,
    createdAt: new Date(),
  });
}

module.exports = {
  isTeamMember,
  getMemberRole,
  isTeamAdmin,
  validateWipLimit,
  generateTaskKey,
  wouldCreateCycle,
  appendActivity,
};

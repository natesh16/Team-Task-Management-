const Task = require("../models/Task");
const Team = require("../models/Team");
const TimeEntry = require("../models/TimeEntry");

/**
 * Compute authentic analytics from actual historical task and time-entry data.
 * Never fabricates metrics; returns null for cycle/lead time when unavailable.
 */
async function getAnalytics({ userId, teamId = null, assigneeId = null, days = 30 }) {
  const userTeams = await Team.find({ "members.user": userId }).select(
    "_id name members columns"
  );
  const allowedTeamIds = userTeams.map((t) => t._id.toString());

  let targetTeamIds = userTeams.map((t) => t._id);
  if (teamId) {
    if (!allowedTeamIds.includes(teamId.toString())) {
      const err = new Error("Not authorized to view analytics for this team");
      err.statusCode = 403;
      throw err;
    }
    targetTeamIds = [teamId];
  }

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - (days - 1));
  windowStart.setHours(0, 0, 0, 0);

  const taskFilter = {
    team: { $in: targetTeamIds },
    archivedAt: null,
  };
  if (assigneeId) {
    taskFilter.assignedTo = assigneeId;
  }

  const tasks = await Task.find(taskFilter)
    .populate("assignedTo", "name email")
    .populate("team", "name")
    .lean();

  const timeEntries = await TimeEntry.find({
    team: { $in: targetTeamIds },
    isRunning: false,
    startedAt: { $gte: windowStart },
  }).lean();

  // KPIs
  const total = tasks.length;
  let completed = 0;
  let pending = 0;
  let inProgress = 0;
  let overdue = 0;

  const statusBreakdown = {
    backlog: 0,
    todo: 0,
    "in-progress": 0,
    review: 0,
    done: 0,
  };

  const priorityBreakdown = {
    low: 0,
    medium: 0,
    high: 0,
  };

  let cycleTimeSumHours = 0;
  let cycleTimeCount = 0;
  let leadTimeSumHours = 0;
  let leadTimeCount = 0;

  let totalEstimatedMinutes = 0;
  let totalActualMinutes = 0;

  const workloadMap = new Map();

  // Throughput daily buckets
  const throughputMap = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    throughputMap.set(key, { date: key, created: 0, completed: 0 });
  }

  for (const task of tasks) {
    if (statusBreakdown[task.status] !== undefined) {
      statusBreakdown[task.status] += 1;
    }
    if (priorityBreakdown[task.priority] !== undefined) {
      priorityBreakdown[task.priority] += 1;
    }

    if (task.status === "done") {
      completed += 1;
    } else {
      pending += 1;
      if (task.status === "in-progress" || task.status === "review") {
        inProgress += 1;
      }
      if (task.dueDate && new Date(task.dueDate) < now) {
        overdue += 1;
      }
    }

    totalEstimatedMinutes += task.estimatedMinutes || 0;
    totalActualMinutes += task.actualMinutes || 0;

    // Lead time: createdAt -> completedAt
    if (task.status === "done" && task.completedAt && task.createdAt) {
      const leadMs =
        new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime();
      if (leadMs >= 0) {
        leadTimeSumHours += leadMs / (1000 * 60 * 60);
        leadTimeCount += 1;
      }
    }

    // Cycle time: startedAt -> completedAt
    if (task.status === "done" && task.completedAt && task.startedAt) {
      const cycleMs =
        new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime();
      if (cycleMs >= 0) {
        cycleTimeSumHours += cycleMs / (1000 * 60 * 60);
        cycleTimeCount += 1;
      }
    }

    // Throughput buckets
    if (task.createdAt) {
      const cKey = new Date(task.createdAt).toISOString().slice(0, 10);
      if (throughputMap.has(cKey)) throughputMap.get(cKey).created += 1;
    }
    if (task.completedAt) {
      const dKey = new Date(task.completedAt).toISOString().slice(0, 10);
      if (throughputMap.has(dKey)) throughputMap.get(dKey).completed += 1;
    }

    // Workload per assignee
    const assigneeKey = task.assignedTo?._id
      ? task.assignedTo._id.toString()
      : "unassigned";
    const assigneeName = task.assignedTo?.name || "Unassigned";
    if (!workloadMap.has(assigneeKey)) {
      workloadMap.set(assigneeKey, {
        userId: assigneeKey,
        name: assigneeName,
        total: 0,
        open: 0,
        done: 0,
        overdue: 0,
        estimatedMinutes: 0,
        actualMinutes: 0,
      });
    }
    const w = workloadMap.get(assigneeKey);
    w.total += 1;
    if (task.status === "done") {
      w.done += 1;
    } else {
      w.open += 1;
      if (task.dueDate && new Date(task.dueDate) < now) w.overdue += 1;
    }
    w.estimatedMinutes += task.estimatedMinutes || 0;
    w.actualMinutes += task.actualMinutes || 0;
  }

  const totalLoggedMinutes = timeEntries.reduce(
    (sum, e) => sum + (e.durationMinutes || Math.round((e.durationSeconds || 0) / 60)),
    0
  );

  return {
    kpis: {
      total,
      completed,
      pending,
      inProgress,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgCycleTimeHours:
        cycleTimeCount > 0
          ? Number((cycleTimeSumHours / cycleTimeCount).toFixed(1))
          : null,
      avgLeadTimeHours:
        leadTimeCount > 0
          ? Number((leadTimeSumHours / leadTimeCount).toFixed(1))
          : null,
      cycleTimeSampleSize: cycleTimeCount,
      leadTimeSampleSize: leadTimeCount,
      totalEstimatedMinutes,
      totalActualMinutes,
      totalLoggedMinutesInWindow: totalLoggedMinutes,
    },
    statusBreakdown,
    priorityBreakdown,
    throughput: Array.from(throughputMap.values()),
    workload: Array.from(workloadMap.values()).sort((a, b) => b.open - a.open),
  };
}

/**
 * Generate a CSV export of team/workspace tasks for reporting.
 */
async function exportTasksCsv({ userId, teamId = null }) {
  const userTeams = await Team.find({ "members.user": userId }).select("_id");
  const allowedTeamIds = userTeams.map((t) => t._id.toString());
  let targetTeamIds = userTeams.map((t) => t._id);

  if (teamId) {
    if (!allowedTeamIds.includes(teamId.toString())) {
      const err = new Error("Not authorized to export this team");
      err.statusCode = 403;
      throw err;
    }
    targetTeamIds = [teamId];
  }

  const tasks = await Task.find({ team: { $in: targetTeamIds }, archivedAt: null })
    .populate("team", "name")
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const escapeCsv = (val) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    "Key",
    "Title",
    "Team",
    "Status",
    "Priority",
    "Assignee",
    "Due Date",
    "Estimated Minutes",
    "Actual Minutes",
    "Subtasks Done",
    "Subtasks Total",
    "Created At",
    "Completed At",
  ];

  const rows = tasks.map((t) => {
    const subTotal = (t.subtasks || []).length;
    const subDone = (t.subtasks || []).filter((s) => s.completed).length;
    return [
      t.taskKey || "",
      t.title,
      t.team?.name || "",
      t.status,
      t.priority,
      t.assignedTo?.name || "Unassigned",
      t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "",
      t.estimatedMinutes || 0,
      t.actualMinutes || 0,
      subDone,
      subTotal,
      t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : "",
      t.completedAt ? new Date(t.completedAt).toISOString().slice(0, 10) : "",
    ]
      .map(escapeCsv)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

module.exports = {
  getAnalytics,
  exportTasksCsv,
};

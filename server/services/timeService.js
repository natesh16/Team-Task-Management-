const TimeEntry = require("../models/TimeEntry");
const Task = require("../models/Task");
const Team = require("../models/Team");

/**
 * Compute live elapsed seconds for an entry using server-side timestamps.
 */
function computeElapsedSeconds(entry, now = new Date()) {
  if (!entry) return 0;
  if (!entry.isRunning) return entry.durationSeconds || 0;
  if (entry.isPaused) return entry.accumulatedSeconds || 0;
  const activeStart = entry.pausedAt ? entry.pausedAt : entry.startedAt;
  const runningDelta = Math.max(
    0,
    Math.floor((now.getTime() - new Date(activeStart).getTime()) / 1000)
  );
  return (entry.accumulatedSeconds || 0) + runningDelta;
}

/**
 * Recalculate and persist Task.actualMinutes from all completed time entries.
 */
async function syncTaskActualMinutes(taskId) {
  if (!taskId) return;
  const entries = await TimeEntry.find({
    task: taskId,
    isRunning: false,
  }).select("durationSeconds durationMinutes");

  const totalSeconds = entries.reduce(
    (sum, item) =>
      sum + (item.durationSeconds || (item.durationMinutes || 0) * 60),
    0
  );
  const actualMinutes = Math.round(totalSeconds / 60);
  await Task.findByIdAndUpdate(taskId, { actualMinutes });
}

/**
 * Get the currently active (running or paused) timer for a user.
 */
async function getActiveTimer(userId) {
  const entry = await TimeEntry.findOne({ user: userId, isRunning: true })
    .populate("task", "title taskKey status team")
    .populate("team", "name");
  if (!entry) return null;

  const obj = entry.toObject();
  obj.elapsedSeconds = computeElapsedSeconds(entry);
  return obj;
}

/**
 * Start a Pomodoro or Stopwatch timer. Enforces one active timer per user.
 */
async function startTimer(
  userId,
  { taskId = null, mode = "pomodoro", phase = "focus", plannedMinutes = 25, description = "" }
) {
  const existing = await TimeEntry.findOne({ user: userId, isRunning: true });
  if (existing) {
    const err = new Error(
      "You already have an active timer running. Stop or finish it before starting another."
    );
    err.statusCode = 400;
    throw err;
  }

  let teamId = null;
  if (taskId) {
    const task = await Task.findById(taskId).select("team");
    if (!task) {
      const err = new Error("Task not found");
      err.statusCode = 404;
      throw err;
    }
    teamId = task.team;
  }

  const entry = await TimeEntry.create({
    user: userId,
    task: taskId || null,
    team: teamId,
    mode: mode === "stopwatch" ? "stopwatch" : "pomodoro",
    phase: phase || "focus",
    plannedMinutes: mode === "stopwatch" ? 0 : Math.max(1, Number(plannedMinutes) || 25),
    startedAt: new Date(),
    pausedAt: null,
    accumulatedSeconds: 0,
    isRunning: true,
    isPaused: false,
    description: (description || "").trim(),
  });

  const populated = await TimeEntry.findById(entry._id)
    .populate("task", "title taskKey status team")
    .populate("team", "name");
  const obj = populated.toObject();
  obj.elapsedSeconds = 0;
  return obj;
}

/**
 * Pause a running timer.
 */
async function pauseTimer(userId, entryId) {
  const entry = await TimeEntry.findOne({
    _id: entryId,
    user: userId,
    isRunning: true,
  });
  if (!entry) {
    const err = new Error("Active timer not found");
    err.statusCode = 404;
    throw err;
  }
  if (entry.isPaused) {
    return entry;
  }

  const now = new Date();
  entry.accumulatedSeconds = computeElapsedSeconds(entry, now);
  entry.pausedAt = now;
  entry.isPaused = true;
  await entry.save();

  const obj = entry.toObject();
  obj.elapsedSeconds = entry.accumulatedSeconds;
  return obj;
}

/**
 * Resume a paused timer.
 */
async function resumeTimer(userId, entryId) {
  const entry = await TimeEntry.findOne({
    _id: entryId,
    user: userId,
    isRunning: true,
  });
  if (!entry) {
    const err = new Error("Active timer not found");
    err.statusCode = 404;
    throw err;
  }
  if (!entry.isPaused) {
    return entry;
  }

  entry.pausedAt = new Date(); // anchor for next running interval
  entry.isPaused = false;
  await entry.save();

  const obj = entry.toObject();
  obj.elapsedSeconds = entry.accumulatedSeconds;
  return obj;
}

/**
 * Stop and finalize an active timer.
 */
async function stopTimer(userId, entryId, { completedPomodoro = false, description } = {}) {
  const entry = await TimeEntry.findOne({
    _id: entryId,
    user: userId,
    isRunning: true,
  });
  if (!entry) {
    const err = new Error("Active timer not found");
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  const totalSeconds = computeElapsedSeconds(entry, now);
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));

  entry.durationSeconds = totalSeconds;
  entry.durationMinutes = totalSeconds < 10 ? 0 : totalMinutes;
  entry.endedAt = now;
  entry.isRunning = false;
  entry.isPaused = false;
  entry.completedPomodoro =
    entry.mode === "pomodoro" && entry.phase === "focus" && Boolean(completedPomodoro);
  if (typeof description === "string") {
    entry.description = description.trim();
  }

  await entry.save();

  if (entry.task) {
    await syncTaskActualMinutes(entry.task);
  }

  return TimeEntry.findById(entry._id)
    .populate("task", "title taskKey status team")
    .populate("team", "name");
}

/**
 * Log a manual time entry.
 */
async function createManualEntry(
  userId,
  { taskId = null, durationMinutes, description = "", startedAt }
) {
  const mins = Number(durationMinutes);
  if (!Number.isFinite(mins) || mins <= 0) {
    const err = new Error("Duration in minutes must be greater than 0");
    err.statusCode = 400;
    throw err;
  }

  let teamId = null;
  if (taskId) {
    const task = await Task.findById(taskId).select("team");
    if (!task) {
      const err = new Error("Task not found");
      err.statusCode = 404;
      throw err;
    }
    teamId = task.team;
  }

  const start = startedAt ? new Date(startedAt) : new Date();
  const end = new Date(start.getTime() + mins * 60 * 1000);

  const entry = await TimeEntry.create({
    user: userId,
    task: taskId || null,
    team: teamId,
    mode: "manual",
    phase: "focus",
    plannedMinutes: mins,
    durationMinutes: Math.round(mins),
    durationSeconds: Math.round(mins * 60),
    startedAt: start,
    endedAt: end,
    isRunning: false,
    isPaused: false,
    description: (description || "").trim(),
  });

  if (taskId) {
    await syncTaskActualMinutes(taskId);
  }

  return TimeEntry.findById(entry._id)
    .populate("task", "title taskKey status team")
    .populate("team", "name");
}

/**
 * Build productivity summary for a user (daily, weekly, per-project, per-task).
 */
async function getTimeSummary(userId, { days = 7 } = {}) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowStart = new Date(startOfToday);
  windowStart.setDate(windowStart.getDate() - (days - 1));

  const entries = await TimeEntry.find({
    user: userId,
    isRunning: false,
    startedAt: { $gte: windowStart },
  })
    .populate("task", "title taskKey estimatedMinutes actualMinutes")
    .populate("team", "name")
    .sort({ startedAt: -1 });

  let todayMinutes = 0;
  let weeklyMinutes = 0;
  let completedPomodoros = 0;
  const byProjectMap = new Map();
  const byTaskMap = new Map();
  const dailyMap = new Map();

  for (let i = 0; i < days; i += 1) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, minutes: 0, pomodoros: 0 });
  }

  for (const entry of entries) {
    if (entry.phase !== "focus" && entry.mode === "pomodoro") continue;
    const mins = entry.durationMinutes || Math.round((entry.durationSeconds || 0) / 60);
    weeklyMinutes += mins;
    if (new Date(entry.startedAt) >= startOfToday) {
      todayMinutes += mins;
    }
    if (entry.completedPomodoro) {
      completedPomodoros += 1;
    }

    const dayKey = new Date(entry.startedAt).toISOString().slice(0, 10);
    if (dailyMap.has(dayKey)) {
      const bucket = dailyMap.get(dayKey);
      bucket.minutes += mins;
      if (entry.completedPomodoro) bucket.pomodoros += 1;
    }

    const teamKey = entry.team?._id?.toString() || "personal";
    const teamName = entry.team?.name || "Unassigned / Personal";
    if (!byProjectMap.has(teamKey)) {
      byProjectMap.set(teamKey, { teamId: teamKey, name: teamName, minutes: 0 });
    }
    byProjectMap.get(teamKey).minutes += mins;

    if (entry.task) {
      const tKey = entry.task._id.toString();
      if (!byTaskMap.has(tKey)) {
        byTaskMap.set(tKey, {
          taskId: tKey,
          taskKey: entry.task.taskKey || "",
          title: entry.task.title,
          estimatedMinutes: entry.task.estimatedMinutes || 0,
          actualMinutes: entry.task.actualMinutes || 0,
          loggedMinutes: 0,
        });
      }
      byTaskMap.get(tKey).loggedMinutes += mins;
    }
  }

  return {
    todayMinutes,
    weeklyMinutes,
    completedPomodoros,
    daily: Array.from(dailyMap.values()),
    byProject: Array.from(byProjectMap.values()),
    byTask: Array.from(byTaskMap.values()),
  };
}

module.exports = {
  getActiveTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  createManualEntry,
  getTimeSummary,
  syncTaskActualMinutes,
};

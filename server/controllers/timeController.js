const asyncHandler = require("express-async-handler");
const TimeEntry = require("../models/TimeEntry");
const timeService = require("../services/timeService");

const getActive = asyncHandler(async (req, res) => {
  const active = await timeService.getActiveTimer(req.user.id);
  res.json({ active });
});

const start = asyncHandler(async (req, res) => {
  const entry = await timeService.startTimer(req.user.id, req.body);
  res.status(201).json(entry);
});

const pause = asyncHandler(async (req, res) => {
  const entry = await timeService.pauseTimer(req.user.id, req.params.id);
  res.json(entry);
});

const resume = asyncHandler(async (req, res) => {
  const entry = await timeService.resumeTimer(req.user.id, req.params.id);
  res.json(entry);
});

const stop = asyncHandler(async (req, res) => {
  const entry = await timeService.stopTimer(req.user.id, req.params.id, req.body);
  res.json(entry);
});

const createManual = asyncHandler(async (req, res) => {
  const entry = await timeService.createManualEntry(req.user.id, req.body);
  res.status(201).json(entry);
});

const getEntries = asyncHandler(async (req, res) => {
  const { taskId, limit = 50 } = req.query;
  const filter = { user: req.user.id, isRunning: false };
  if (taskId) filter.task = taskId;

  const entries = await TimeEntry.find(filter)
    .populate("task", "title taskKey status")
    .populate("team", "name")
    .sort({ startedAt: -1 })
    .limit(Math.min(200, parseInt(limit, 10) || 50));

  res.json(entries);
});

const deleteEntry = asyncHandler(async (req, res) => {
  const entry = await TimeEntry.findOne({
    _id: req.params.id,
    user: req.user.id,
  });
  if (!entry) {
    res.status(404);
    throw new Error("Time entry not found");
  }
  const taskId = entry.task;
  await entry.deleteOne();
  if (taskId) {
    await timeService.syncTaskActualMinutes(taskId);
  }
  res.json({ message: "Time entry removed" });
});

const getSummary = asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
  const summary = await timeService.getTimeSummary(req.user.id, { days });
  res.json(summary);
});

module.exports = {
  getActive,
  start,
  pause,
  resume,
  stop,
  createManual,
  getEntries,
  deleteEntry,
  getSummary,
};

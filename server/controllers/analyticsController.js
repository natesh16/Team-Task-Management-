const asyncHandler = require("express-async-handler");
const analyticsService = require("../services/analyticsService");

const getOverview = asyncHandler(async (req, res) => {
  const { team, assignee, days = 30 } = req.query;
  const data = await analyticsService.getAnalytics({
    userId: req.user.id,
    teamId: team || null,
    assigneeId: assignee || null,
    days: Math.min(180, Math.max(7, parseInt(days, 10) || 30)),
  });
  res.json(data);
});

const exportCsv = asyncHandler(async (req, res) => {
  const { team } = req.query;
  const csv = await analyticsService.exportTasksCsv({
    userId: req.user.id,
    teamId: team || null,
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="taskmaster-report.csv"');
  res.send(csv);
});

module.exports = {
  getOverview,
  exportCsv,
};

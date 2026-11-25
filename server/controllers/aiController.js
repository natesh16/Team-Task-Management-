const asyncHandler = require("express-async-handler");
const aiService = require("../services/aiService");

const plan = asyncHandler(async (req, res) => {
  const { prompt, teamId } = req.body;
  const result = await aiService.planObjective({
    userId: req.user.id,
    prompt,
    teamId: teamId || null,
  });
  res.json(result);
});

const insights = asyncHandler(async (req, res) => {
  const result = await aiService.getProductivityInsights(req.user.id);
  res.json(result);
});

module.exports = {
  plan,
  insights,
};

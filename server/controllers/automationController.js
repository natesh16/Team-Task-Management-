const asyncHandler = require("express-async-handler");
const AutomationRule = require("../models/AutomationRule");
const AutomationLog = require("../models/AutomationLog");
const { isTeamMember, getMemberRole } = require("../services/taskService");

const getRules = asyncHandler(async (req, res) => {
  const { team } = req.query;
  if (!team) {
    res.status(400);
    throw new Error("Team ID is required");
  }
  const isMember = await isTeamMember(team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to view automation rules for this team");
  }

  const [rules, logs] = await Promise.all([
    AutomationRule.find({ team }).sort({ createdAt: -1 }),
    AutomationLog.find({ team })
      .populate("rule", "name")
      .populate("task", "title taskKey")
      .sort({ createdAt: -1 })
      .limit(30),
  ]);

  res.json({ rules, logs });
});

const createRule = asyncHandler(async (req, res) => {
  const { name, team, trigger, condition, action } = req.body;
  if (!name || !team || !trigger || !action?.type) {
    res.status(400);
    throw new Error("Name, team, trigger, and action.type are required");
  }

  const role = await getMemberRole(team, req.user.id);
  if (!role) {
    res.status(403);
    throw new Error("Not authorized to create rules for this team");
  }

  const rule = await AutomationRule.create({
    name: name.trim(),
    team,
    createdBy: req.user.id,
    trigger,
    condition: condition || {},
    action,
    enabled: true,
  });

  res.status(201).json(rule);
});

const toggleRule = asyncHandler(async (req, res) => {
  const rule = await AutomationRule.findById(req.params.id);
  if (!rule) {
    res.status(404);
    throw new Error("Automation rule not found");
  }
  const isMember = await isTeamMember(rule.team, req.user.id);
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized");
  }

  rule.enabled =
    typeof req.body.enabled === "boolean" ? req.body.enabled : !rule.enabled;
  await rule.save();
  res.json(rule);
});

const deleteRule = asyncHandler(async (req, res) => {
  const rule = await AutomationRule.findById(req.params.id);
  if (!rule) {
    res.status(404);
    throw new Error("Automation rule not found");
  }
  const role = await getMemberRole(rule.team, req.user.id);
  if (!role) {
    res.status(403);
    throw new Error("Not authorized");
  }

  await rule.deleteOne();
  res.json({ message: "Automation rule removed" });
});

module.exports = {
  getRules,
  createRule,
  toggleRule,
  deleteRule,
};

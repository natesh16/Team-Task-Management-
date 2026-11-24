const asyncHandler = require("express-async-handler");
const Team = require("../models/Team");
const Task = require("../models/Task");

// @desc    Get all teams for user
// @route   GET /api/teams
// @access  Private
const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({
    "members.user": req.user.id,
  })
    .populate("owner members.user", "name email")
    .sort({ createdAt: -1 });

  res.json(teams);
});

// @desc    Create a team
// @route   POST /api/teams
// @access  Private
const createTeam = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("Please add a team name");
  }

  const team = await Team.create({
    name: name.trim(),
    description: description?.trim() || "",
    owner: req.user.id,
    members: [{ user: req.user.id, role: "admin" }],
  });

  const populated = await Team.findById(team._id).populate(
    "owner members.user",
    "name email"
  );

  res.status(201).json(populated);
});

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private
const getTeamById = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id).populate(
    "owner members.user",
    "name email"
  );

  if (!team) {
    res.status(404);
    throw new Error("Team not found");
  }

  const isMember = team.members.some(
    (m) => m.user && m.user._id.toString() === req.user.id
  );
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to access this team");
  }

  res.json(team);
});

// @desc    Join team by invite code
// @route   POST /api/teams/join
// @access  Private
const joinTeam = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    res.status(400);
    throw new Error("Please provide an invite code");
  }

  const team = await Team.findOne({
    inviteCode: inviteCode.toString().trim().toUpperCase(),
  });
  if (!team) {
    res.status(404);
    throw new Error("Invalid invite code");
  }

  const alreadyMember = team.members.some(
    (m) => m.user.toString() === req.user.id
  );
  if (alreadyMember) {
    res.status(400);
    throw new Error("You are already a member of this team");
  }

  team.members.push({ user: req.user.id, role: "member" });
  await team.save();

  const updatedTeam = await Team.findById(team._id).populate(
    "owner members.user",
    "name email"
  );
  res.json(updatedTeam);
});

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private
const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    res.status(404);
    throw new Error("Team not found");
  }

  if (team.owner.toString() !== req.user.id) {
    res.status(403);
    throw new Error("Only the team owner can update this team");
  }

  if (typeof req.body.name === "string" && req.body.name.trim()) {
    team.name = req.body.name.trim();
  }
  if (typeof req.body.description === "string") {
    team.description = req.body.description.trim();
  }

  await team.save();

  const updatedTeam = await Team.findById(team._id).populate(
    "owner members.user",
    "name email"
  );

  res.json(updatedTeam);
});

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private
const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    res.status(404);
    throw new Error("Team not found");
  }

  if (team.owner.toString() !== req.user.id) {
    res.status(403);
    throw new Error("Only the team owner can delete this team");
  }

  // Remove all tasks that belong to this team
  await Task.deleteMany({ team: team._id });
  await team.deleteOne();

  res.json({ message: "Team removed", _id: req.params.id });
});

module.exports = {
  getTeams,
  createTeam,
  getTeamById,
  joinTeam,
  updateTeam,
  deleteTeam,
};

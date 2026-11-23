const asyncHandler = require("express-async-handler");
const Team = require("../models/Team");
const User = require("../models/User");

// @desc    Get all teams for user
// @route   GET /api/teams
// @access  Private
const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({
    "members.user": req.user.id,
  }).populate("owner members.user", "name email");
  res.json(teams);
});

// @desc    Create a team
// @route   POST /api/teams
// @access  Private
const createTeam = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const team = await Team.create({
    name,
    description,
    owner: req.user.id,
    members: [{ user: req.user.id, role: "admin" }],
  });

  res.status(201).json(team);
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
    (m) => m.user._id.toString() === req.user.id
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

  const team = await Team.findOne({ inviteCode });
  if (!team) {
    res.status(404);
    throw new Error("Invalid invite code");
  }

  const alreadyMember = team.members.some(
    (m) => m.user.toString() === req.user.id
  );
  if (alreadyMember) {
    res.status(400);
    throw new Error("Already a member of this team");
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
    throw new Error("Not authorized to update this team");
  }

  const updatedTeam = await Team.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  }).populate("owner members.user", "name email");

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
    throw new Error("Not authorized to delete this team");
  }

  await team.deleteOne();
  res.json({ message: "Team removed" });
});

module.exports = {
  getTeams,
  createTeam,
  getTeamById,
  joinTeam,
  updateTeam,
  deleteTeam,
};

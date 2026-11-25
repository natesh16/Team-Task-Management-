const asyncHandler = require("express-async-handler");
const Board = require("../models/Board");
const Team = require("../models/Team");
const Task = require("../models/Task");
const { isTeamMember, isTeamAdmin } = require("../services/taskService");

// @desc    Get all boards for a team (auto-creates Main Board if none exist)
// @route   GET /api/boards?team=:teamId
// @access  Private
const getBoards = asyncHandler(async (req, res) => {
  const { team } = req.query;
  if (!team) {
    res.status(400);
    throw new Error("Team ID is required");
  }

  const teamDoc = await Team.findById(team);
  if (!teamDoc) {
    res.status(404);
    throw new Error("Team not found");
  }

  const member = await isTeamMember(team, req.user.id);
  if (!member) {
    res.status(403);
    throw new Error("Not authorized to view boards for this team");
  }

  let boards = await Board.find({ team }).sort({ isDefault: -1, createdAt: 1 });

  if (boards.length === 0) {
    const defaultBoard = await Board.create({
      name: "Main Board",
      description: "Default team Kanban board",
      team,
      createdBy: teamDoc.owner,
      isDefault: true,
      columns: teamDoc.columns?.length
        ? teamDoc.columns
        : Team.DEFAULT_COLUMNS.map((c) => ({ ...c })),
    });
    // Backfill any existing tasks without a board into the Main Board
    await Task.updateMany(
      { team, board: null },
      { $set: { board: defaultBoard._id } }
    );
    boards = [defaultBoard];
  }

  res.json(boards);
});

// @desc    Create a new task board in a team (Admin only)
// @route   POST /api/boards
// @access  Private (Team Admin / Owner)
const createBoard = asyncHandler(async (req, res) => {
  const { name, description, team } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("Please provide a board name");
  }
  if (!team) {
    res.status(400);
    throw new Error("Team ID is required");
  }

  const teamDoc = await Team.findById(team);
  if (!teamDoc) {
    res.status(404);
    throw new Error("Team not found");
  }

  const admin = await isTeamAdmin(team, req.user.id, req.user.role);
  if (!admin) {
    res.status(403);
    throw new Error("Only admins can create new task boards");
  }

  const existingCount = await Board.countDocuments({ team });
  const board = await Board.create({
    name: name.trim(),
    description: description ? description.trim() : "",
    team,
    createdBy: req.user.id,
    isDefault: existingCount === 0,
    columns: teamDoc.columns?.length
      ? teamDoc.columns.map((c) => ({ ...c.toObject ? c.toObject() : c }))
      : Team.DEFAULT_COLUMNS.map((c) => ({ ...c })),
  });

  res.status(201).json(board);
});

// @desc    Update a board (name, description, columns)
// @route   PUT /api/boards/:id
// @access  Private (Team Admin / Owner)
const updateBoard = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  const admin = await isTeamAdmin(board.team, req.user.id, req.user.role);
  if (!admin) {
    res.status(403);
    throw new Error("Only admins can update task boards");
  }

  if (typeof req.body.name === "string" && req.body.name.trim()) {
    board.name = req.body.name.trim();
  }
  if (typeof req.body.description === "string") {
    board.description = req.body.description.trim();
  }
  if (Array.isArray(req.body.columns) && req.body.columns.length > 0) {
    board.columns = req.body.columns;
  }

  await board.save();
  res.json(board);
});

// @desc    Delete a board and its tasks (Admin only; cannot delete last board)
// @route   DELETE /api/boards/:id
// @access  Private (Team Admin / Owner)
const deleteBoard = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  const admin = await isTeamAdmin(board.team, req.user.id, req.user.role);
  if (!admin) {
    res.status(403);
    throw new Error("Only admins can delete task boards");
  }

  const count = await Board.countDocuments({ team: board.team });
  if (count <= 1) {
    res.status(400);
    throw new Error("Cannot delete the last remaining board in a team");
  }

  await Task.deleteMany({ board: board._id });
  await board.deleteOne();

  res.json({ message: "Board deleted", _id: req.params.id });
});

module.exports = {
  getBoards,
  createBoard,
  updateBoard,
  deleteBoard,
};

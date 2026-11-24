const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const userExists = await User.findOne({ email: email.toLowerCase().trim() });
  if (userExists) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid user data");
  }

  res.status(201).json({
    ...sanitizeUser(user),
    token: generateToken(user._id),
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password"
  );

  if (user && (await user.matchPassword(password))) {
    res.json({
      ...sanitizeUser(user),
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json(sanitizeUser(user));
});

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (typeof req.body.name === "string" && req.body.name.trim()) {
    user.name = req.body.name.trim();
  }

  if (req.body.password) {
    if (req.body.password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }
    user.password = req.body.password;
  }

  const updated = await user.save();
  res.json(sanitizeUser(updated));
});

module.exports = { registerUser, loginUser, getMe, updateMe };

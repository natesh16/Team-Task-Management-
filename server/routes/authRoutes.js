const express = require("express");
const { protect } = require("../middleware/auth");
const {
  registerUser,
  loginUser,
  getMe,
  updateMe,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

module.exports = router;

const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getRules,
  createRule,
  toggleRule,
  deleteRule,
} = require("../controllers/automationController");

const router = express.Router();

router.route("/").get(protect, getRules).post(protect, createRule);
router.patch("/:id/toggle", protect, toggleRule);
router.delete("/:id", protect, deleteRule);

module.exports = router;

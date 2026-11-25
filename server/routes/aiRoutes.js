const express = require("express");
const { protect } = require("../middleware/auth");
const { plan, insights } = require("../controllers/aiController");

const router = express.Router();

router.post("/plan", protect, plan);
router.get("/insights", protect, insights);

module.exports = router;

const express = require("express");
const { protect } = require("../middleware/auth");
const { getOverview, exportCsv } = require("../controllers/analyticsController");

const router = express.Router();

router.get("/overview", protect, getOverview);
router.get("/export", protect, exportCsv);

module.exports = router;

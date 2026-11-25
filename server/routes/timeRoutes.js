const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getActive,
  start,
  pause,
  resume,
  stop,
  createManual,
  getEntries,
  deleteEntry,
  getSummary,
} = require("../controllers/timeController");

const router = express.Router();

router.get("/active", protect, getActive);
router.get("/summary", protect, getSummary);
router.get("/entries", protect, getEntries);
router.post("/start", protect, start);
router.post("/manual", protect, createManual);
router.patch("/:id/pause", protect, pause);
router.patch("/:id/resume", protect, resume);
router.patch("/:id/stop", protect, stop);
router.delete("/entries/:id", protect, deleteEntry);

module.exports = router;

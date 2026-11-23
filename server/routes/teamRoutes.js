const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getTeams,
  createTeam,
  getTeamById,
  joinTeam,
  updateTeam,
  deleteTeam,
} = require("../controllers/teamController");

const router = express.Router();

router.route("/").get(protect, getTeams).post(protect, createTeam);
router.route("/join").post(protect, joinTeam);
router
  .route("/:id")
  .get(protect, getTeamById)
  .put(protect, updateTeam)
  .delete(protect, deleteTeam);

module.exports = router;

const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  unassignTask,
  getAssignmentHistory,
  getMyTasks,
  getTaskStats,
} = require("../controllers/taskController");

const router = express.Router();

router.route("/").get(protect, getTasks).post(protect, createTask);
router.route("/my-tasks").get(protect, getMyTasks);
router.route("/stats").get(protect, getTaskStats);
router.route("/:id/assign").patch(protect, assignTask);
router.route("/:id/unassign").patch(protect, unassignTask);
router
  .route("/:id/assignment-history")
  .get(protect, getAssignmentHistory);
router.route("/:id").put(protect, updateTask).delete(protect, deleteTask);

module.exports = router;

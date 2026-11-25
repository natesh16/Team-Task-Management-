const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleArchiveTask,
  bulkUpdateTasks,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  addDependency,
  removeDependency,
  addComment,
  deleteComment,
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
router.route("/bulk").post(protect, bulkUpdateTasks);

router.route("/:id/assign").patch(protect, assignTask);
router.route("/:id/unassign").patch(protect, unassignTask);
router.route("/:id/archive").patch(protect, toggleArchiveTask);
router.route("/:id/assignment-history").get(protect, getAssignmentHistory);

router.route("/:id/subtasks").post(protect, addSubtask);
router
  .route("/:id/subtasks/:subtaskId")
  .patch(protect, updateSubtask)
  .delete(protect, deleteSubtask);

router.route("/:id/dependencies").post(protect, addDependency);
router.route("/:id/dependencies/:depTaskId").delete(protect, removeDependency);

router.route("/:id/comments").post(protect, addComment);
router.route("/:id/comments/:commentId").delete(protect, deleteComment);

router
  .route("/:id")
  .get(protect, getTaskById)
  .put(protect, updateTask)
  .delete(protect, deleteTask);

module.exports = router;

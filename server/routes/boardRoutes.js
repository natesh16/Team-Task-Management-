const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getBoards,
  createBoard,
  updateBoard,
  deleteBoard,
} = require("../controllers/boardController");

const router = express.Router();

router.route("/").get(protect, getBoards).post(protect, createBoard);
router.route("/:id").put(protect, updateBoard).delete(protect, deleteBoard);

module.exports = router;

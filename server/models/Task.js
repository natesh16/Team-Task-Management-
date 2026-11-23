const mongoose = require("mongoose");

const assignmentHistorySchema = new mongoose.Schema(
  {
    assignedTo: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a task title"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    team: {
      type: mongoose.Schema.ObjectId,
      ref: "Team",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: {
      type: Date,
    },
    assignmentHistory: [assignmentHistorySchema],
  },
  { timestamps: true }
);

// Index for faster queries
taskSchema.index({ team: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Task", taskSchema);

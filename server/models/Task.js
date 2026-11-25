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

const subtaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Subtask title is required"],
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const dependencySchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.ObjectId,
      ref: "Task",
      required: true,
    },
    type: {
      type: String,
      enum: ["blocks", "blocked_by", "relates_to"],
      required: true,
    },
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: [true, "Comment body is required"],
      trim: true,
    },
    mentions: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const activitySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
    },
    fromValue: {
      type: String,
      trim: true,
    },
    toValue: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const recurrenceSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "weekly",
    },
    interval: { type: Number, default: 1, min: 1 },
    nextRunAt: { type: Date, default: null },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    taskKey: {
      type: String,
      trim: true,
      index: true,
    },
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
      enum: ["backlog", "todo", "in-progress", "review", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    team: {
      type: mongoose.Schema.ObjectId,
      ref: "Team",
      required: true,
    },
    board: {
      type: mongoose.Schema.ObjectId,
      ref: "Board",
      default: null,
      index: true,
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
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    estimatedMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    position: {
      type: Number,
      default: 0,
    },
    subtasks: [subtaskSchema],
    dependencies: [dependencySchema],
    comments: [commentSchema],
    assignmentHistory: [assignmentHistorySchema],
    activityHistory: [activitySchema],
    recurrence: {
      type: recurrenceSchema,
      default: () => ({ enabled: false, frequency: "weekly", interval: 1 }),
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for fast filtering, analytics, and team queries
taskSchema.index({ team: 1, archivedAt: 1, status: 1 });
taskSchema.index({ team: 1, board: 1, archivedAt: 1, status: 1 });
taskSchema.index({ team: 1, dueDate: 1 });
taskSchema.index({ assignedTo: 1, archivedAt: 1 });
taskSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Task", taskSchema);

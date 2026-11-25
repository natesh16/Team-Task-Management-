const mongoose = require("mongoose");

const timeEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },
    team: {
      type: mongoose.Schema.ObjectId,
      ref: "Team",
      default: null,
      index: true,
    },
    mode: {
      type: String,
      enum: ["pomodoro", "stopwatch", "manual"],
      required: true,
    },
    phase: {
      type: String,
      enum: ["focus", "short-break", "long-break"],
      default: "focus",
    },
    plannedMinutes: {
      type: Number,
      default: 25,
      min: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    accumulatedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    isRunning: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    completedPomodoro: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

timeEntrySchema.index({ user: 1, isRunning: 1 });
timeEntrySchema.index({ user: 1, startedAt: -1 });

module.exports = mongoose.model("TimeEntry", timeEntrySchema);

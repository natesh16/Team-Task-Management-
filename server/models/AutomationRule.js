const mongoose = require("mongoose");

const automationRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Rule name is required"],
      trim: true,
    },
    team: {
      type: mongoose.Schema.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    trigger: {
      type: String,
      enum: [
        "task_status_changed",
        "subtasks_all_completed",
        "task_completed",
        "dependency_completed",
      ],
      required: true,
    },
    condition: {
      status: { type: String, default: "" },
      priority: { type: String, default: "" },
    },
    action: {
      type: {
        type: String,
        enum: [
          "notify_assignee",
          "notify_team_owner",
          "notify_blocked_owners",
          "suggest_complete",
          "create_recurring",
        ],
        required: true,
      },
      message: { type: String, trim: true, default: "" },
    },
    executionCount: {
      type: Number,
      default: 0,
    },
    lastExecutedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AutomationRule", automationRuleSchema);

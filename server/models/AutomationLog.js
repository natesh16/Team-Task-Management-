const mongoose = require("mongoose");

const automationLogSchema = new mongoose.Schema(
  {
    rule: {
      type: mongoose.Schema.ObjectId,
      ref: "AutomationRule",
      required: true,
      index: true,
    },
    team: {
      type: mongoose.Schema.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.ObjectId,
      ref: "Task",
      default: null,
    },
    trigger: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "skipped", "failed"],
      required: true,
    },
    message: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

automationLogSchema.index({ team: 1, createdAt: -1 });

module.exports = mongoose.model("AutomationLog", automationLogSchema);

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      default: null,
    },
    team: {
      type: mongoose.Schema.ObjectId,
      ref: "Team",
      default: null,
    },
    task: {
      type: mongoose.Schema.ObjectId,
      ref: "Task",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "assignment",
        "comment",
        "mention",
        "status_change",
        "dependency_unblocked",
        "automation",
        "overdue",
      ],
      default: "automation",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);

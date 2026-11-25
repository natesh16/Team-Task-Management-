const mongoose = require("mongoose");

const DEFAULT_COLUMNS = [
  { key: "backlog", label: "Backlog", order: 0, wipLimit: 0, color: "#6b7191" },
  { key: "todo", label: "To do", order: 1, wipLimit: 0, color: "#3978f6" },
  { key: "in-progress", label: "In progress", order: 2, wipLimit: 0, color: "#d9820a" },
  { key: "review", label: "In review", order: 3, wipLimit: 0, color: "#8b5cf6" },
  { key: "done", label: "Done", order: 4, wipLimit: 0, color: "#0e9f78" },
];

const columnSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    wipLimit: { type: Number, default: 0, min: 0 },
    color: { type: String, default: "#5b4bf5" },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a team name"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    keyPrefix: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 6,
      default: "TM",
    },
    taskCounter: {
      type: Number,
      default: 0,
    },
    columns: {
      type: [columnSchema],
      default: () => DEFAULT_COLUMNS.map((c) => ({ ...c })),
    },
    owner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

// Generate invite code and keyPrefix before saving
teamSchema.pre("save", async function (next) {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  if (!this.keyPrefix || this.keyPrefix === "TM") {
    const letters = (this.name || "TM")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 3);
    if (letters.length >= 2) {
      this.keyPrefix = letters;
    }
  }
  if (!this.columns || this.columns.length === 0) {
    this.columns = DEFAULT_COLUMNS.map((c) => ({ ...c }));
  }
  next();
});

teamSchema.statics.DEFAULT_COLUMNS = DEFAULT_COLUMNS;

module.exports = mongoose.model("Team", teamSchema);

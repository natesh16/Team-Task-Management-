const mongoose = require("mongoose");
const Team = require("./Team");

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

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a board name"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
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
    isDefault: {
      type: Boolean,
      default: false,
    },
    columns: {
      type: [columnSchema],
      default: () => Team.DEFAULT_COLUMNS.map((c) => ({ ...c })),
    },
  },
  { timestamps: true }
);

boardSchema.index({ team: 1, createdAt: 1 });

module.exports = mongoose.model("Board", boardSchema);

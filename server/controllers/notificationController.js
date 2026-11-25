const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification");

const getNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly, limit = 40 } = req.query;
  const filter = { recipient: req.user.id };
  if (unreadOnly === "true") filter.readAt = null;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate("actor", "name email")
      .populate("task", "title taskKey status")
      .populate("team", "name")
      .sort({ createdAt: -1 })
      .limit(Math.min(100, parseInt(limit, 10) || 40)),
    Notification.countDocuments({ recipient: req.user.id, readAt: null }),
  ]);

  res.json({ notifications, unreadCount });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { readAt: new Date() },
    { new: true }
  );
  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }
  res.json(notification);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id, readAt: null },
    { readAt: new Date() }
  );
  res.json({ message: "All notifications marked as read" });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};

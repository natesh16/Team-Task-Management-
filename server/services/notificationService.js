const Notification = require("../models/Notification");

/**
 * Create an in-app notification for a recipient.
 */
async function createNotification({
  recipient,
  actor = null,
  team = null,
  task = null,
  type = "automation",
  title,
  message,
  allowSelf = false,
}) {
  if (!recipient) return null;
  if (!allowSelf && actor && recipient.toString() === actor.toString()) {
    return null;
  }

  return Notification.create({
    recipient,
    actor,
    team,
    task,
    type,
    title,
    message,
  });
}

module.exports = {
  createNotification,
};

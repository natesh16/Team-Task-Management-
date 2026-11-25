const AutomationRule = require("../models/AutomationRule");
const AutomationLog = require("../models/AutomationLog");
const Team = require("../models/Team");
const Task = require("../models/Task");
const { createNotification } = require("./notificationService");

/**
 * Compute the next due date for a recurring task.
 */
function computeNextDueDate(baseDate, recurrence = {}) {
  const date = baseDate ? new Date(baseDate) : new Date();
  const interval = Math.max(1, Number(recurrence.interval) || 1);
  if (recurrence.frequency === "daily") {
    date.setDate(date.getDate() + interval);
  } else if (recurrence.frequency === "monthly") {
    date.setMonth(date.getMonth() + interval);
  } else {
    date.setDate(date.getDate() + interval * 7);
  }
  return date;
}

/**
 * Evaluate and execute matching automation rules for a task event.
 * Includes depth guard to prevent infinite automation loops.
 */
async function evaluateRules({ trigger, task, actorId, depth = 0 }) {
  if (!task || !task.team || depth > 2) return [];

  const rules = await AutomationRule.find({
    team: task.team,
    trigger,
    enabled: true,
  });

  if (!rules.length) return [];

  const results = [];

  for (const rule of rules) {
    try {
      // Condition matching
      if (
        rule.condition?.status &&
        rule.condition.status !== task.status
      ) {
        continue;
      }
      if (
        rule.condition?.priority &&
        rule.condition.priority !== task.priority
      ) {
        continue;
      }

      const label = task.taskKey ? `[${task.taskKey}] ${task.title}` : task.title;
      let executedMessage = "";

      switch (rule.action?.type) {
        case "notify_assignee": {
          if (task.assignedTo) {
            await createNotification({
              recipient: task.assignedTo,
              actor: actorId,
              team: task.team,
              task: task._id,
              type: "automation",
              title: rule.name,
              message:
                rule.action.message ||
                `Automation "${rule.name}" triggered on ${label}`,
              allowSelf: true,
            });
            executedMessage = "Notified task assignee";
          } else {
            executedMessage = "Skipped: task has no assignee";
          }
          break;
        }
        case "notify_team_owner": {
          const team = await Team.findById(task.team).select("owner name");
          if (team?.owner) {
            await createNotification({
              recipient: team.owner,
              actor: actorId,
              team: task.team,
              task: task._id,
              type: "automation",
              title: rule.name,
              message:
                rule.action.message ||
                `${label} triggered "${rule.name}" in ${team.name}`,
              allowSelf: true,
            });
            executedMessage = "Notified team owner";
          }
          break;
        }
        case "notify_blocked_owners": {
          const blockedTasks = await Task.find({
            "dependencies.task": task._id,
            "dependencies.type": "blocked_by",
            archivedAt: null,
          }).select("assignedTo title taskKey team");

          let count = 0;
          for (const bt of blockedTasks) {
            if (bt.assignedTo) {
              await createNotification({
                recipient: bt.assignedTo,
                actor: actorId,
                team: bt.team,
                task: bt._id,
                type: "dependency_unblocked",
                title: "Blocker completed",
                message: `${label} is done — your task "${bt.title}" may now be unblocked.`,
                allowSelf: true,
              });
              count += 1;
            }
          }
          executedMessage = `Notified ${count} blocked task owner(s)`;
          break;
        }
        case "suggest_complete": {
          const targetUser = task.assignedTo || task.createdBy;
          if (targetUser) {
            await createNotification({
              recipient: targetUser,
              actor: actorId,
              team: task.team,
              task: task._id,
              type: "automation",
              title: "All subtasks completed",
              message: `All subtasks on ${label} are complete. Consider moving it to Done.`,
              allowSelf: true,
            });
          }
          executedMessage = "Suggested parent task completion";
          break;
        }
        case "create_recurring": {
          if (task.recurrence?.enabled) {
            const nextDue = computeNextDueDate(task.dueDate, task.recurrence);
            // Idempotency guard: avoid creating duplicate next occurrence
            const existing = await Task.findOne({
              team: task.team,
              title: task.title,
              status: "todo",
              dueDate: nextDue,
              archivedAt: null,
            });
            if (!existing) {
              const team = await Team.findByIdAndUpdate(
                task.team,
                { $inc: { taskCounter: 1 } },
                { new: true }
              );
              const nextKey = team
                ? `${team.keyPrefix || "TM"}-${team.taskCounter}`
                : undefined;
              await Task.create({
                taskKey: nextKey,
                title: task.title,
                description: task.description,
                status: "todo",
                priority: task.priority,
                labels: task.labels || [],
                team: task.team,
                assignedTo: task.assignedTo || null,
                createdBy: task.createdBy,
                dueDate: nextDue,
                estimatedMinutes: task.estimatedMinutes || 0,
                recurrence: task.recurrence,
                activityHistory: [
                  {
                    actor: actorId || task.createdBy,
                    action: "created_recurring",
                    details: `Generated automatically from ${label}`,
                  },
                ],
              });
              executedMessage = `Created next recurring task for ${nextDue.toISOString().slice(0, 10)}`;
            } else {
              executedMessage = "Skipped: recurring occurrence already exists";
            }
          } else {
            executedMessage = "Skipped: recurrence not enabled on task";
          }
          break;
        }
        default:
          executedMessage = "No action handler matched";
      }

      rule.executionCount += 1;
      rule.lastExecutedAt = new Date();
      await rule.save();

      const log = await AutomationLog.create({
        rule: rule._id,
        team: task.team,
        task: task._id,
        trigger,
        status: executedMessage.startsWith("Skipped") ? "skipped" : "success",
        message: executedMessage,
      });
      results.push(log);
    } catch (err) {
      const log = await AutomationLog.create({
        rule: rule._id,
        team: task.team,
        task: task._id,
        trigger,
        status: "failed",
        message: err.message,
      });
      results.push(log);
    }
  }

  return results;
}

module.exports = {
  evaluateRules,
  computeNextDueDate,
};

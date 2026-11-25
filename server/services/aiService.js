const Task = require("../models/Task");
const Team = require("../models/Team");

/**
 * Parse a target date hint from natural language (e.g. "Friday", "tomorrow", "next week").
 */
function inferDueDate(prompt) {
  const lower = prompt.toLowerCase();
  const now = new Date();

  if (lower.includes("today")) {
    return now.toISOString().slice(0, 10);
  }
  if (lower.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (lower.includes("next week")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }

  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  for (let i = 0; i < weekdays.length; i += 1) {
    if (lower.includes(weekdays[i])) {
      const d = new Date(now);
      const diff = (i + 7 - d.getDay()) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    }
  }

  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 5);
  return fallback.toISOString().slice(0, 10);
}

/**
 * Build a structured task plan from a natural-language objective.
 * Does NOT mutate the database; returns a proposal requiring explicit user confirmation.
 */
async function planObjective({ userId, prompt, teamId = null }) {
  const text = (prompt || "").trim();
  if (!text) {
    const err = new Error("Please describe your objective or goal");
    err.statusCode = 400;
    throw err;
  }

  const lower = text.toLowerCase();
  const priority =
    lower.includes("urgent") ||
    lower.includes("asap") ||
    lower.includes("critical") ||
    lower.includes("blocker") ||
    lower.includes("friday")
      ? "high"
      : lower.includes("low") || lower.includes("later") || lower.includes("backlog")
      ? "low"
      : "medium";

  const dueDate = inferDueDate(text);

  // Domain-aware subtask generation
  let subtasks = [];
  let labels = [];
  let estimatedMinutes = 120;

  if (lower.includes("auth") || lower.includes("login") || lower.includes("backend")) {
    labels = ["backend", "security"];
    estimatedMinutes = 240;
    subtasks = [
      "Define data schema, validation rules, and API contract",
      "Implement core service and route handlers with error handling",
      "Add authentication/permission checks and edge-case guards",
      "Write automated integration tests and verify responses",
    ];
  } else if (lower.includes("ui") || lower.includes("design") || lower.includes("page") || lower.includes("frontend")) {
    labels = ["frontend", "ux"];
    estimatedMinutes = 180;
    subtasks = [
      "Review layout hierarchy, states (loading/empty/error), and responsiveness",
      "Build reusable UI components and wire API state",
      "Verify keyboard navigation, accessibility, and mobile breakpoints",
    ];
  } else if (lower.includes("launch") || lower.includes("release") || lower.includes("deploy")) {
    labels = ["release", "ops"];
    estimatedMinutes = 150;
    subtasks = [
      "Verify environment variables and database migrations",
      "Run full regression test suite and production build",
      "Prepare release notes and stakeholder checklist",
    ];
  } else {
    labels = ["planning"];
    estimatedMinutes = 90;
    subtasks = [
      "Clarify scope, acceptance criteria, and dependencies",
      "Execute primary implementation deliverable",
      "Review, test, and mark complete",
    ];
  }

  // Clean up title from prompt
  const cleanedTitle = text
    .replace(/^(i need to|we need to|please|create a task to|help me)\s+/i, "")
    .replace(/\s+by\s+(today|tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\.?$/i, "")
    .trim();
  const title =
    cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1, 110);

  // Deadline risk & workload insight if teamId provided
  let insights = [];
  if (teamId) {
    const team = await Team.findById(teamId).select("name members");
    if (team) {
      const openTasks = await Task.countDocuments({
        team: teamId,
        status: { $ne: "done" },
        archivedAt: null,
      });
      const overdueTasks = await Task.countDocuments({
        team: teamId,
        status: { $ne: "done" },
        dueDate: { $lt: new Date() },
        archivedAt: null,
      });
      insights.push(
        `Team "${team.name}" currently has ${openTasks} open task(s) and ${overdueTasks} overdue item(s).`
      );
      if (overdueTasks > 0) {
        insights.push(
          "Deadline risk detected: resolve existing overdue tasks or assign clear ownership early."
        );
      }
    }
  }

  return {
    provider: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY ? "configured" : "smart-heuristic",
    requiresConfirmation: true,
    proposal: {
      title,
      description: `Objective: ${text}`,
      priority,
      dueDate,
      estimatedMinutes,
      labels,
      subtasks: subtasks.map((s) => ({ title: s, completed: false })),
    },
    insights,
  };
}

/**
 * Summarize workspace/user productivity & deadline risks.
 */
async function getProductivityInsights(userId) {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const myOpen = await Task.find({
    assignedTo: userId,
    status: { $ne: "done" },
    archivedAt: null,
  })
    .select("title taskKey priority dueDate status subtasks")
    .sort({ dueDate: 1 })
    .lean();

  const overdue = myOpen.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  const dueSoon = myOpen.filter(
    (t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= in48h
  );
  const highPriority = myOpen.filter((t) => t.priority === "high");

  const recommendations = [];
  if (overdue.length > 0) {
    recommendations.push(
      `You have ${overdue.length} overdue task(s). Prioritize "${overdue[0].title}" first.`
    );
  }
  if (dueSoon.length > 0) {
    recommendations.push(
      `${dueSoon.length} task(s) are due within 48 hours. Consider starting a 25-minute Pomodoro focus session.`
    );
  }
  if (highPriority.length > 0 && overdue.length === 0) {
    recommendations.push(
      `${highPriority.length} high-priority task(s) in your queue — focus on "${highPriority[0].title}".`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Your queue is healthy with no overdue items. Great time to pull a task from Backlog or To Do."
    );
  }

  return {
    openCount: myOpen.length,
    overdueCount: overdue.length,
    dueSoonCount: dueSoon.length,
    highPriorityCount: highPriority.length,
    suggestedDailyPlan: myOpen.slice(0, 5),
    recommendations,
  };
}

module.exports = {
  planObjective,
  getProductivityInsights,
};

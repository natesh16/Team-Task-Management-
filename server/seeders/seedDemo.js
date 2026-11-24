const User = require("../models/User");
const Team = require("../models/Team");
const Task = require("../models/Task");

const DEMO_USERS = [
  {
    name: "Avery Stone",
    email: "admin@taskmask.com",
    password: "TaskMaskAdmin2026!",
    role: "admin",
  },
  {
    name: "Jordan Blake",
    email: "user@taskmask.com",
    password: "TaskMaskUser2026!",
    role: "user",
  },
  {
    name: "Priya Sharma",
    email: "priya@taskmask.com",
    password: "TaskMask2026!",
    role: "user",
  },
  {
    name: "Marcus Lee",
    email: "marcus@taskmask.com",
    password: "TaskMask2026!",
    role: "user",
  },
];

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const ensureUsers = async () => {
  const usersByEmail = {};

  for (const demoUser of DEMO_USERS) {
    let user = await User.findOne({ email: demoUser.email });
    if (!user) {
      user = await User.create(demoUser);
    }
    usersByEmail[demoUser.email] = user;
  }

  return usersByEmail;
};

const ensureTeam = async (teamData) => {
  let team = await Team.findOne({ name: teamData.name });
  if (!team) {
    team = await Team.create(teamData);
  }
  return team;
};

const TASKS = (users, teams) => [
  {
    title: "Finalize the launch checklist",
    description:
      "Coordinate every workstream and confirm go/no-go criteria with each owner.",
    status: "in-progress",
    priority: "high",
    team: teams.launch._id,
    assignedTo: users["admin@taskmask.com"]._id,
    createdBy: users["admin@taskmask.com"]._id,
    dueDate: addDays(2),
    reason: "Launch owner",
  },
  {
    title: "Draft the press release",
    description:
      "Write the announcement and align messaging with the product marketing brief.",
    status: "todo",
    priority: "medium",
    team: teams.launch._id,
    assignedTo: users["priya@taskmask.com"]._id,
    createdBy: users["admin@taskmask.com"]._id,
    dueDate: addDays(5),
    reason: "Marketing copywriter",
  },
  {
    title: "Prepare the demo environment",
    description:
      "Reset seed data, verify accounts and rehearse the golden path before the demo.",
    status: "review",
    priority: "high",
    team: teams.launch._id,
    assignedTo: users["marcus@taskmask.com"]._id,
    createdBy: users["admin@taskmask.com"]._id,
    dueDate: addDays(1),
    reason: "Best available engineer for the demo",
  },
  {
    title: "Review pricing tiers",
    description:
      "Compare the three tiers against competitor pricing and confirm margins.",
    status: "done",
    priority: "medium",
    team: teams.launch._id,
    assignedTo: users["admin@taskmask.com"]._id,
    createdBy: users["admin@taskmask.com"]._id,
    dueDate: addDays(-3),
    reason: "Owned by product lead",
  },
  {
    title: "Collect beta feedback",
    description:
      "Reach out to five beta customers and summarize the top three themes.",
    status: "todo",
    priority: "low",
    team: teams.launch._id,
    assignedTo: users["user@taskmask.com"]._id,
    createdBy: users["admin@taskmask.com"]._id,
    dueDate: addDays(-2),
    reason: "Customer success rotation",
  },
  {
    title: "Ship the analytics dashboard",
    description:
      "Wire up the final charts and add empty states before the launch freeze.",
    status: "in-progress",
    priority: "high",
    team: teams.launch._id,
    assignedTo: users["marcus@taskmask.com"]._id,
    createdBy: users["admin@taskmask.com"]._id,
    dueDate: addDays(4),
    reason: "Front-end specialist",
  },
  {
    title: "Redesign the landing page hero",
    description:
      "Refresh the hero section with the new value proposition and a clearer CTA.",
    status: "done",
    priority: "high",
    team: teams.revamp._id,
    assignedTo: users["user@taskmask.com"]._id,
    createdBy: users["user@taskmask.com"]._id,
    dueDate: addDays(-6),
    reason: "Design owner",
  },
  {
    title: "Fix the mobile navigation",
    description:
      "The drawer does not close after a link is tapped on small screens.",
    status: "in-progress",
    priority: "high",
    team: teams.revamp._id,
    assignedTo: users["priya@taskmask.com"]._id,
    createdBy: users["user@taskmask.com"]._id,
    dueDate: addDays(-1),
    reason: "Front-end bug rotation",
  },
  {
    title: "Audit accessibility contrast",
    description:
      "Run a contrast audit on all primary buttons and badges, log every finding.",
    status: "review",
    priority: "medium",
    team: teams.revamp._id,
    assignedTo: users["user@taskmask.com"]._id,
    createdBy: users["user@taskmask.com"]._id,
    dueDate: addDays(3),
    reason: "Accessibility champion",
  },
  {
    title: "Migrate the blog content",
    description:
      "Move the twelve most-read posts into the new CMS and check redirects.",
    status: "todo",
    priority: "low",
    team: teams.revamp._id,
    assignedTo: users["priya@taskmask.com"]._id,
    createdBy: users["user@taskmask.com"]._id,
    dueDate: addDays(8),
    reason: "Content owner",
  },
  {
    title: "Set up Lighthouse CI",
    description:
      "Add a performance budget to CI and fail builds that regress below 90.",
    status: "done",
    priority: "medium",
    team: teams.revamp._id,
    assignedTo: users["user@taskmask.com"]._id,
    createdBy: users["user@taskmask.com"]._id,
    dueDate: addDays(-4),
    reason: "Performance track",
  },
  {
    title: "Write the release notes",
    description:
      "Summarize the redesign for customers and link to the migration guide.",
    status: "todo",
    priority: "medium",
    team: teams.revamp._id,
    assignedTo: users["user@taskmask.com"]._id,
    createdBy: users["user@taskmask.com"]._id,
    dueDate: addDays(6),
    reason: "Release comms",
  },
];

const ensureTasks = async (users, teams) => {
  const tasks = TASKS(users, teams);
  let created = 0;

  for (const taskData of tasks) {
    const exists = await Task.findOne({
      title: taskData.title,
      team: taskData.team,
    });

    if (exists) continue;

    const history = [
      {
        assignedTo: taskData.assignedTo,
        assignedBy: taskData.createdBy,
        assignedAt: addDays(-7),
        reason: taskData.reason || "Initial assignment",
      },
    ];

    // Add a reassignment trail to one task so the history view is meaningful
    if (taskData.title === "Prepare the demo environment") {
      history.unshift({
        assignedTo: users["priya@taskmask.com"]._id,
        assignedBy: users["admin@taskmask.com"]._id,
        assignedAt: addDays(-5),
        reason: "Initial assignment to marketing",
      });
      history.push({
        assignedTo: users["marcus@taskmask.com"]._id,
        assignedBy: users["admin@taskmask.com"]._id,
        assignedAt: addDays(-2),
        reason: "Reassigned to engineering for demo setup",
      });
    }

    await Task.create({
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      team: taskData.team,
      assignedTo: taskData.assignedTo,
      createdBy: taskData.createdBy,
      dueDate: taskData.dueDate,
      assignmentHistory: history,
    });

    created += 1;
  }

  return created;
};

/**
 * Seeds demo users, teams and tasks. Safe to run repeatedly.
 * Returns a summary of what was created.
 */
const seedDemo = async ({ log = () => {} } = {}) => {
  const users = await ensureUsers();
  log("Demo users ready");

  const launch = await ensureTeam({
    name: "Product Launch",
    description:
      "Cross-functional squad shipping the next major release to every customer.",
    owner: users["admin@taskmask.com"]._id,
    inviteCode: "LAUNCH26",
    members: [
      { user: users["admin@taskmask.com"]._id, role: "admin" },
      { user: users["user@taskmask.com"]._id, role: "member" },
      { user: users["priya@taskmask.com"]._id, role: "member" },
      { user: users["marcus@taskmask.com"]._id, role: "member" },
    ],
  });

  const revamp = await ensureTeam({
    name: "Website Revamp",
    description:
      "A focused redesign of the marketing site, from hero to blog migration.",
    owner: users["user@taskmask.com"]._id,
    inviteCode: "REVAMP26",
    members: [
      { user: users["user@taskmask.com"]._id, role: "admin" },
      { user: users["priya@taskmask.com"]._id, role: "member" },
      { user: users["admin@taskmask.com"]._id, role: "member" },
    ],
  });

  log("Demo teams ready");

  const createdTasks = await ensureTasks(users, {
    launch,
    revamp,
  });

  log(`Demo tasks ready (${createdTasks} created)`);

  return {
    users: DEMO_USERS.map(({ email, password }) => ({ email, password })),
    teams: [launch.name, revamp.name],
    tasksCreated: createdTasks,
  };
};

module.exports = { seedDemo, DEMO_USERS };

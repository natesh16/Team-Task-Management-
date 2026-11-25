const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
require("dotenv").config();

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_key";
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || "1d";

const { app } = require("../server");

let server;
let baseUrl;
let tokenA;
let tokenB;
let userA;
let userB;
let teamId;
let task1Id;
let task2Id;
let timerId;

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

describe("TaskMaster Upgraded API Integration Suite", () => {
  before(async () => {
    const baseUri = process.env.MONGO_URI || "mongodb://localhost:27017/taskmaskmanagement";
    const testUri = baseUri.replace(/\/([^/?]+)(\?|$)/, "/taskmaskmanagement_test$2");
    await mongoose.connect(testUri);
    await mongoose.connection.dropDatabase();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("GET /health returns 200", async () => {
    const res = await api("/health");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
  });

  it("registers two users and rejects unauthenticated requests", async () => {
    const unauth = await api("/teams");
    assert.equal(unauth.status, 401);

    const regA = await api("/auth/register", {
      method: "POST",
      body: { name: "Alice Lead", email: "alice@test.com", password: "Password123!" },
    });
    assert.equal(regA.status, 201);
    tokenA = regA.data.token;
    userA = regA.data;

    const regB = await api("/auth/register", {
      method: "POST",
      body: { name: "Bob Dev", email: "bob@test.com", password: "Password123!" },
    });
    assert.equal(regB.status, 201);
    tokenB = regB.data.token;
    userB = regB.data;
  });

  it("creates team with 5 default columns, joins by code, and updates WIP limits", async () => {
    const teamRes = await api("/teams", {
      method: "POST",
      token: tokenA,
      body: { name: "Core Platform", description: "Main product team" },
    });
    assert.equal(teamRes.status, 201);
    teamId = teamRes.data._id;
    assert.equal(teamRes.data.columns.length, 5);
    assert.equal(teamRes.data.columns[0].key, "backlog");

    const joinRes = await api("/teams/join", {
      method: "POST",
      token: tokenB,
      body: { inviteCode: teamRes.data.inviteCode },
    });
    assert.equal(joinRes.status, 200);
    assert.equal(joinRes.data.members.length, 2);

    const wfRes = await api(`/teams/${teamId}/workflow`, {
      method: "PUT",
      token: tokenA,
      body: {
        columns: [
          { key: "backlog", label: "Backlog", order: 0, wipLimit: 0 },
          { key: "todo", label: "To do", order: 1, wipLimit: 0 },
          { key: "in-progress", label: "In progress", order: 2, wipLimit: 1 },
          { key: "review", label: "In review", order: 3, wipLimit: 0 },
          { key: "done", label: "Done", order: 4, wipLimit: 0 },
        ],
      },
    });
    assert.equal(wfRes.status, 200);
    const inProg = wfRes.data.columns.find((c) => c.key === "in-progress");
    assert.equal(inProg.wipLimit, 1);
  });

  it("creates tasks with taskKey & subtasks, and enforces WIP limits server-side", async () => {
    const t1 = await api("/tasks", {
      method: "POST",
      token: tokenA,
      body: {
        title: "Build auth API",
        team: teamId,
        status: "in-progress",
        priority: "high",
        assignedTo: userB._id,
        estimatedMinutes: 120,
        labels: ["backend", "security"],
        subtasks: [{ title: "Create User model" }, { title: "Add JWT middleware" }],
      },
    });
    assert.equal(t1.status, 201);
    task1Id = t1.data._id;
    assert.ok(t1.data.taskKey.endsWith("-1"));
    assert.equal(t1.data.subtasks.length, 2);

    // Second task in "in-progress" should fail WIP limit (1/1)
    const t2Blocked = await api("/tasks", {
      method: "POST",
      token: tokenA,
      body: {
        title: "Second concurrent task",
        team: teamId,
        status: "in-progress",
      },
    });
    assert.equal(t2Blocked.status, 400);
    assert.match(t2Blocked.data.message, /WIP limit reached/i);

    // Creating in backlog succeeds
    const t2 = await api("/tasks", {
      method: "POST",
      token: tokenA,
      body: {
        title: "Write API docs",
        team: teamId,
        status: "backlog",
        priority: "medium",
        assignedTo: userB._id,
      },
    });
    assert.equal(t2.status, 201);
    task2Id = t2.data._id;
  });

  it("supports dependencies and blocks circular dependencies", async () => {
    const dep1 = await api(`/tasks/${task1Id}/dependencies`, {
      method: "POST",
      token: tokenA,
      body: { targetTaskId: task2Id, type: "blocks" },
    });
    assert.equal(dep1.status, 201);
    assert.equal(dep1.data.dependencies.length, 1);

    // Reverse blocks should be rejected as circular
    const depCircular = await api(`/tasks/${task2Id}/dependencies`, {
      method: "POST",
      token: tokenA,
      body: { targetTaskId: task1Id, type: "blocks" },
    });
    assert.equal(depCircular.status, 400);
    assert.match(depCircular.data.message, /circular dependency/i);
  });

  it("toggles subtasks and posts comments", async () => {
    const taskRes = await api(`/tasks/${task1Id}`, { token: tokenB });
    const subId = taskRes.data.subtasks[0]._id;

    const toggleRes = await api(`/tasks/${task1Id}/subtasks/${subId}`, {
      method: "PATCH",
      token: tokenB,
      body: { completed: true },
    });
    assert.equal(toggleRes.status, 200);
    assert.equal(toggleRes.data.subtasks[0].completed, true);

    const commentRes = await api(`/tasks/${task1Id}/comments`, {
      method: "POST",
      token: tokenB,
      body: { body: "Schema is ready for review!" },
    });
    assert.equal(commentRes.status, 201);
    assert.equal(commentRes.data.comments.length, 1);
  });

  it("enforces single active timer, pause/resume/stop, and manual time entry", async () => {
    const startRes = await api("/time/start", {
      method: "POST",
      token: tokenB,
      body: { taskId: task1Id, mode: "pomodoro", plannedMinutes: 25, description: "Deep work" },
    });
    assert.equal(startRes.status, 201);
    timerId = startRes.data._id;

    const dupStart = await api("/time/start", {
      method: "POST",
      token: tokenB,
      body: { taskId: task2Id, mode: "stopwatch" },
    });
    assert.equal(dupStart.status, 400);

    const pauseRes = await api(`/time/${timerId}/pause`, { method: "PATCH", token: tokenB });
    assert.equal(pauseRes.status, 200);
    assert.equal(pauseRes.data.isPaused, true);

    const resumeRes = await api(`/time/${timerId}/resume`, { method: "PATCH", token: tokenB });
    assert.equal(resumeRes.status, 200);
    assert.equal(resumeRes.data.isPaused, false);

    const stopRes = await api(`/time/${timerId}/stop`, {
      method: "PATCH",
      token: tokenB,
      body: { completedPomodoro: true },
    });
    assert.equal(stopRes.status, 200);
    assert.equal(stopRes.data.isRunning, false);

    const manualRes = await api("/time/manual", {
      method: "POST",
      token: tokenB,
      body: { taskId: task1Id, durationMinutes: 30, description: "Code review" },
    });
    assert.equal(manualRes.status, 201);

    const summaryRes = await api("/time/summary", { token: tokenB });
    assert.equal(summaryRes.status, 200);
    assert.ok(summaryRes.data.todayMinutes >= 30);
  });

  it("creates automation rule and executes on status move to review", async () => {
    const ruleRes = await api("/automations", {
      method: "POST",
      token: tokenA,
      body: {
        name: "Notify owner on review",
        team: teamId,
        trigger: "task_status_changed",
        condition: { status: "review" },
        action: { type: "notify_team_owner", message: "Task ready for review" },
      },
    });
    assert.equal(ruleRes.status, 201);

    const moveRes = await api(`/tasks/${task1Id}`, {
      method: "PUT",
      token: tokenB,
      body: { status: "review" },
    });
    assert.equal(moveRes.status, 200);

    const notifRes = await api("/notifications", { token: tokenA });
    assert.equal(notifRes.status, 200);
    assert.ok(notifRes.data.notifications.some((n) => n.title === "Notify owner on review"));
  });

  it("returns real analytics, CSV export, and AI task plan", async () => {
    const analyticsRes = await api(`/analytics/overview?team=${teamId}`, { token: tokenA });
    assert.equal(analyticsRes.status, 200);
    assert.equal(analyticsRes.data.kpis.total, 2);

    const csvRes = await api(`/analytics/export?team=${teamId}`, { token: tokenA });
    assert.equal(csvRes.status, 200);
    assert.match(csvRes.data, /Build auth API/);

    const aiRes = await api("/ai/plan", {
      method: "POST",
      token: tokenA,
      body: {
        prompt: "I need to complete my backend authentication module by Friday",
        teamId,
      },
    });
    assert.equal(aiRes.status, 200);
    assert.equal(aiRes.data.requiresConfirmation, true);
    assert.ok(aiRes.data.proposal.subtasks.length >= 3);
  });

  it("enforces admin-only task add/delete/reassign and supports creating N task boards", async () => {
    // Employee (tokenB) cannot create, delete, or reassign tasks
    const empCreate = await api("/tasks", {
      method: "POST",
      token: tokenB,
      body: { title: "Unauthorized task", team: teamId },
    });
    assert.equal(empCreate.status, 403);

    const empAssign = await api(`/tasks/${task1Id}/assign`, {
      method: "PATCH",
      token: tokenB,
      body: { assignedTo: userA._id },
    });
    assert.equal(empAssign.status, 403);

    const empReassignViaPut = await api(`/tasks/${task1Id}`, {
      method: "PUT",
      token: tokenB,
      body: { assignedTo: userA._id },
    });
    assert.equal(empReassignViaPut.status, 403);

    const empDelete = await api(`/tasks/${task1Id}`, {
      method: "DELETE",
      token: tokenB,
    });
    assert.equal(empDelete.status, 403);

    // Employee cannot create a new board
    const empBoard = await api("/boards", {
      method: "POST",
      token: tokenB,
      body: { name: "Blocked Board", team: teamId },
    });
    assert.equal(empBoard.status, 403);

    // Admin (tokenA) can create N task boards
    const listBoards1 = await api(`/boards?team=${teamId}`, { token: tokenA });
    assert.equal(listBoards1.status, 200);
    assert.equal(listBoards1.data.length, 1);

    const b2 = await api("/boards", {
      method: "POST",
      token: tokenA,
      body: { name: "Sprint 2", description: "Next sprint", team: teamId },
    });
    assert.equal(b2.status, 201);

    const b3 = await api("/boards", {
      method: "POST",
      token: tokenA,
      body: { name: "QA Board", team: teamId },
    });
    assert.equal(b3.status, 201);

    const listBoards2 = await api(`/boards?team=${teamId}`, { token: tokenA });
    assert.equal(listBoards2.data.length, 3);

    // Admin can create a task on Sprint 2 board and filter by it
    const tOnB2 = await api("/tasks", {
      method: "POST",
      token: tokenA,
      body: { title: "Sprint 2 kickoff", team: teamId, board: b2.data._id },
    });
    assert.equal(tOnB2.status, 201);
    assert.equal(tOnB2.data.board, b2.data._id);

    const b2Tasks = await api(`/tasks?team=${teamId}&board=${b2.data._id}`, {
      token: tokenB,
    });
    assert.equal(b2Tasks.status, 200);
    assert.equal(b2Tasks.data.tasks.length, 1);
  });
});

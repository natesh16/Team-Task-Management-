import React from "react";
import Icon from "./Icon";

export const STATUS_META = {
  backlog: { label: "Backlog", tone: "neutral", icon: "layers" },
  todo: { label: "To do", tone: "todo", icon: "clipboard" },
  "in-progress": { label: "In progress", tone: "progress", icon: "clock" },
  review: { label: "In review", tone: "review", icon: "eye" },
  done: { label: "Done", tone: "done", icon: "checkCircle" },
};

export const PRIORITY_META = {
  low: { label: "Low", tone: "low" },
  medium: { label: "Medium", tone: "medium" },
  high: { label: "High", tone: "high" },
};

export function StatusBadge({ status, withIcon = false }) {
  const meta = STATUS_META[status] || STATUS_META.todo;
  return (
    <span className={`badge badge--${meta.tone}`}>
      {withIcon && <Icon name={meta.icon} size={13} strokeWidth={2} />}
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  return (
    <span className={`badge badge--${meta.tone}`}>
      <span className="badge-dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return (
    <span className={`badge ${isAdmin ? "badge--owner" : "badge--neutral"}`}>
      {isAdmin ? "Admin" : "Member"}
    </span>
  );
}

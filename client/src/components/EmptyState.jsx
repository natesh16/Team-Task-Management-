import React from "react";
import Icon from "./Icon";

export default function EmptyState({
  icon = "sparkles",
  title = "Nothing here yet",
  description,
  action,
  compact = false,
}) {
  return (
    <div className={`empty-state ${compact ? "empty-state--compact" : ""}`}>
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

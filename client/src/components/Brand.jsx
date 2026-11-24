import React from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";

export default function Brand({ to = "/", compact = false, className = "" }) {
  return (
    <Link to={to} className={`brand ${className}`} aria-label="TaskMask home">
      <span className="brand-mark">
        <Icon name="board" size={19} strokeWidth={2} />
      </span>
      {!compact && (
        <span className="brand-text">
          <strong>TaskMask</strong>
          <small>Management</small>
        </span>
      )}
    </Link>
  );
}

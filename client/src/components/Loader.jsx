import React from "react";

export default function Loader({ label = "Loading", full = false }) {
  return (
    <div className={`loader ${full ? "loader--full" : ""}`} role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="loader-label">{label}</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <span className="skeleton skeleton-line skeleton-line--short" />
      <span className="skeleton skeleton-line" />
      <span className="skeleton skeleton-line skeleton-line--medium" />
    </div>
  );
}

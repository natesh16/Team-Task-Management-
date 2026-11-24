import React from "react";

const PALETTES = [
  ["#6366f1", "#8b5cf6"],
  ["#0ea5e9", "#22d3ee"],
  ["#f59e0b", "#f97316"],
  ["#10b981", "#34d399"],
  ["#ec4899", "#f472b6"],
  ["#8b5cf6", "#d946ef"],
  ["#14b8a6", "#06b6d4"],
  ["#ef4444", "#f97316"],
];

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getPalette = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
};

export default function Avatar({ name = "", size = "md", className = "" }) {
  const [from, to] = getPalette(name);
  return (
    <span
      className={`avatar avatar--${size} ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      title={name}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  );
}

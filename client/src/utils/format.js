export const getErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;

export const formatDate = (value, options = {}) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
};

export const formatDateTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const isOverdue = (task) =>
  Boolean(task?.dueDate) &&
  task?.status !== "done" &&
  new Date(task.dueDate).getTime() < Date.now();

export const dueLabel = (value) => {
  if (!value) return "";
  const due = new Date(value);
  const today = new Date();
  const startOfDay = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((startOfDay(due) - startOfDay(today)) / 86400000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < -1) return `${Math.abs(diff)} days ago`;
  if (diff > 1 && diff <= 7) return `In ${diff} days`;
  return formatDate(due, { year: undefined });
};

export const firstName = (name = "") => name.trim().split(/\s+/)[0] || "there";

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export const memberLabel = (member) =>
  `${member?.user?.name || "Unknown"} (${member?.role || "member"})`;

export const taskAssigneeId = (task) => {
  if (!task?.assignedTo) return null;
  return typeof task.assignedTo === "object"
    ? task.assignedTo._id
    : task.assignedTo;
};

export const taskAssigneeName = (task) => {
  if (!task?.assignedTo) return null;
  return typeof task.assignedTo === "object"
    ? task.assignedTo.name
    : "Assigned";
};

export const copyText = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy fallback
  }

  try {
    const input = document.createElement("textarea");
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    return true;
  } catch {
    return false;
  }
};

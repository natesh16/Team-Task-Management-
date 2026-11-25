import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import { useToast } from "../components/Toast";
import { formatDateTime, getErrorMessage } from "../utils/format";

export default function Inbox() {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load notifications"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not mark notification as read"));
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      toast.success("All notifications marked as read");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not mark all as read"));
    }
  };

  if (loading) return <Loader label="Loading inbox..." />;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Collaboration</span>
          <h1>Inbox</h1>
          <p className="page-subtitle">
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"} across
            assignments, mentions, and automations.
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="page-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={markAllRead}
            >
              <Icon name="check" size={16} /> Mark all read
            </button>
          </div>
        )}
      </header>

      <section className="panel">
        {notifications.length === 0 ? (
          <EmptyState
            icon="bell"
            title="You're all caught up"
            description="Task assignments, comments, mentions, and automation alerts will appear here."
          />
        ) : (
          <div className="check-list">
            {notifications.map((n) => (
              <div
                key={n._id}
                className="check-row"
                style={{
                  opacity: n.readAt ? 0.65 : 1,
                  borderLeft: n.readAt
                    ? undefined
                    : "3px solid var(--brand)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <strong>{n.title}</strong>
                    <span className="badge badge--neutral">{n.type}</span>
                  </div>
                  <p className="muted" style={{ fontSize: "0.84rem", marginTop: "0.2rem" }}>
                    {n.message}
                  </p>
                  <small className="muted">{formatDateTime(n.createdAt)}</small>
                </div>
                {n.team && (
                  <Link
                    to={`/tasks?team=${n.team._id || n.team}`}
                    className="btn btn-ghost btn-sm"
                  >
                    Open board
                  </Link>
                )}
                {!n.readAt && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => markRead(n._id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

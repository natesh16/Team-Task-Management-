import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import { RoleBadge } from "../components/Badge";
import { useToast } from "../components/Toast";
import { DEMO_CREDENTIALS } from "../utils/demo";
import { formatDate, getErrorMessage } from "../utils/format";

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [passwords, setPasswords] = useState({ password: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  const saveName = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const res = await api.put("/auth/me", { name: name.trim() });
      updateUser(res.data);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update your profile"));
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    if (passwords.password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (passwords.password !== passwords.confirm) {
      setPasswordError("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await api.put("/auth/me", { password: passwords.password });
      setPasswords({ password: "", confirm: "" });
      toast.success("Password changed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not change your password"));
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = (user?.name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Your profile</h1>
          <p className="page-subtitle">
            Manage your display name and password for this workspace.
          </p>
        </div>
      </header>

      <div className="profile-grid">
        <section className="profile-card profile-card--summary">
          <div className="profile-avatar-wrap">
            <Avatar name={user?.name} size="xl" />
            <span className="profile-status" />
          </div>
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
          <div className="profile-badges">
            <RoleBadge role={user?.role} />
            {user?.role === "admin" && (
              <span className="badge badge--neutral">
                <Icon name="shield" size={12} /> Workspace admin
              </span>
            )}
          </div>
          <dl className="profile-meta">
            <div>
              <dt>Initials</dt>
              <dd>{initials}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{user?.createdAt ? formatDate(user.createdAt) : "Demo account"}</dd>
            </div>
            <div>
              <dt>Session</dt>
              <dd>JWT · 7 days</dd>
            </div>
          </dl>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={logout}
          >
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </section>

        <div className="profile-main">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Profile details</h2>
                <p>This name appears on tasks, comments and team rosters.</p>
              </div>
            </div>
            <form className="form-stack" onSubmit={saveName}>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="profile-name">Display name</label>
                  <input
                    id="profile-name"
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={60}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="profile-email">Email address</label>
                  <input
                    id="profile-email"
                    className="input"
                    value={user?.email || ""}
                    disabled
                  />
                  <span className="field-hint">
                    Email changes are not enabled in the demo.
                  </span>
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingName || name.trim() === user?.name}
                >
                  {savingName ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Change password</h2>
                <p>Choose a new password of at least six characters.</p>
              </div>
              <span className="panel-icon">
                <Icon name="lock" size={18} />
              </span>
            </div>
            <form className="form-stack" onSubmit={savePassword}>
              {passwordError && (
                <div className="alert alert--error">
                  <Icon name="alert" size={16} />
                  <span>{passwordError}</span>
                </div>
              )}
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="new-password">New password</label>
                  <div className="input-wrap">
                    <Icon name="lock" size={16} />
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      className="input"
                      value={passwords.password}
                      onChange={(event) =>
                        setPasswords({ ...passwords, password: event.target.value })
                      }
                      placeholder="At least 6 characters"
                      required
                    />
                    <button
                      type="button"
                      className="input-action"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="confirm-password">Confirm new password</label>
                  <div className="input-wrap">
                    <Icon name="shield" size={16} />
                    <input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      className="input"
                      value={passwords.confirm}
                      onChange={(event) =>
                        setPasswords({ ...passwords, confirm: event.target.value })
                      }
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingPassword}
                >
                  {savingPassword ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel panel--muted">
            <div className="panel-head">
              <div>
                <h2>Demo accounts</h2>
                <p>Switch accounts to compare owner and member permissions.</p>
              </div>
              <span className="panel-icon">
                <Icon name="key" size={18} />
              </span>
            </div>
            <ul className="credential-mini-list">
              {DEMO_CREDENTIALS.map((credential) => (
                <li key={credential.key}>
                  <Avatar name={credential.name} size="sm" />
                  <div>
                    <strong>{credential.name}</strong>
                    <span>{credential.role}</span>
                  </div>
                  <code>{credential.email}</code>
                  <code className="credential-password">{credential.password}</code>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

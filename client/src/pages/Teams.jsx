import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import Modal from "../components/Modal";
import CopyButton from "../components/CopyButton";
import EmptyState from "../components/EmptyState";
import { RoleBadge } from "../components/Badge";
import { SkeletonCard } from "../components/Loader";
import { useToast } from "../components/Toast";
import { getErrorMessage } from "../utils/format";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "T";

export default function Teams() {
  const { user } = useAuth();
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [progressById, setProgressById] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [teamsRes, statsRes] = await Promise.all([
        api.get("/teams"),
        api.get("/tasks/stats").catch(() => ({ data: null })),
      ]);
      setTeams(teamsRes.data || []);
      if (statsRes.data?.perTeam) {
        const map = {};
        statsRes.data.perTeam.forEach((team) => {
          map[team._id] = team;
        });
        setProgressById(map);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load teams"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        (team.description || "").toLowerCase().includes(query) ||
        team.inviteCode.toLowerCase().includes(query)
    );
  }, [teams, search]);

  const openCreate = () => {
    setCreateForm({ name: "", description: "" });
    setFormError("");
    setModal("create");
  };

  const openJoin = () => {
    setJoinCode("");
    setFormError("");
    setModal("join");
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError("");
    setCreating(true);
    try {
      const res = await api.post("/teams", createForm);
      toast.success(`Team "${res.data.name}" created`);
      setModal(null);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not create the team"));
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    setFormError("");
    setJoining(true);
    try {
      const res = await api.post("/teams/join", {
        inviteCode: joinCode.trim().toUpperCase(),
      });
      toast.success(`Joined "${res.data.name}"`);
      setModal(null);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not join the team"));
    } finally {
      setJoining(false);
    }
  };

  const getMembership = (team) => {
    if (!team.owner) return { role: "member", isOwner: false };
    const ownerId = team.owner._id || team.owner;
    if (ownerId === user?._id) return { role: "admin", isOwner: true };
    const membership = (team.members || []).find(
      (member) => (member.user?._id || member.user) === user?._id
    );
    return { role: membership?.role || "member", isOwner: false };
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Workspaces</span>
          <h1>Teams</h1>
          <p className="page-subtitle">
            Create a team, join with an invite code and keep every project in
            one place.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-secondary" onClick={openJoin}>
            <Icon name="key" size={17} />
            Join with code
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Icon name="plus" size={17} />
            New team
          </button>
        </div>
      </header>

      <div className="toolbar toolbar--simple">
        <div className="search-box">
          <Icon name="search" size={17} />
          <input
            type="search"
            placeholder="Search teams or invite codes…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search teams"
          />
          {search && (
            <button
              type="button"
              className="input-action"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <Icon name="x" size={15} />
            </button>
          )}
        </div>
        <span className="toolbar-count">
          {teams.length} {teams.length === 1 ? "team" : "teams"}
        </span>
      </div>

      {loading ? (
        <div className="team-grid">
          {[0, 1, 2].map((index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon="users"
            title={search ? "No teams match your search" : "No teams yet"}
            description={
              search
                ? "Try a different name or invite code."
                : "Create your first workspace, or join an existing one with an invite code like LAUNCH26."
            }
            action={
              search ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </button>
              ) : (
                <div className="row-gap">
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    <Icon name="plus" size={16} /> Create team
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={openJoin}>
                    <Icon name="key" size={16} /> Join with code
                  </button>
                </div>
              )
            }
          />
        </div>
      ) : (
        <div className="team-grid">
          {filteredTeams.map((team, index) => {
            const { role, isOwner } = getMembership(team);
            const progress = progressById[team._id];
            return (
              <article className="team-card-lg" key={team._id}>
                <div className={`team-cover team-cover--${index % 4}`}>
                  <span className="team-mark">{getInitials(team.name)}</span>
                  <div className="team-cover-badges">
                    {isOwner && (
                      <span className="badge badge--glass">
                        <Icon name="shield" size={12} /> Owner
                      </span>
                    )}
                    <span className="badge badge--glass">{role}</span>
                  </div>
                  <span className="team-cover-glow" aria-hidden="true" />
                </div>

                <div className="team-card-body">
                  <div className="team-card-title">
                    <h3>{team.name}</h3>
                    <span className="team-member-count">
                      <Icon name="users" size={14} />
                      {(team.members || []).length}
                    </span>
                  </div>
                  <p className="team-desc">
                    {team.description || "No description added yet."}
                  </p>

                  <div className="member-stack">
                    {(team.members || []).slice(0, 4).map((member) => (
                      <Avatar
                        key={member.user?._id || member.user}
                        name={member.user?.name}
                        size="xs"
                      />
                    ))}
                    {(team.members || []).length > 4 && (
                      <span className="avatar avatar--xs avatar--more">
                        +{(team.members || []).length - 4}
                      </span>
                    )}
                    <span className="member-stack-label">
                      {isOwner ? "You own this team" : "You are a member"}
                    </span>
                  </div>

                  <div className="team-progress">
                    <div className="progress-head">
                      <span>Task progress</span>
                      <strong>{progress?.progress || 0}%</strong>
                    </div>
                    <div className="progress">
                      <span style={{ width: `${progress?.progress || 0}%` }} />
                    </div>
                    <div className="progress-meta">
                      <span>{progress?.open ?? 0} open</span>
                      <span>{progress?.done ?? 0} done</span>
                      <span>{progress?.total ?? 0} total</span>
                    </div>
                  </div>

                  <div className="invite-row">
                    <span className="invite-label">
                      <Icon name="link" size={14} /> Invite code
                    </span>
                    <code className="invite-code">{team.inviteCode}</code>
                    <CopyButton
                      value={team.inviteCode}
                      className="icon-btn icon-btn--sm"
                      iconOnly
                      title="Copy invite code"
                      copiedLabel="Invite code copied"
                    />
                  </div>
                </div>

                <div className="team-card-footer">
                  <Link to={`/teams/${team._id}`} className="btn btn-secondary btn-sm">
                    Open team
                  </Link>
                  <Link
                    to={`/tasks?team=${team._id}`}
                    className="btn btn-primary btn-sm"
                  >
                    Task board
                    <Icon name="arrowRight" size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Create a team"
        subtitle="Give your workspace a name and a short description."
        icon="users"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-team-form"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? (
                <>
                  <span className="spinner spinner--light" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                <>
                  <Icon name="plus" size={16} />
                  Create team
                </>
              )}
            </button>
          </>
        }
      >
        <form id="create-team-form" className="form-stack" onSubmit={handleCreate}>
          {formError && (
            <div className="alert alert--error">
              <Icon name="alert" size={16} />
              <span>{formError}</span>
            </div>
          )}
          <div className="form-field">
            <label htmlFor="team-name">Team name</label>
            <input
              id="team-name"
              className="input"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm({ ...createForm, name: event.target.value })
              }
              placeholder="e.g. Product Launch"
              maxLength={60}
              required
              autoFocus
            />
          </div>
          <div className="form-field">
            <label htmlFor="team-description">Description</label>
            <textarea
              id="team-description"
              className="input textarea"
              rows={3}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm({ ...createForm, description: event.target.value })
              }
              placeholder="What is this team working on?"
              maxLength={240}
            />
            <span className="field-hint">
              A short description helps teammates know what belongs here.
            </span>
          </div>
          <div className="info-note">
            <Icon name="sparkles" size={16} />
            <span>
              An invite code is generated automatically. Share it so teammates
              can join.
            </span>
          </div>
        </form>
      </Modal>

      <Modal
        open={modal === "join"}
        onClose={() => setModal(null)}
        title="Join a team"
        subtitle="Enter the six-character invite code shared by a team owner."
        icon="key"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="join-team-form"
              className="btn btn-primary"
              disabled={joining}
            >
              {joining ? (
                <>
                  <span className="spinner spinner--light" aria-hidden="true" />
                  Joining…
                </>
              ) : (
                <>
                  <Icon name="arrowRight" size={16} />
                  Join team
                </>
              )}
            </button>
          </>
        }
      >
        <form id="join-team-form" className="form-stack" onSubmit={handleJoin}>
          {formError && (
            <div className="alert alert--error">
              <Icon name="alert" size={16} />
              <span>{formError}</span>
            </div>
          )}
          <div className="form-field">
            <label htmlFor="invite-code">Invite code</label>
            <input
              id="invite-code"
              className="input input--code"
              value={joinCode}
              onChange={(event) =>
                setJoinCode(event.target.value.toUpperCase().slice(0, 12))
              }
              placeholder="LAUNCH26"
              autoComplete="off"
              required
              autoFocus
            />
            <span className="field-hint">
              Try the demo codes <code>LAUNCH26</code> or <code>REVAMP26</code>.
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}

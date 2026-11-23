import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await api.get("/teams");
      setTeams(res.data);
    } catch (err) {
      setError("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    // Handled via form submission below
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Teams</h1>
        <Link to="/teams/create" className="btn btn-primary">
          + Create Team
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-header">
          <h3>Join a Team</h3>
        </div>
        <div className="card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              api
                .post("/teams/join", { inviteCode })
                .then(() => fetchTeams())
                .catch((err) => {
                  setError(err.response?.data?.message || "Invalid invite code");
                });
            }}
          >
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Join Team
            </button>
          </form>
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        {loading ? (
          <p>Loading teams...</p>
        ) : teams.length === 0 ? (
          <div className="empty-state">
            <h3>No teams yet</h3>
            <p>Create a team or join one using an invite code.</p>
          </div>
        ) : (
          <div className="team-list">
            {teams.map((team) => (
              <div key={team._id} className="card team-card">
                <h3>{team.name}</h3>
                {team.description && <p>{team.description}</p>}
                <div className="team-members">
                  {team.members.map((m) => (
                    <div key={m.user._id} className="team-member">
                      {m.user.name} ({m.role})
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  Invite Code: <strong>{team.inviteCode}</strong>
                </p>
                <Link to={`/teams/${team._id}`} className="btn btn-outline btn-sm">
                  View Team
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="card">
        <div className="card-body">
          <h2>Welcome, {user?.name}! 👋</h2>
          <p>You're logged in to TaskMask Management.</p>
          <p>
            Use the navigation to manage your teams and tasks. You can create
            teams, invite members, assign tasks, and track progress.
          </p>
        </div>
      </div>
    </div>
  );
}

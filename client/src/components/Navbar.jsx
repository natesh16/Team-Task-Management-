import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        TaskMask Management
      </Link>

      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/teams">Teams</Link>
            <Link to="/tasks">Tasks</Link>
            <div className="navbar-user">
              <span>{user?.name}</span>
              <button className="btn-logout" onClick={() => { logout(); navigate("/login"); }}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Create Account</Link>
          </>
        )}
      </div>
    </nav>
  );
}

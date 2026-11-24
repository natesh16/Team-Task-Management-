import React from "react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";

export default function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="notfound">
      <Brand to="/" />
      <span className="notfound-code">404</span>
      <h1>This page took a different path</h1>
      <p>
        The page you are looking for does not exist or may have been moved. Let&apos;s
        get you back to the work.
      </p>
      <div className="notfound-actions">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="btn btn-primary">
              <Icon name="dashboard" size={16} />
              Go to dashboard
            </Link>
            <Link to="/tasks" className="btn btn-secondary">
              Open task board
            </Link>
          </>
        ) : (
          <>
            <Link to="/" className="btn btn-primary">
              Back to home
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

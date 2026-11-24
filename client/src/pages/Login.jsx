import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import Icon from "../components/Icon";
import { useToast } from "../components/Toast";
import { DEMO_CREDENTIALS } from "../utils/demo";
import { getErrorMessage } from "../utils/format";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const fillDemo = (credential) => {
    setForm({ email: credential.email, password: credential.password });
    setError("");
    toast.info(`Filled ${credential.role.toLowerCase()} credentials`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout badge="Welcome back">
      <header className="auth-header">
        <span className="eyebrow">Sign in</span>
        <h1>Welcome back</h1>
        <p>Enter your credentials, or fill a seeded demo account below.</p>
      </header>

      <div className="demo-quick">
        {DEMO_CREDENTIALS.map((credential) => (
          <button
            type="button"
            className="demo-quick-btn"
            key={credential.key}
            onClick={() => fillDemo(credential)}
          >
            <span className={`demo-quick-tone demo-quick-tone--${credential.tone}`}>
              <Icon name={credential.key === "admin" ? "shield" : "user"} size={16} />
            </span>
            <span className="demo-quick-text">
              <strong>{credential.role}</strong>
              <small>{credential.email}</small>
            </span>
            <Icon name="arrowRight" size={15} />
          </button>
        ))}
      </div>

      <div className="auth-divider">
        <span>or sign in manually</span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert--error" role="alert">
            <Icon name="alert" size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="email">Email address</label>
          <div className="input-wrap">
            <Icon name="mail" size={17} />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="input"
              value={form.email}
              onChange={handleChange}
              placeholder="name@company.com"
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <Icon name="lock" size={17} />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="input"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block btn-lg"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner spinner--light" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <Icon name="arrowRight" size={17} />
            </>
          )}
        </button>
      </form>

      <p className="auth-switch">
        Don&apos;t have an account? <Link to="/register">Create one free</Link>
      </p>

      <div className="auth-hint">
        <Icon name="key" size={16} />
        <p>
          Admin demo: <code>admin@taskmask.com</code> ·{" "}
          <code>TaskMaskAdmin2026!</code>
        </p>
      </div>
    </AuthLayout>
  );
}

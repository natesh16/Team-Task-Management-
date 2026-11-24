import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import Icon from "../components/Icon";
import { useToast } from "../components/Toast";
import { getErrorMessage } from "../utils/format";

const getStrength = (password) => {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
};

const STRENGTH_META = [
  { label: "Too short", tone: "weak" },
  { label: "Weak", tone: "weak" },
  { label: "Fair", tone: "fair" },
  { label: "Good", tone: "good" },
  { label: "Strong", tone: "strong" },
];

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const strength = useMemo(() => getStrength(form.password), [form.password]);
  const strengthMeta = STRENGTH_META[strength];

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const user = await register(form.name.trim(), form.email.trim(), form.password);
      toast.success(`Account created — welcome, ${user.name.split(" ")[0]}!`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout badge="Create your workspace">
      <header className="auth-header">
        <span className="eyebrow">Get started</span>
        <h1>Create your account</h1>
        <p>Free to try. Your first team workspace takes under a minute.</p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert--error" role="alert">
            <Icon name="alert" size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="name">Full name</label>
          <div className="input-wrap">
            <Icon name="user" size={17} />
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className="input"
              value={form.name}
              onChange={handleChange}
              placeholder="Jordan Blake"
              required
            />
          </div>
        </div>

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
              placeholder="you@company.com"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <Icon name="lock" size={17} />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="input"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                minLength={6}
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
            {form.password && (
              <div className={`strength strength--${strengthMeta.tone}`}>
                <span className="strength-bars" aria-hidden="true">
                  {[0, 1, 2, 3].map((index) => (
                    <i key={index} className={index < strength ? "on" : ""} />
                  ))}
                </span>
                <span>{strengthMeta.label}</span>
              </div>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <div className="input-wrap">
              <Icon name="shield" size={17} />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="input"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                required
              />
            </div>
            {form.confirmPassword && (
              <span
                className={`field-hint ${
                  form.password === form.confirmPassword
                    ? "field-hint--ok"
                    : "field-hint--bad"
                }`}
              >
                {form.password === form.confirmPassword
                  ? "Passwords match"
                  : "Passwords do not match yet"}
              </span>
            )}
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
              Creating account…
            </>
          ) : (
            <>
              Create account
              <Icon name="arrowRight" size={17} />
            </>
          )}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>

      <div className="auth-hint">
        <Icon name="sparkles" size={16} />
        <p>
          You can create your own teams or join the demo workspace{" "}
          <code>LAUNCH26</code> after signing up.
        </p>
      </div>
    </AuthLayout>
  );
}

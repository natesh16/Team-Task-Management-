import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = readStoredUser();

    if (token && storedUser) {
      setUser(storedUser);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else if (token || storedUser) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    setLoading(false);
  }, []);

  const setAuthData = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));
    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data);
  };

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    setAuthData(res.data);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setAuthData(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
  };

  const updateUser = (updates) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...updates };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

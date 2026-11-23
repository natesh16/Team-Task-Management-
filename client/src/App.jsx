import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";
import Tasks from "./pages/Tasks";

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {!isAuthenticated ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<NavigateToDashboard />} />
        </>
      ) : (
        <>
          <Route path="/" element={<NavigateToDashboard />} />
          <Route path="/login" element={<NavigateToDashboard />} />
          <Route path="/register" element={<NavigateToDashboard />} />
          <Route
            path="/dashboard"
            element={<PrivateRoute><Dashboard /></PrivateRoute>}
          />
          <Route
            path="/teams"
            element={<PrivateRoute><Teams /></PrivateRoute>}
          />
          <Route
            path="/tasks"
            element={<PrivateRoute><Tasks /></PrivateRoute>}
          />
        </>
      )}
    </Routes>
  );
}

function NavigateToDashboard() {
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

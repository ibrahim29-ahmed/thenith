import { createContext, useContext, useState, useCallback } from "react";
import { loginAdmin } from "../services/adminApi.js";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token") || null);
  const [adminUser, setAdminUser] = useState(() => {
    const t = localStorage.getItem("admin_token");
    if (!t) return null;
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("admin_token");
        return null;
      }
      return payload;
    } catch {
      localStorage.removeItem("admin_token");
      return null;
    }
  });

  const login = useCallback(async (username, password) => {
    const data = await loginAdmin(username, password);
    if (data?.token) {
      setToken(data.token);
      setAdminUser(data.user || { username: data.username || username, role: "superadmin" });
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("admin_token");
    setToken(null);
    setAdminUser(null);
  }, []);

  const isAuthenticated = Boolean(token);

  return (
    <AdminAuthContext.Provider
      value={{ token, adminUser, isAuthenticated, login, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

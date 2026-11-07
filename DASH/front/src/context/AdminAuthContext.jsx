import { createContext, useContext, useState, useCallback } from "react";
import { loginAdmin } from "../services/adminApi.js";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token") || null);
  const [adminUser, setAdminUser] = useState(() => {
    const savedUser = localStorage.getItem("admin_user_data");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {}
    }
    const t = localStorage.getItem("admin_token");
    if (!t) return null;
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user_data");
        return null;
      }
      return payload;
    } catch {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user_data");
      return null;
    }
  });

  const login = useCallback(async (username, password) => {
    const data = await loginAdmin(username, password);
    if (data?.token) {
      setToken(data.token);
      const userObj = data.user || {
        username: data.username || username,
        role: "superadmin",
        permissions: ["*"],
      };
      setAdminUser(userObj);
      localStorage.setItem("admin_user_data", JSON.stringify(userObj));
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user_data");
    setToken(null);
    setAdminUser(null);
  }, []);

  const isAuthenticated = Boolean(token);
  const isSuperAdmin =
    adminUser?.role === "superadmin" ||
    (Array.isArray(adminUser?.permissions) && adminUser.permissions.includes("*"));

  const hasPermission = useCallback(
    (permissionId) => {
      if (!permissionId) return true;
      if (isSuperAdmin) return true;
      if (!adminUser?.permissions || !Array.isArray(adminUser.permissions)) {
        return false;
      }
      return adminUser.permissions.includes(permissionId);
    },
    [isSuperAdmin, adminUser?.permissions]
  );

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        adminUser,
        isAuthenticated,
        isSuperAdmin,
        hasPermission,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

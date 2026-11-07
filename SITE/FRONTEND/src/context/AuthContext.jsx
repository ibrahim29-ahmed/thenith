import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  restoreSession as restoreSessionApi,
  logout as logoutApi,
  saveAccessToken,
  clearAccessToken,
} from "../panel/services/authApi.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    restoreSessionApi()
      .then((session) => {
        const authenticated = Boolean(session?.authenticated);
        setIsAuthenticated(authenticated);
        const userData = session?.user
          ? { ...session.user, subscription: session.subscription }
          : null;
        setUser(userData);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setUser(null);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  const handleLogin = (userData, token) => {
    if (token) saveAccessToken(token);
    setIsAuthenticated(true);
    setUser(userData ?? null);
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } finally {
      clearAccessToken();
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const refreshSession = async () => {
    try {
      const session = await restoreSessionApi();
      const authenticated = Boolean(session?.authenticated);
      setIsAuthenticated(authenticated);
      const userData = session?.user
        ? { ...session.user, subscription: session.subscription }
        : null;
      setUser(userData);
      return session;
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isInitializing,
        handleLogin,
        handleLogout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;

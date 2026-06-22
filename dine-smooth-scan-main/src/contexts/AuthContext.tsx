import React, { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types";
import { authApi } from "../api/authApi";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (request: any) => Promise<User>;
  register: (request: any) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("adminUser");
    const storedToken = localStorage.getItem("adminToken");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, []);

  const login = async (request: any): Promise<User> => {
    const response = await authApi.login(request);
    setUser(response.user);
    setToken(response.accessToken);
    localStorage.setItem("adminUser", JSON.stringify(response.user));
    localStorage.setItem("adminToken", response.accessToken);
    return response.user;
  };

  const register = async (request: any): Promise<User> => {
    const response = await authApi.register(request);
    setUser(response.user);
    setToken(response.accessToken);
    localStorage.setItem("adminUser", JSON.stringify(response.user));
    localStorage.setItem("adminToken", response.accessToken);
    return response.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminToken");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

"use client";

import { createContext, useContext, ReactNode } from "react";

interface AuthContextType {
  user: { firstName: string; lastName: string; role: string; email: string; orgId: string } | null;
  org: { name: string; status: string; id: string } | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, org: null });

export function AuthProvider({ children, value }: { children: ReactNode; value: AuthContextType }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
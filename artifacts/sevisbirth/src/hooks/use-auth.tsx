import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User, useLogout, Session } from "@workspace/api-client-react";
import { getAuthToken, setAuthToken, clearAuthToken } from "@/lib/auth";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithSession: (session: Session) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getAuthToken());
  const { data: user, isLoading: isUserLoading, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });
  const [, setLocation] = useLocation();

  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        clearAuthToken();
        setToken(null);
        setLocation("/");
      }
    }
  });

  const loginWithSession = (session: Session) => {
    setAuthToken(session.token);
    setToken(session.token);
    refetch();
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const isLoading = isUserLoading && !!token;

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, loginWithSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

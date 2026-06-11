"use client";

import { createContext, useContext } from "react";
import type { AuthWorker } from "@/lib/types";

export type { AuthWorker };

const AuthContext = createContext<AuthWorker | null>(null);

export function AuthProvider({
  worker,
  children,
}: {
  worker: AuthWorker | null;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={worker}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

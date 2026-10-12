import { createContext } from "react";
import type { AuthUser } from "./auth.api";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

export type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const AuthContext =
  createContext<AuthContextValue | null>(null);
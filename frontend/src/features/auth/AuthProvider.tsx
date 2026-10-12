
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "../../lib/api";
import { authApi, type AuthUser } from "./auth.api";
import {
  AuthContext,
  type AuthStatus,
} from "./AuthContext";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const requestIdRef = useRef(0);

  // Initial session check
  useEffect(() => {
    let ignore = false;
    const requestId = ++requestIdRef.current;

    authApi
      .me()
      .then((currentUser) => {
        if (ignore || requestId !== requestIdRef.current) {
          return;
        }

        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (ignore || requestId !== requestIdRef.current) {
          return;
        }

        setUser(null);

        if (error instanceof ApiError && error.status === 401) {
          setStatus("unauthenticated");
        } else {
          setStatus("error");
        }
      });

    return () => {
      ignore = true;

      if (requestIdRef.current === requestId) {
        requestIdRef.current += 1;
      }
    };
  }, []);

  // Manual session refresh
  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setStatus("loading");

    try {
      const currentUser = await authApi.me();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setUser(currentUser);
      setStatus("authenticated");
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setUser(null);

      if (error instanceof ApiError && error.status === 401) {
        setStatus("unauthenticated");
      } else {
        setStatus("error");
      }
    }
  }, []);

  // Login
  const login = useCallback(
    async (email: string, password: string) => {
      const requestId = ++requestIdRef.current;

      const authenticatedUser = await authApi.login(
        email,
        password
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      setUser(authenticatedUser);
      setStatus("authenticated");
    },
    []
  );

  // Logout
  const logout = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    await authApi.logout();

    if (requestId !== requestIdRef.current) {
      return;
    }

    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

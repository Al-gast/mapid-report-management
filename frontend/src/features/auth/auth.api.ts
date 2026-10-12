import { apiRequest } from "../../lib/api";

export type UserRole =
  | "admin"
  | "pelapor"
  | "approver";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type AuthResponse = {
  success: boolean;
  data: {
    user: AuthUser;
  };
};

export const authApi = {
  async login(email: string, password: string) {
    const response = await apiRequest<AuthResponse>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );

    return response.data.user;
  },

  async me() {
    const response = await apiRequest<AuthResponse>(
      "/api/auth/me"
    );

    return response.data.user;
  },

  async logout() {
    await apiRequest<{ success: boolean }>(
      "/api/auth/logout",
      {
        method: "POST",
      }
    );
  },
};
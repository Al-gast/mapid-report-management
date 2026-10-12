
import { apiRequest } from "../../lib/api";

import type { UserRole } from "../auth/auth.api";

export type CreatableRole = Exclude<UserRole, "admin">;

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: CreatableRole;
};

type UsersResponse = {
  success: boolean;
  data: {
    users: ManagedUser[];
  };
};

export const usersApi = {
  async list(): Promise<ManagedUser[]> {
    const response = await apiRequest<UsersResponse>(
      "/api/users"
    );

    if (!Array.isArray(response.data?.users)) {
      throw new Error("Unexpected /api/users response");
    }

    return response.data.users;
  },

  async create(input: CreateUserInput): Promise<void> {
    await apiRequest<unknown>("/api/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

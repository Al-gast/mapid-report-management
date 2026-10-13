
export {};

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        name: string;
        email: string;
        role: "admin" | "pelapor" | "approver";
      };
    }
  }
}
